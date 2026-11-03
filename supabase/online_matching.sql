-- SCC Chess School: automatic matching, open challenges ("Play anyone") and rematches. APPLIED 2026-11-03 as migration online_matching_auto_open_rematch.
-- Apply SECOND, after online_ratings.sql. The user's safety choice: "Grown-ups only".
--
-- WHO MAY BE PAIRED (one function, pair_ok, used by every path below; nothing else decides):
--   * two GROWN-UP players (online_players.adult, declared 18+), both unpaused, neither blocking the other: STRANGERS
--     may be paired. They see each other only as an animal, a colour and a rating.
--   * two CHILD players only if they are friends (accepted) or classmates: that test is can_play() (online.sql /
--     online_adults.sql), NOT a second copy of it here, so class approval rules live in one place.
--   * a grown-up and a child: NEVER. A child and a stranger: NEVER.
--   Backed up by games_guard (online_ratings.sql), which refuses to insert a 'stranger' game with a child in it.
--
-- Matching: find_game() is the "Play" button (auto). The window widens with the time waited: +-100, then +-200 after
-- 10 s, +-400 after 20 s, anyone in the pool after 30 s (rating_window). post_seek()/open_seeks()/accept_seek() are the
-- open-challenge lobby. Seeks live while their owner keeps calling (heartbeat, a seek not seen for 30 s is dropped).
-- Rated: grown-up stranger games (the adult pool) and children's friend/class games (the child pool, never mixed).
-- Rematch: same opponent and clock, the other side must accept; it needs pair_ok to still hold.
-- This file replaces find_game and answer_challenge, and adds nothing to the can_play / battle_can_pair classmate branches.

-- ---------- the pool ----------
alter table public.seeks drop constraint if exists seeks_tc_check;
alter table public.seeks add constraint seeks_tc_check check (public.tc_valid(tc));
alter table public.seeks add column if not exists kind text not null default 'auto' check (kind in ('auto', 'open'));
revoke all on table public.seeks from anon, authenticated;

/** The rating window (+-) for a seek that has waited this long (whole seconds). */
create or replace function public.rating_window(waited int) returns int language sql immutable as $$
  select case when waited < 10 then 100 when waited < 20 then 200 when waited < 30 then 400 else 100000 end;
$$;

/** May x (a player the CALLER owns) be paired with y? See the header: this is the only rule. */
create or replace function public.pair_ok(x uuid, y uuid) returns boolean
  language plpgsql stable security definer set search_path = public as $$
declare px public.online_players; py public.online_players;
begin
  if x = y or not public.owns_player(x) then return false; end if;
  select * into px from public.online_players where id = x;
  select * into py from public.online_players where id = y;
  if px.id is null or py.id is null or px.paused or py.paused or px.adult <> py.adult then return false; end if;
  if exists (select 1 from public.blocks where (blocker = x and blocked = y) or (blocker = y and blocked = x)) then return false; end if;
  if px.adult then return true; end if;             -- grown-ups: strangers allowed
  return public.can_play(x, y);                     -- children: an accepted friend or a classmate, never anyone else
end $$;

/** 'stranger' when both are grown-ups, else 'friend' (children's friend/class games). */
create or replace function public.pair_kind(x uuid, y uuid) returns text language sql stable security definer set search_path = public as $$
  select case when (select adult from public.online_players where id = x) and (select adult from public.online_players where id = y) then 'stranger' else 'friend' end;
$$;

/** The live game this player is in from matching or a rematch (never a friend challenge or a class simul board), if any. */
create or replace function public.active_game(p_player uuid) returns uuid language sql stable security definer set search_path = public as $$
  select id from public.games where status = 'active' and simul_id is null and via in ('seek', 'rematch')
    and (white = p_player or black = p_player) order by created_at desc limit 1;
$$;

/** Games nobody started are closed so they never block anyone: a matched or rematch game with no move after 90 s,
 *  and any game with no move at all after a day. No result, no rating. */
