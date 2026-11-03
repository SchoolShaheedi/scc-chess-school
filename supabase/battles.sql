-- SCC Chess School: Puzzle Battle with friends and classmates (class features 2026-11-03, not yet in DECISIONS.md). NOT APPLIED: written in the repo only, for
-- review. Builds on online.sql + online_adults.sql (players, friendships, can_play) and classes.sql (memberships).
-- Apply this BEFORE deploying the puzzle-battle server function (supabase/functions/puzzle-battle).
--
-- The rules that protect children are HERE, in the database, the same way as for friend games:
--   * Only a FRIEND (accepted) or a CLASSMATE (same class) can be invited: battle_invite() asks can_play(), which also
--     refuses an adult/child pair, a paused player and a blocked one. No search, no strangers, no matchmaking.
--   * Players are the same opaque ids as friend games: an animal and a colour, never a name. NO free text anywhere: a
--     battle has a level (three fixed words), a puzzle set and numbers.
--   * Nobody can write a battle directly. There are no insert/update/delete policies: it changes only through the
--     functions below (invite, decline, cancel, leave) and the puzzle-battle server function (begin, move, claim).
--   * Reading is for the two players only (select policy). The set stored on the battle holds each puzzle's start
--     position and the opponent's first move, never its solution: the solutions stay inside the server function.
--   * Starting is double-checked by battle_begin(), callable only by the server function (service role): the invite must
--     be fresh and the two must STILL be friends or classmates (a family may have unfriended since).

create table if not exists public.battles (
  id          uuid primary key default gen_random_uuid(),
  from_player uuid not null references public.online_players (id) on delete cascade,   -- side "a": whoever invited
  to_player   uuid not null references public.online_players (id) on delete cascade,   -- side "b"
  level       text not null check (level in ('easy', 'medium', 'hard')),
  status      text not null default 'invited' check (status in ('invited', 'active', 'finished', 'declined', 'cancelled')),
  target      int not null default 5 check (target between 3 and 10),                  -- first to this many wins...
  seconds     int not null default 180 check (seconds between 60 and 600),            -- ...or the most solved when this runs out
  puzzles     jsonb,                                  -- [{ id, band, fen, first, rating }] (no solutions), set when accepted
  started_at  timestamptz,                            -- the first puzzle opens here (a short countdown after accepting)
  a_idx int not null default 0, a_step int not null default 1, a_solved int not null default 0, a_missed int not null default 0,
  a_last timestamptz, a_t timestamptz,                -- when side a last solved one / last moved
  b_idx int not null default 0, b_step int not null default 1, b_solved int not null default 0, b_missed int not null default 0,
  b_last timestamptz, b_t timestamptz,
  winner      text check (winner in ('a', 'b', 'draw')),
  reason      text check (reason in ('target', 'time', 'done', 'left')),
  created_at  timestamptz not null default now(),
  finished_at timestamptz,
  check (from_player <> to_player)
);
alter table public.battles enable row level security;
create policy "players read own battles" on public.battles for select to authenticated
  using (public.owns_player(from_player) or public.owns_player(to_player));
-- no insert/update/delete policies at all

-- live updates for the two players (row-level security applies to realtime too)
do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'battles') then
    alter publication supabase_realtime add table public.battles;
  end if;
end $$;

/** The server's clock, so both phones count the same countdown whatever their own clocks say. */
create or replace function public.server_now() returns timestamptz language sql stable set search_path = public as $$ select now(); $$;

/** A player is "in a battle" while one is running (a running one that should have ended a minute ago is stale and does
 *  not block). Used inside the functions below only. */
create or replace function public.in_battle(p uuid) returns boolean
  language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.battles b where (b.from_player = p or b.to_player = p) and (
    (b.status = 'active' and b.started_at + make_interval(secs => b.seconds + 60) > now())));
$$;

/** Invite a friend or classmate to a Puzzle Battle. Same checks and flood limits as challenge(). */
create or replace function public.battle_invite(p_player uuid, p_to uuid, p_level text) returns uuid
  language plpgsql security definer set search_path = public as $$
declare v uuid;
begin
  if not public.owns_player(p_player) then raise exception 'not your player'; end if;
  if not public.can_play(p_player, p_to) then raise exception 'you can only play friends and classmates'; end if;
  if p_level not in ('easy', 'medium', 'hard') then raise exception 'unknown level'; end if;
  update public.battles set status = 'cancelled' where status = 'invited' and created_at < now() - interval '10 minutes';
  if exists (select 1 from public.battles where from_player = p_player and to_player = p_to and status = 'invited') then raise exception 'already invited'; end if;
  if (select count(*) from public.battles where from_player = p_player and status = 'invited') >= 5 then raise exception 'too many open invitations'; end if;
  if public.in_battle(p_player) or public.in_battle(p_to) then raise exception 'a battle is already running'; end if;
  insert into public.battles (from_player, to_player, level) values (p_player, p_to, p_level) returning id into v;
  return v;
