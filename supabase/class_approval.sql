-- SCC Chess School: a class code alone no longer makes someone a classmate (the user chose "Limit + teacher approves").
-- APPLIED 2026-11-03 as migration class_code_limit_teacher_approval. Builds on classes.sql, community.sql, online.sql + online_adults.sql (can_play), battles.sql, simul.sql.
--
-- The gap: class_preview and join_class had no wrong-code limit and joining was instant, so anyone who guessed a
-- 6-character class code became a "classmate" who could challenge or battle the children. Two locks now:
--   1. A GUESS LIMIT: at most 10 wrong class codes per account per hour, counted across class_preview AND join_class
--      (the same shape as add_friend's friend_code_misses). Over the limit both refuse.
--   2. TEACHER APPROVAL: a new joiner is PENDING (memberships.approved = false) until the class's own teacher approves.
--      A pending member is NOT a classmate anywhere. The rule lives in ONE place: public.are_classmates(x, y).
-- Every membership that exists when this runs stays approved, so no current class breaks.

-- ---------- 1. the guess limit ----------
create table if not exists public.class_code_misses (parent uuid not null references auth.users (id) on delete cascade, at timestamptz not null default now());
alter table public.class_code_misses enable row level security;   -- no policies: invisible to everyone

/** Internal: look a code up for the caller, counting a wrong guess. Over 10 wrong guesses in the last hour it refuses (raises).
 *  A wrong code RETURNS null (it does not raise) so the counted miss is committed and not rolled back with the call. */
create or replace function public.class_by_code(p_code text) returns uuid
  language plpgsql security definer set search_path = public as $$
declare v uuid;
begin
  if auth.uid() is null then raise exception 'sign in first'; end if;
  delete from public.class_code_misses where at < now() - interval '1 hour';
  if (select count(*) from public.class_code_misses where parent = auth.uid()) >= 10 then
    raise exception 'too many wrong class codes: try again in an hour';
  end if;
  select id into v from public.classes where code = upper(trim(p_code));
  if v is null then insert into public.class_code_misses (parent) values (auth.uid()); end if;
  return v;
end $$;

-- ---------- 2. approval ----------
-- existing rows get true (the column is added with default true), then the default for NEW rows becomes false; safe to re-run
alter table public.memberships add column if not exists approved boolean not null default true;
alter table public.memberships alter column approved set default false;
-- a parent may still change ONLY the summary (classes.sql grant): approving oneself is impossible

/** ONE rule for "are these two players classmates": they share a class in which BOTH are approved. */
create or replace function public.are_classmates(x uuid, y uuid) returns boolean
  language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.online_players px join public.memberships mx on mx.parent = px.parent and mx.profile_id = px.profile_id and mx.approved,
                  public.online_players py join public.memberships my on my.parent = py.parent and my.profile_id = py.profile_id and my.approved
    where px.id = x and py.id = y and mx.class_id = my.class_id);
$$;

/** The teacher of the class lets a pending pupil in. Only that class's own teacher. */
create or replace function public.approve_member(p_class uuid, p_parent uuid, p_profile text) returns void
  language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'sign in first'; end if;
  if not exists (select 1 from public.classes where id = p_class and teacher = auth.uid()) then raise exception 'not your class'; end if;
  update public.memberships set approved = true where class_id = p_class and parent = p_parent and profile_id = p_profile;
  if not found then raise exception 'no such pupil'; end if;
end $$;

/** The teacher of the class turns a PENDING pupil away (the row is deleted; the family can ask again with the code). */
create or replace function public.reject_member(p_class uuid, p_parent uuid, p_profile text) returns void
  language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'sign in first'; end if;
  if not exists (select 1 from public.classes where id = p_class and teacher = auth.uid()) then raise exception 'not your class'; end if;
  delete from public.memberships where class_id = p_class and parent = p_parent and profile_id = p_profile and not approved;
  if not found then raise exception 'no such pending pupil'; end if;
end $$;