create or replace function public.abort_unstarted(p_player uuid) returns void language sql security definer set search_path = public as $$
  update public.games set status = 'finished', reason = 'abandoned', result = null, draw_offer = null, updated_at = now()
    where status = 'active' and moves = '{}' and simul_id is null and (white = p_player or black = p_player)
      and ((via in ('seek', 'rematch') and created_at < now() - interval '90 seconds') or created_at < now() - interval '1 day');
$$;

/** Start a two-player game. Internal: the callers have checked pair_ok. p_white null = random. Rated = timed, and the guard decides the rest. */
create or replace function public.start_pair_game(a uuid, b uuid, p_tc text, p_via text, p_kind text, p_rated boolean, p_white uuid default null) returns uuid
  language plpgsql security definer set search_path = public as $$
declare w uuid; bl uuid; mins int := public.tc_mins(p_tc); inc int := public.tc_inc(p_tc); cat text := public.tc_category(public.tc_mins(p_tc)); g uuid; rated boolean := p_rated and public.tc_mins(p_tc) > 0;
begin
  if p_white = a or p_white = b then w := p_white; elsif random() < .5 then w := a; else w := b; end if;
  bl := case when w = a then b else a end;
  insert into public.games (white, black, tc_min, tc_inc, white_ms, black_ms, rated, category, kind, via, white_before, black_before)
    values (w, bl, mins, inc, mins * 60000, mins * 60000, rated, case when rated then cat end, p_kind, p_via,
      case when rated then round(public.rating_of(w, cat))::int end, case when rated then round(public.rating_of(bl, cat))::int end)
    returning id into g;
  return g;
end $$;

/** Join (or refresh) my seek. Returns the game I am already in, if any (stop waiting and go to it), else null. Internal. */
create or replace function public.seek_enter(p_player uuid, p_tc text, p_kind text) returns uuid
  language plpgsql security definer set search_path = public as $$
declare me public.online_players; g uuid; tcn text; r int;
begin
  if not public.owns_player(p_player) then raise exception 'not your player'; end if;
  select * into me from public.online_players where id = p_player;
  if me.paused then raise exception 'online play is switched off for this player'; end if;
  if p_tc = 'none' or not public.tc_valid(p_tc) then raise exception 'unknown clock'; end if;
  perform public.abort_unstarted(p_player);
  g := public.active_game(p_player);
  if g is not null then delete from public.seeks where player = p_player; return g; end if;
  tcn := public.tc_norm(p_tc);
  r := round(public.rating_of(p_player, public.tc_category(public.tc_mins(tcn))))::int;
  delete from public.seeks where seen < now() - interval '30 seconds';
  insert into public.seeks (player, tc, kind, rating) values (p_player, tcn, p_kind, r)
    on conflict (player) do update set seen = now(), tc = excluded.tc, kind = excluded.kind, rating = excluded.rating,
      since = case when public.seeks.tc = excluded.tc then public.seeks.since else now() end;
  return null;
end $$;

/** The "Play" button. Grown-ups are paired with the nearest waiting grown-up; a child only with a waiting friend or
 *  classmate. Call it every ~5 s while waiting (it is also the heartbeat). Returns the new game's id, or null.
 *  (Replaces the 18+-only version in online_adults.sql, which also returned ANY active game, even a friend game or a class simul board.) */
create or replace function public.find_game(p_player uuid, p_tc text) returns uuid
  language plpgsql security definer set search_path = public as $$
declare g uuid; mine public.seeks; other public.seeks; waited int;
begin
  g := public.seek_enter(p_player, p_tc, 'auto');
  if g is not null then return g; end if;
  select * into mine from public.seeks where player = p_player;
  waited := extract(epoch from now() - mine.since)::int;
  select s.* into other from public.seeks s
    where s.player <> p_player and s.tc = mine.tc and s.seen >= now() - interval '30 seconds'
      and public.pair_ok(p_player, s.player)
      and abs(s.rating - mine.rating) <= public.rating_window(greatest(waited, extract(epoch from now() - s.since)::int))
    order by abs(s.rating - mine.rating), s.since limit 1 for update skip locked;
  if other.player is null then return null; end if;
  g := public.start_pair_game(p_player, other.player, mine.tc, 'seek', public.pair_kind(p_player, other.player), true);
  delete from public.seeks where player in (p_player, other.player);
  return g;