end $$;

create or replace function public.battle_decline(p_player uuid, p_battle uuid) returns void
  language plpgsql security definer set search_path = public as $$
begin
  if not public.owns_player(p_player) then raise exception 'not your player'; end if;
  update public.battles set status = 'declined' where id = p_battle and to_player = p_player and status = 'invited';
end $$;

create or replace function public.battle_cancel(p_player uuid, p_battle uuid) returns void
  language plpgsql security definer set search_path = public as $$
begin
  if not public.owns_player(p_player) then raise exception 'not your player'; end if;
  update public.battles set status = 'cancelled' where id = p_battle and from_player = p_player and status = 'invited';
end $$;

/** Leave a running battle: the other player wins. */
create or replace function public.battle_leave(p_player uuid, p_battle uuid) returns void
  language plpgsql security definer set search_path = public as $$
begin
  if not public.owns_player(p_player) then raise exception 'not your player'; end if;
  update public.battles set status = 'finished', reason = 'left', finished_at = now(),
    winner = case when from_player = p_player then 'b' else 'a' end
    where id = p_battle and status = 'active' and (from_player = p_player or to_player = p_player);
end $$;

/** Internal (the server function only): are these two allowed to play? The same rule as can_play(), without the "I own
 *  one of them" test, because the server function has no signed-in user inside the database. */
create or replace function public.battle_can_pair(x uuid, y uuid) returns boolean
  language sql stable security definer set search_path = public as $$
  select x <> y
    and (select adult from public.online_players where id = x) = (select adult from public.online_players where id = y)
    and not (select paused from public.online_players where id = x) and not (select paused from public.online_players where id = y)
    and not exists (select 1 from public.blocks where (blocker = x and blocked = y) or (blocker = y and blocked = x))
    and (
      exists (select 1 from public.friendships where a = least(x, y) and b = greatest(x, y) and accepted)
      or exists (
        select 1 from public.online_players px join public.memberships mx on mx.parent = px.parent and mx.profile_id = px.profile_id,
                      public.online_players py join public.memberships my on my.parent = py.parent and my.profile_id = py.profile_id
        where px.id = x and py.id = y and mx.class_id = my.class_id and not px.adult and not py.adult));
$$;

/** Internal (the server function only): the invited player accepted. Stores the puzzle set the server picked and opens
 *  the first puzzle after a short countdown. Returns when it opens. */
create or replace function public.battle_begin(p_battle uuid, p_player uuid, p_puzzles jsonb) returns timestamptz
  language plpgsql security definer set search_path = public as $$
declare b public.battles; t timestamptz;
begin
  select * into b from public.battles where id = p_battle and to_player = p_player and status = 'invited' for update;
  if b.id is null or b.created_at < now() - interval '10 minutes' then raise exception 'that invitation has gone'; end if;
  if not public.battle_can_pair(b.from_player, b.to_player) then
    update public.battles set status = 'cancelled' where id = b.id; raise exception 'that invitation has gone';
  end if;
  if jsonb_typeof(p_puzzles) <> 'array' or jsonb_array_length(p_puzzles) not between 10 and 40 then raise exception 'bad puzzle set'; end if;
  if exists (select 1 from jsonb_array_elements(p_puzzles) e where not (e ? 'id' and e ? 'band' and e ? 'fen' and e ? 'first' and not e ? 'moves')) then
    raise exception 'bad puzzle set';
  end if;
  if public.in_battle(b.from_player) or public.in_battle(b.to_player) then raise exception 'a battle is already running'; end if;
  t := now() + interval '5 seconds';
  update public.battles set status = 'active', puzzles = p_puzzles, started_at = t where id = b.id;
  return t;
end $$;

revoke all on function public.server_now(), public.in_battle(uuid), public.battle_invite(uuid, uuid, text), public.battle_decline(uuid, uuid),
  public.battle_cancel(uuid, uuid), public.battle_leave(uuid, uuid), public.battle_can_pair(uuid, uuid), public.battle_begin(uuid, uuid, jsonb)
  from public, anon, authenticated;
grant execute on function public.server_now(), public.battle_invite(uuid, uuid, text), public.battle_decline(uuid, uuid),
  public.battle_cancel(uuid, uuid), public.battle_leave(uuid, uuid) to authenticated;
-- in_battle() and the two internal functions: inside the other functions, and (the last two) the server function, only
grant execute on function public.battle_can_pair(uuid, uuid), public.battle_begin(uuid, uuid, jsonb) to service_role;