-- ---------- 3. the class functions, now limited and pending-aware ----------
/** What a parent sees before agreeing: the class title. Wrong codes count towards the hourly limit. */
create or replace function public.class_preview(p_code text) returns table (title text)
  language plpgsql security definer set search_path = public as $$
declare v uuid;
begin
  v := public.class_by_code(p_code);
  if v is null then return; end if;
  return query select c.title from public.classes c where c.id = v;
end $$;

/** Joining: the new membership is PENDING until the teacher approves. A wrong code returns null (and counts); the app shows "no class with that code".
 *  Re-joining a class one is already in changes nothing about approval. */
create or replace function public.join_class(p_code text, p_profile text, p_avatar text, p_colour text) returns uuid
  language plpgsql security definer set search_path = public as $$
declare v_class uuid;
begin
  v_class := public.class_by_code(p_code);
  if v_class is null then return null; end if;
  insert into public.memberships (class_id, parent, profile_id, avatar, colour, approved)
    values (v_class, auth.uid(), p_profile, p_avatar, p_colour, false)
    on conflict (class_id, parent, profile_id) do update set avatar = excluded.avatar, colour = excluded.colour;
  return v_class;
end $$;

/** A parent's classes, with whether the teacher has let the child in. Homework is withheld while pending. (Return type changed, so dropped first.) */
drop function if exists public.my_classes();
create function public.my_classes() returns table (class_id uuid, profile_id text, title text, homework text, approved boolean)
  language sql stable security definer set search_path = public as $$
  select m.class_id, m.profile_id, c.title, case when m.approved then c.homework end, m.approved
  from public.memberships m join public.classes c on c.id = m.class_id
  where m.parent = auth.uid();
$$;

-- ---------- 4. every place a class makes people classmates ----------
/** can_play (online_adults.sql version): the classmate branch is now are_classmates(). Everything else is unchanged. */
create or replace function public.can_play(x uuid, y uuid) returns boolean
  language sql stable security definer set search_path = public as $$
  -- an adult and a child can never play, be friends, or be classmates here, whatever else is true
  select x <> y and (public.owns_player(x) or public.owns_player(y))
    and (select adult from public.online_players where id = x) = (select adult from public.online_players where id = y)
    and not (select paused from public.online_players where id = x) and not (select paused from public.online_players where id = y)
    and not exists (select 1 from public.blocks where (blocker = x and blocked = y) or (blocker = y and blocked = x))
    and (
    exists (select 1 from public.friendships where a = least(x, y) and b = greatest(x, y) and accepted)
    or (public.are_classmates(x, y) and not (select adult from public.online_players where id = x)));
$$;
revoke execute on function public.can_play(uuid, uuid) from authenticated, anon, public;

/** battle_can_pair (battles.sql version): the classmate branch is now are_classmates(). Everything else is unchanged. */
create or replace function public.battle_can_pair(x uuid, y uuid) returns boolean
  language sql stable security definer set search_path = public as $$
  select x <> y
    and (select adult from public.online_players where id = x) = (select adult from public.online_players where id = y)
    and not (select paused from public.online_players where id = x) and not (select paused from public.online_players where id = y)
    and not exists (select 1 from public.blocks where (blocker = x and blocked = y) or (blocker = y and blocked = x))
    and (
      exists (select 1 from public.friendships where a = least(x, y) and b = greatest(x, y) and accepted)
      or (public.are_classmates(x, y) and not (select adult from public.online_players where id = x)));
$$;
revoke all on function public.battle_can_pair(uuid, uuid) from public, anon, authenticated;
grant execute on function public.battle_can_pair(uuid, uuid) to service_role;

/** my_opponents (online.sql version): only the "classmate" flag changes, to are_classmates(). */
create or replace function public.my_opponents(p_player uuid)
  returns table (player uuid, avatar text, colour text, friend boolean, classmate boolean)
  language plpgsql stable security definer set search_path = public as $$
begin
  if not public.owns_player(p_player) then raise exception 'not your player'; end if;
  return query
  select o.id, o.avatar, o.colour,
    exists (select 1 from public.friendships f where f.a = least(p_player, o.id) and f.b = greatest(p_player, o.id) and f.accepted),
    public.are_classmates(p_player, o.id)
  from public.online_players o
  where o.id <> p_player and public.can_play(p_player, o.id);