end $$;

/** Post (or refresh) an open challenge for the lobby. Call it every ~5 s while the lobby is open. Returns a game id once someone accepted. */
create or replace function public.post_seek(p_player uuid, p_tc text) returns uuid
  language plpgsql security definer set search_path = public as $$
begin
  return public.seek_enter(p_player, p_tc, 'open');
end $$;

create or replace function public.stop_seeking(p_player uuid) returns void
  language plpgsql security definer set search_path = public as $$
begin
  if not public.owns_player(p_player) then raise exception 'not your player'; end if;
  delete from public.seeks where player = p_player;
end $$;

/** The open challenges this player may accept: grown-ups see every other grown-up's; a child sees only friends' and
 *  classmates' (pair_ok decides, row by row). Animal, colour, rating and clock only. */
create or replace function public.open_seeks(p_player uuid)
  returns table (player uuid, avatar text, colour text, rating int, provisional boolean, tc text, category text, waited int, friend boolean)
  language plpgsql stable security definer set search_path = public as $$
begin
  if not public.owns_player(p_player) then raise exception 'not your player'; end if;
  if exists (select 1 from public.online_players where id = p_player and paused) then return; end if;
  return query
  select s.player, o.avatar, o.colour, s.rating, coalesce(pr.rd, 350) > 110, s.tc, public.tc_category(public.tc_mins(s.tc)),
    extract(epoch from now() - s.since)::int,
    exists (select 1 from public.friendships f where f.a = least(p_player, s.player) and f.b = greatest(p_player, s.player) and f.accepted)
  from public.seeks s join public.online_players o on o.id = s.player
    left join public.player_ratings pr on pr.player = s.player and pr.category = public.tc_category(public.tc_mins(s.tc))
  where s.kind = 'open' and s.player <> p_player and s.seen >= now() - interval '30 seconds' and public.pair_ok(p_player, s.player)
  order by abs(s.rating - public.rating_of(p_player, public.tc_category(public.tc_mins(s.tc)))), s.since limit 50;
end $$;

/** Accept someone's open challenge. The same pair_ok test as listing it: a child can never accept a stranger's or a grown-up's. */
create or replace function public.accept_seek(p_player uuid, p_target uuid) returns uuid
  language plpgsql security definer set search_path = public as $$
declare s public.seeks; g uuid;
begin
  if not public.owns_player(p_player) then raise exception 'not your player'; end if;
  perform public.abort_unstarted(p_player); perform public.abort_unstarted(p_target);
  if public.active_game(p_player) is not null then raise exception 'finish your current game first'; end if;
  select * into s from public.seeks where player = p_target and kind = 'open' and seen >= now() - interval '30 seconds' for update skip locked;
  -- every refusal says the same thing, so nobody can probe who is in which pool
  if s.player is null or not public.pair_ok(p_player, p_target) or public.active_game(p_target) is not null then raise exception 'that challenge has gone'; end if;
  g := public.start_pair_game(p_player, p_target, s.tc, 'seek', public.pair_kind(p_player, p_target), true);
  delete from public.seeks where player in (p_player, p_target);
  return g;
end $$;

-- ---------- friend challenges: children's timed games are now rated in the child pool ----------
create or replace function public.answer_challenge(p_player uuid, p_challenge uuid, p_accept boolean) returns uuid
  language plpgsql security definer set search_path = public as $$
