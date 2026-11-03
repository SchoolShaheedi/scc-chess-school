-- SCC Chess School: the teacher-run class simul (class features 2026-11-03, not yet in DECISIONS.md). NOT APPLIED: written in the repo only, for review.
-- Builds on classes.sql (teachers, classes, memberships) and online.sql / online_adults.sql (players, games).
-- No server-function change: a simul board is an ordinary row in public.games, so every move still goes through
-- play-move exactly as in a friend game (it checks the caller owns the player and that it is their turn).
--
-- THIS EXTENDS A SAFEGUARDING RULE and needs the charity's yes before it is applied: so far a child's online games are
-- with other children only (#86, #87, #102: "children and adults still never meet"). A simul is a teacher, whom a parent
-- already trusts with a class (#82), playing the class. So it is held to a stricter gate than friend games:
--   * only an approved teacher (is_teacher()), and only for THEIR OWN class (classes.teacher = the caller);
--   * only pupils whose PARENT has switched "play my class's simul" on for that class (memberships.simul_ok, off by
--     default, changed only through set_simul_ok(), and the app asks the grown-up question first) AND has online play on;
--   * the teacher plays as ONE fixed animal and colour (a "teacher" player row, kept PAUSED so it can never be found by a
--     friend code, never appears in anyone's opponent list, never joins the rated pool, and can never be challenged);
--   * leaving the class, or the parent switching the simul off, ends that pupil's board at once (a draw, nobody loses);
--   * still NO chat of any kind: the four fixed reactions only.

alter table public.memberships add column if not exists simul_ok boolean not null default false;

create table if not exists public.simuls (
  id             uuid primary key default gen_random_uuid(),
  class_id       uuid not null references public.classes (id) on delete cascade,
  teacher        uuid not null default auth.uid() references auth.users (id) on delete cascade,
  teacher_player uuid references public.online_players (id) on delete set null,
  status         text not null default 'active' check (status in ('active', 'finished')),
  created_at     timestamptz not null default now(),
  ended_at       timestamptz
);
alter table public.simuls enable row level security;
create policy "teachers read own simuls" on public.simuls for select to authenticated using (teacher = (select auth.uid()));
-- no insert/update/delete policies: simul_start(), simul_seat() and simul_end() do it
create unique index if not exists one_active_simul_per_class on public.simuls (class_id) where status = 'active';

-- a simul board is a normal game that remembers which simul it belongs to
alter table public.games add column if not exists simul_id uuid references public.simuls (id) on delete set null;
create index if not exists games_simul on public.games (simul_id) where simul_id is not null;

/** The parent switches the class simul on (or off) for one child in one class. Switching off ends that child's board. */
create or replace function public.set_simul_ok(p_class uuid, p_profile text, p_on boolean) returns void
  language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'sign in first'; end if;
  update public.memberships set simul_ok = p_on where class_id = p_class and parent = auth.uid() and profile_id = p_profile;
  if not found then raise exception 'not your child in that class'; end if;
  if not p_on then
    update public.games g set status = 'finished', result = '1/2-1/2', reason = 'abandoned', updated_at = now()
      where g.status = 'active' and g.simul_id in (select id from public.simuls where class_id = p_class)
        and g.black in (select id from public.online_players where parent = auth.uid() and profile_id = p_profile);
  end if;
end $$;

/** Internal: give every ready pupil of the simul's class a board, if they do not have one yet. Returns how many were added.
 *  Ready = their parent turned the simul on for this class, online play is on for the child, a child's (not grown-up's)
 *  player that is not paused. The teacher is White on every board and the games are untimed. */
create or replace function public.simul_seat(p_simul uuid) returns int
  language plpgsql security definer set search_path = public as $$
declare s public.simuls; n int := 0; r record;
begin
  select * into s from public.simuls where id = p_simul and teacher = auth.uid() and status = 'active';
  if s.id is null then raise exception 'not your simul'; end if;
  for r in
    select o.id as pid from public.memberships m
      join public.online_players o on o.parent = m.parent and o.profile_id = m.profile_id
      where m.class_id = s.class_id and m.simul_ok and not o.adult and not o.paused
        and not exists (select 1 from public.games g where g.simul_id = s.id and g.black = o.id)
      limit 40
  loop
    if (select count(*) from public.games where simul_id = s.id) >= 40 then exit; end if;
    insert into public.games (white, black, tc_min, tc_inc, white_ms, black_ms, simul_id) values (s.teacher_player, r.pid, 0, 0, 0, 0, s.id);
    n := n + 1;
  end loop;
  return n;
end $$;

/** Start a simul for one of the teacher's own classes. Returns the simul's id; the boards are made by simul_seat(). */
create or replace function public.simul_start(p_class uuid) returns uuid
  language plpgsql security definer set search_path = public as $$
declare tp uuid; c text; v uuid;
begin
  if auth.uid() is null or not public.is_teacher() then raise exception 'only an approved teacher can run a simul'; end if;
  if not exists (select 1 from public.classes where id = p_class and teacher = auth.uid()) then raise exception 'not your class'; end if;
  if exists (select 1 from public.simuls where class_id = p_class and status = 'active') then raise exception 'a simul is already running for this class'; end if;
  -- the teacher's player for this class: paused for good, so it can't be found, befriended, challenged or rated
  select id into tp from public.online_players where parent = auth.uid() and profile_id = 'simul:' || left(p_class::text, 8);
  if tp is null then
    loop c := public.new_code(); exit when not exists (select 1 from public.online_players where friend_code = c); end loop;
    insert into public.online_players (parent, profile_id, avatar, colour, friend_code, paused)
      values (auth.uid(), 'simul:' || left(p_class::text, 8), 'turtle', '#C99A2E', c, true) returning id into tp;
  end if;
  insert into public.simuls (class_id, teacher_player) values (p_class, tp) returning id into v;
  perform public.simul_seat(v);
  return v;
end $$;

/** The teacher's boards: which game is which pupil (animal + colour, and the ids the teacher's own device labels use). */
create or replace function public.simul_boards(p_simul uuid)
  returns table (game uuid, parent uuid, profile_id text, avatar text, colour text)
  language plpgsql stable security definer set search_path = public as $$
begin
  if not exists (select 1 from public.simuls where id = p_simul and teacher = auth.uid()) then raise exception 'not your simul'; end if;
  return query select g.id, o.parent, o.profile_id, o.avatar, o.colour
    from public.games g join public.online_players o on o.id = g.black where g.simul_id = p_simul order by g.created_at, g.id;
end $$;

/** End the simul: every unfinished board is drawn (nobody loses because the lesson ended), and the simul closes. */
create or replace function public.simul_end(p_simul uuid) returns void
  language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.simuls where id = p_simul and teacher = auth.uid() and status = 'active') then raise exception 'not your simul'; end if;
  update public.games set status = 'finished', result = '1/2-1/2', reason = 'abandoned', updated_at = now() where simul_id = p_simul and status = 'active';
  update public.simuls set status = 'finished', ended_at = now() where id = p_simul;
end $$;

/** A child who leaves the class has their simul board drawn at once (and the teacher's view of them goes, as in classes.sql). */
create or replace function public.simul_on_leave() returns trigger
  language plpgsql security definer set search_path = public as $$
begin
  update public.games g set status = 'finished', result = '1/2-1/2', reason = 'abandoned', updated_at = now()
    where g.status = 'active' and g.simul_id in (select id from public.simuls where class_id = old.class_id)
      and g.black in (select id from public.online_players where parent = old.parent and profile_id = old.profile_id);
  return old;
end $$;
drop trigger if exists simul_on_leave on public.memberships;
create trigger simul_on_leave after delete on public.memberships for each row execute function public.simul_on_leave();

revoke all on function public.set_simul_ok(uuid, text, boolean), public.simul_seat(uuid), public.simul_start(uuid), public.simul_boards(uuid),
  public.simul_end(uuid), public.simul_on_leave() from public, anon, authenticated;
grant execute on function public.set_simul_ok(uuid, text, boolean), public.simul_seat(uuid), public.simul_start(uuid),
  public.simul_boards(uuid), public.simul_end(uuid) to authenticated;