end $$;
revoke all on function public.my_opponents(uuid) from public, anon;
grant execute on function public.my_opponents(uuid) to authenticated;

/** simul_seat (simul.sql version): only APPROVED members get a board. Everything else is unchanged. */
create or replace function public.simul_seat(p_simul uuid) returns int
  language plpgsql security definer set search_path = public as $$
declare s public.simuls; n int := 0; r record;
begin
  select * into s from public.simuls where id = p_simul and teacher = auth.uid() and status = 'active';
  if s.id is null then raise exception 'not your simul'; end if;
  for r in
    select o.id as pid from public.memberships m
      join public.online_players o on o.parent = m.parent and o.profile_id = m.profile_id
      where m.class_id = s.class_id and m.approved and o.adult and not o.paused
        and not exists (select 1 from public.games g where g.simul_id = s.id and g.black = o.id)
      limit 40
  loop
    if (select count(*) from public.games where simul_id = s.id) >= 40 then exit; end if;
    insert into public.games (white, black, tc_min, tc_inc, white_ms, black_ms, simul_id) values (s.teacher_player, r.pid, 0, 0, 0, 0, s.id);
    n := n + 1;
  end loop;
  return n;
end $$;
revoke all on function public.simul_seat(uuid) from public, anon, authenticated;
grant execute on function public.simul_seat(uuid) to authenticated;   -- as in simul.sql: the teacher's device re-seats late joiners

/** class_leaderboard (community.sql version): the asking child AND every row shown must be approved. */
create or replace function public.class_leaderboard(p_class uuid, p_profile text)
  returns table (avatar text, colour text, days int, lessons int, puzzles int, points int, me boolean)
  language plpgsql stable security definer set search_path = public as $$
declare wk int := to_char(date_trunc('week', now() at time zone 'Europe/London'), 'YYYYMMDD')::int;
begin
  if not exists (select 1 from public.memberships where class_id = p_class and parent = auth.uid() and profile_id = p_profile and approved) then
    raise exception 'not your child in that class';
  end if;
  return query
  with board as (
    select m.avatar, m.colour, (m.parent = auth.uid() and m.profile_id = p_profile) as is_me,
      case when (m.summary->>'weekOf')::int = wk then least(7, coalesce((m.summary->>'wkDays')::int, 0)) else 0 end as d,
      case when (m.summary->>'weekOf')::int = wk then least(20, coalesce((m.summary->>'wkLessons')::int, 0)) else 0 end as l,
      case when (m.summary->>'weekOf')::int = wk then least(50, coalesce((m.summary->>'wkPuzzles')::int, 0)) else 0 end as p
    from public.memberships m
    where m.class_id = p_class and m.approved and (m.on_board or (m.parent = auth.uid() and m.profile_id = p_profile)))
  select r.avatar, r.colour, r.d, r.l, r.p, r.d * 10 + r.l * 5 + r.p, r.is_me from board r
  order by r.d * 10 + r.l * 5 + r.p desc, r.d desc;
end $$;
revoke all on function public.class_leaderboard(uuid, text) from public, anon, authenticated;
grant execute on function public.class_leaderboard(uuid, text) to authenticated;

-- ---------- 5. permissions ----------
-- (a "create or replace" keeps a function's grants, so my_opponents/simul_seat/class_leaderboard are re-stated above only where the
--  original file did; every grant above is the one the original file gave)
revoke all on function public.class_by_code(text), public.are_classmates(uuid, uuid) from public, anon, authenticated;
revoke all on function public.approve_member(uuid, uuid, text), public.reject_member(uuid, uuid, text),
  public.class_preview(text), public.join_class(text, text, text, text), public.my_classes() from public, anon;
grant execute on function public.approve_member(uuid, uuid, text), public.reject_member(uuid, uuid, text),
  public.class_preview(text), public.join_class(text, text, text, text), public.my_classes() to authenticated;