declare c public.challenges; g uuid; w uuid; b uuid; mins int; inc int; cat text; is_rated boolean;
begin
  if not public.owns_player(p_player) then raise exception 'not your player'; end if;
  perform public.abort_unstarted(p_player);
  select * into c from public.challenges where id = p_challenge and to_player = p_player and status = 'pending' for update;
  if c.id is null or c.created_at < now() - interval '10 minutes' then raise exception 'that challenge has gone'; end if;
  if p_accept and not public.can_play(c.to_player, c.from_player) then
    update public.challenges set status = 'cancelled' where id = c.id; raise exception 'that challenge has gone';
  end if;
  if not p_accept then update public.challenges set status = 'declined' where id = c.id; return null; end if;
  if c.colour = 'w' or (c.colour = 'random' and random() < .5) then w := c.from_player; b := c.to_player; else w := c.to_player; b := c.from_player; end if;
  mins := public.tc_mins(c.tc); inc := public.tc_inc(c.tc); cat := public.tc_category(mins);
  -- rated only for children (friends and classmates, timed, plain chess); grown-up friends play unrated
  is_rated := mins > 0 and c.variant = 'chess' and not (select adult from public.online_players where id = w);
  insert into public.games (white, black, tc_min, tc_inc, white_ms, black_ms, variant, seed, rated, category, kind, via, white_before, black_before)
    values (w, b, mins, inc, mins * 60000, mins * 60000, c.variant, case when c.variant = 'magical' then floor(random() * 2147483647)::int end,
      is_rated, case when is_rated then cat end, 'friend', 'challenge',
      case when is_rated then round(public.rating_of(w, cat))::int end, case when is_rated then round(public.rating_of(b, cat))::int end)
    returning id into g;
  update public.challenges set status = 'accepted', game = g where id = c.id;
  return g;
end $$;

-- ---------- rematch ----------
create table if not exists public.rematches (
  id          uuid primary key default gen_random_uuid(),
  game        uuid not null references public.games (id) on delete cascade,
  from_player uuid not null references public.online_players (id) on delete cascade,
  to_player   uuid not null references public.online_players (id) on delete cascade,
  status      text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'cancelled')),
  new_game    uuid references public.games (id) on delete set null,
  created_at  timestamptz not null default now()
);
create unique index if not exists one_pending_rematch on public.rematches (game) where status = 'pending';
alter table public.rematches enable row level security;
create policy "players read own rematches" on public.rematches for select to authenticated using (public.owns_player(from_player) or public.owns_player(to_player));
revoke all on table public.rematches from anon;
revoke insert, update, delete on table public.rematches from authenticated;

/** Ask for a rematch of a finished game (same opponent, same clock, colours swapped). The other side must accept, within 60 s.
 *  If they have already asked for one, that is agreement and the game starts at once. Returns the rematch id. */
create or replace function public.request_rematch(p_player uuid, p_game uuid) returns uuid
  language plpgsql security definer set search_path = public as $$
declare g public.games; opp uuid; v uuid; r public.rematches; ng uuid;
begin
  if not public.owns_player(p_player) then raise exception 'not your player'; end if;
  select * into g from public.games where id = p_game;
  if g.id is null or g.status <> 'finished' or g.variant <> 'chess' or g.simul_id is not null or coalesce(array_length(g.moves, 1), 0) < 2
     or g.updated_at < now() - interval '10 minutes' or (g.white <> p_player and g.black <> p_player) or g.white is null or g.black is null then
    raise exception 'no rematch for this game';
  end if;
  opp := case when g.white = p_player then g.black else g.white end;
  if not public.pair_ok(p_player, opp) then raise exception 'no rematch for this game'; end if;
  update public.rematches set status = 'cancelled' where status = 'pending' and created_at < now() - interval '60 seconds';
  select * into r from public.rematches where game = p_game and status = 'pending' for update;
  if r.id is not null then
    if r.from_player = p_player then return r.id; end if;
    return public.answer_rematch_inner(p_player, r.id, true);
  end if;
  insert into public.rematches (game, from_player, to_player) values (p_game, p_player, opp) returning id into v;
  return v;
end $$;

/** Internal: the answering side accepts or declines; accepting starts the game. Returns the rematch id. */
create or replace function public.answer_rematch_inner(p_player uuid, p_rematch uuid, p_accept boolean) returns uuid
  language plpgsql security definer set search_path = public as $$
declare r public.rematches; g public.games; ng uuid; tcs text;
begin
  select * into r from public.rematches where id = p_rematch and status = 'pending' for update;
  if r.id is null or r.created_at < now() - interval '60 seconds' then raise exception 'that rematch has gone'; end if;
  if not p_accept then update public.rematches set status = 'declined' where id = r.id; return r.id; end if;
  select * into g from public.games where id = r.game;
  perform public.abort_unstarted(r.from_player); perform public.abort_unstarted(r.to_player);
  if not public.pair_ok(p_player, case when r.from_player = p_player then r.to_player else r.from_player end)
     or public.active_game(r.from_player) is not null or public.active_game(r.to_player) is not null then
    update public.rematches set status = 'cancelled' where id = r.id; raise exception 'that rematch has gone';
  end if;
  tcs := case when g.tc_min = 0 then 'none' else g.tc_min || '+' || g.tc_inc end;
  -- same clock, same kind and rated flag as the game before, the colours swapped
  ng := public.start_pair_game(g.white, g.black, tcs, 'rematch', g.kind, g.rated, g.black);
  update public.rematches set status = 'accepted', new_game = ng where id = r.id;
  return r.id;
end $$;

create or replace function public.answer_rematch(p_player uuid, p_rematch uuid, p_accept boolean) returns uuid
  language plpgsql security definer set search_path = public as $$
declare r public.rematches;
begin
  if not public.owns_player(p_player) then raise exception 'not your player'; end if;
  select * into r from public.rematches where id = p_rematch and to_player = p_player;
  if r.id is null then raise exception 'that rematch has gone'; end if;
  return public.answer_rematch_inner(p_player, p_rematch, p_accept);
end $$;

create or replace function public.cancel_rematch(p_player uuid, p_rematch uuid) returns void
  language plpgsql security definer set search_path = public as $$
begin
  if not public.owns_player(p_player) then raise exception 'not your player'; end if;
  update public.rematches set status = 'cancelled' where id = p_rematch and from_player = p_player and status = 'pending';
end $$;

-- live updates of rematch offers for the two players (row-level security applies to realtime too)
do $$ begin alter publication supabase_realtime add table public.rematches;
exception when duplicate_object then null; end $$;

-- ---------- permissions ----------
-- internal: never callable by a client
revoke all on function public.rating_window(int), public.pair_ok(uuid, uuid), public.pair_kind(uuid, uuid), public.active_game(uuid),
  public.abort_unstarted(uuid), public.start_pair_game(uuid, uuid, text, text, text, boolean, uuid), public.seek_enter(uuid, text, text),
  public.answer_rematch_inner(uuid, uuid, boolean) from public, anon, authenticated;
-- client-callable: each checks that the caller owns the player; pair_ok / games_guard enforce who may meet whom
revoke all on function public.find_game(uuid, text), public.post_seek(uuid, text), public.stop_seeking(uuid), public.open_seeks(uuid),
  public.accept_seek(uuid, uuid), public.answer_challenge(uuid, uuid, boolean), public.request_rematch(uuid, uuid),
  public.answer_rematch(uuid, uuid, boolean), public.cancel_rematch(uuid, uuid) from public, anon;
grant execute on function public.find_game(uuid, text), public.post_seek(uuid, text), public.stop_seeking(uuid), public.open_seeks(uuid),
  public.accept_seek(uuid, uuid), public.answer_challenge(uuid, uuid, boolean), public.request_rematch(uuid, uuid),
  public.answer_rematch(uuid, uuid, boolean), public.cancel_rematch(uuid, uuid) to authenticated;
