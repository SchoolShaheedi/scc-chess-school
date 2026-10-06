-- SCC Chess School: 18+ rated games with strangers (DECISIONS #87). APPLIED 2026-10-06 as migration
-- online_adults_18plus_pairing_ratings, after a security review and 16 live checks.
-- Known limit (no fix without ID checks): one person with two accounts could collude to move a rating.
-- Builds on online.sql. The rules that keep children out are HERE, in the database:
--
--   * Only ONE adult player per account: the account holder, who declared "this profile is me, 18 or older" behind
--     the grown-up question. A child's player can never become adult, and an adult player can never be a child's.
--   * Adults and children NEVER meet: no pairing, no friendship, no challenge, no class link between an adult player
--     and a child's player (can_play and add_friend refuse it; the pairing pool holds adults only).
--   * Strangers see each other only as an animal, a colour and an online rating. Still no chat: four fixed reactions.
--   * A player can block another: they are never paired again.
--   * Rated games change the two players' online rating (one for rapid, one for blitz) in ONE place: a trigger on the
--     game finishing, so every way a game ends (mate, resign, time, draw, abandoned) is rated the same way.

alter table public.online_players add column if not exists adult boolean not null default false;
alter table public.online_players add column if not exists adult_declared_at timestamptz;   -- when the declaration was made (kept)
alter table public.online_players add column if not exists paused boolean not null default false;   -- grown-up switched off: kept, not deleted, so the rating can't be reset
alter table public.online_players add column if not exists rapid_r int not null default 1200;
alter table public.online_players add column if not exists rapid_n int not null default 0;
alter table public.online_players add column if not exists blitz_r int not null default 1200;
alter table public.online_players add column if not exists blitz_n int not null default 0;
-- one adult player per account
create unique index if not exists one_adult_per_account on public.online_players (parent) where adult;

alter table public.games add column if not exists rated boolean not null default false;
alter table public.games add column if not exists category text check (category in ('rapid', 'blitz'));
alter table public.games add column if not exists white_before int;   -- ratings when the game started, for the result card
alter table public.games add column if not exists black_before int;

create table if not exists public.blocks (
  blocker uuid not null references public.online_players (id) on delete cascade,
  blocked uuid not null references public.online_players (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker, blocked)
);
alter table public.blocks enable row level security;   -- no policies: used only inside the functions below

-- the pairing pool: one waiting seek per adult player
create table if not exists public.seeks (
  player     uuid primary key references public.online_players (id) on delete cascade,
  tc         text not null check (tc in ('10', '5', '3+2')),
  rating     int not null,
  since      timestamptz not null default now(),   -- when they started waiting (the rating window widens with it)
  seen       timestamptz not null default now()    -- last heartbeat; a seek not seen for 30 seconds is dropped
);
alter table public.seeks enable row level security;   -- no policies: invisible; only find_game() reads it

/** The account holder switches on 18+ play for their OWN profile (after the grown-up question and declaration). */
create or replace function public.enable_online_adult(p_profile text, p_avatar text, p_colour text) returns uuid
  language plpgsql security definer set search_path = public as $$
declare v uuid; c text; was_adult boolean;
begin
  if auth.uid() is null then raise exception 'sign in first'; end if;
  select id, adult into v, was_adult from public.online_players where parent = auth.uid() and profile_id = p_profile;
  if v is not null and not was_adult then
    raise exception 'this profile already plays as a child; use a separate profile for yourself';
  end if;
  if v is null and exists (select 1 from public.online_players where parent = auth.uid() and adult) then
    raise exception 'this account already has its grown-up profile';
  end if;
  if v is not null then
    -- switching back on: the same player, with its rating; the declaration is made again and recorded
    update public.online_players set avatar = p_avatar, colour = p_colour, paused = false, adult_declared_at = now() where id = v;
    return v;
  end if;
  loop c := public.new_code(); exit when not exists (select 1 from public.online_players where friend_code = c); end loop;
  begin
    insert into public.online_players (parent, profile_id, avatar, colour, friend_code, adult, adult_declared_at)
      values (auth.uid(), p_profile, p_avatar, p_colour, c, true, now()) returning id into v;
  exception when unique_violation then raise exception 'this account already has its grown-up profile';
  end;
  return v;
end $$;

/** Switching off: a child's player is deleted (online.sql); the grown-up player is PAUSED instead, so switching off and
 *  on again can't wipe a rating. Unfinished games are resigned and friendships, challenges and the pool are cleared. */
create or replace function public.disable_online(p_player uuid) returns void
  language plpgsql security definer set search_path = public as $$
declare is_adult boolean;
begin
  if not public.owns_player(p_player) then raise exception 'not your player'; end if;
  update public.games set status = 'finished', reason = 'abandoned', updated_at = now(),
    result = case when white = p_player then '0-1' else '1-0' end
    where status = 'active' and (white = p_player or black = p_player);
  select adult into is_adult from public.online_players where id = p_player;
  if is_adult then
    delete from public.seeks where player = p_player;
    delete from public.friendships where a = p_player or b = p_player;
    update public.challenges set status = 'cancelled' where status = 'pending' and (from_player = p_player or to_player = p_player);
    update public.online_players set paused = true where id = p_player;
  else
    delete from public.online_players where id = p_player;
  end if;
end $$;

-- children's online play can never create or reach an adult player
create or replace function public.enable_online(p_profile text, p_avatar text, p_colour text) returns uuid
  language plpgsql security definer set search_path = public as $$
declare v uuid; c text; is_adult boolean;
begin
  if auth.uid() is null then raise exception 'sign in first'; end if;
  select id, adult into v, is_adult from public.online_players where parent = auth.uid() and profile_id = p_profile;
  if v is not null then
    if is_adult then raise exception 'this is the grown-up profile'; end if;
    update public.online_players set avatar = p_avatar, colour = p_colour where id = v;
    return v;
  end if;
  loop c := public.new_code(); exit when not exists (select 1 from public.online_players where friend_code = c); end loop;
  insert into public.online_players (parent, profile_id, avatar, colour, friend_code) values (auth.uid(), p_profile, p_avatar, p_colour, c)
    returning id into v;
  return v;
end $$;

create or replace function public.can_play(x uuid, y uuid) returns boolean
  language sql stable security definer set search_path = public as $$
  -- an adult and a child can never play, be friends, or be classmates here, whatever else is true
  select x <> y and (public.owns_player(x) or public.owns_player(y))
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
revoke execute on function public.can_play(uuid, uuid) from authenticated, anon, public;

create or replace function public.add_friend(p_player uuid, p_code text) returns text
  language plpgsql security definer set search_path = public as $$
declare other uuid; mine_adult boolean; other_adult boolean;
begin
  if not public.owns_player(p_player) then raise exception 'not your player'; end if;
  delete from public.friend_code_misses where at < now() - interval '1 hour';
  if (select count(*) from public.friend_code_misses where parent = auth.uid()) >= 10 then return 'too_many'; end if;
  select id, adult into other, other_adult from public.online_players where friend_code = upper(p_code) and not paused;
  select adult into mine_adult from public.online_players where id = p_player;
  -- a code from the other pool counts as a miss: an adult can't find a child (or a child an adult) by code
  if other is null or other_adult <> mine_adult then insert into public.friend_code_misses (parent) values (auth.uid()); return 'no_code'; end if;
  if other = p_player then return 'own_code'; end if;
  insert into public.friendships (a, b, requested_by) values (least(p_player, other), greatest(p_player, other), p_player)
    on conflict (a, b) do update set accepted = true
    where public.friendships.requested_by <> p_player;
  return 'sent';
end $$;

/** Block a player you met: never paired again, and any friendship between you ends. */
create or replace function public.block_player(p_player uuid, p_other uuid) returns void
  language plpgsql security definer set search_path = public as $$
begin
  if not public.owns_player(p_player) then raise exception 'not your player'; end if;
  -- only someone you have actually played can be blocked (no probing of other ids)
  if not exists (select 1 from public.games where (white = p_player and black = p_other) or (black = p_player and white = p_other)) then
    raise exception 'you can only block someone you have played';
  end if;
  insert into public.blocks (blocker, blocked) values (p_player, p_other) on conflict do nothing;
  delete from public.friendships where a = least(p_player, p_other) and b = greatest(p_player, p_other);
end $$;

/** Automatic pairing for adults: join the pool for a clock, or be paired at once with the nearest waiting adult.
 *  Call it again every ~10 seconds while waiting (it is also the heartbeat). Returns the new game id, or null. */
create or replace function public.find_game(p_player uuid, p_tc text) returns uuid
  language plpgsql security definer set search_path = public as $$
declare me public.online_players; cat text; my_r int; waited int; other public.seeks; g uuid; mins int; inc int; other_r int;
begin
  if not public.owns_player(p_player) then raise exception 'not your player'; end if;
  select * into me from public.online_players where id = p_player;
  if not me.adult or me.paused then raise exception 'pairing with strangers is for the grown-up profile only'; end if;
  if p_tc not in ('10', '5', '3+2') then raise exception 'unknown clock'; end if;
  -- already in a game (perhaps someone was paired with us a moment ago): stop waiting and go to it
  select id into g from public.games where status = 'active' and (white = p_player or black = p_player) limit 1;
  if g is not null then delete from public.seeks where player = p_player; return g; end if;
  cat := case p_tc when '10' then 'rapid' else 'blitz' end;
  my_r := case cat when 'rapid' then me.rapid_r else me.blitz_r end;
  delete from public.seeks where seen < now() - interval '30 seconds';
  insert into public.seeks (player, tc, rating) values (p_player, p_tc, my_r)
    on conflict (player) do update set seen = now(), tc = excluded.tc, rating = excluded.rating,
      since = case when public.seeks.tc = excluded.tc then public.seeks.since else now() end;
  select extract(epoch from now() - since)::int into waited from public.seeks where player = p_player;
  -- the nearest adult on the same clock, within a window that widens the longer either has waited (100 -> 500)
  select s.* into other from public.seeks s join public.online_players o on o.id = s.player
    where s.player <> p_player and s.tc = p_tc and o.adult and not o.paused
      and not exists (select 1 from public.blocks b where (b.blocker = p_player and b.blocked = s.player) or (b.blocker = s.player and b.blocked = p_player))
      and abs(s.rating - my_r) <= least(500, 100 + 10 * greatest(waited, extract(epoch from now() - s.since)::int))
    order by abs(s.rating - my_r), s.since limit 1 for update skip locked;
  if other.player is null then return null; end if;
  delete from public.seeks where player in (p_player, other.player);
  mins := case p_tc when '10' then 10 when '5' then 5 else 3 end; inc := case p_tc when '3+2' then 2 else 0 end;
  other_r := other.rating;
  if random() < .5 then
    insert into public.games (white, black, tc_min, tc_inc, white_ms, black_ms, rated, category, white_before, black_before)
      values (p_player, other.player, mins, inc, mins * 60000, mins * 60000, true, cat, my_r, other_r) returning id into g;
  else
    insert into public.games (white, black, tc_min, tc_inc, white_ms, black_ms, rated, category, white_before, black_before)
      values (other.player, p_player, mins, inc, mins * 60000, mins * 60000, true, cat, other_r, my_r) returning id into g;
  end if;
  return g;
end $$;

create or replace function public.stop_seeking(p_player uuid) returns void
  language plpgsql security definer set search_path = public as $$
begin
  if not public.owns_player(p_player) then raise exception 'not your player'; end if;
  delete from public.seeks where player = p_player;
end $$;

/** The two sides of one of MY games, as strangers see each other: animal, colour, and rating for the game's clock. */
create or replace function public.game_players(p_game uuid)
  returns table (side text, player uuid, avatar text, colour text, rating int)
  language plpgsql stable security definer set search_path = public as $$
declare g public.games;
begin
  select * into g from public.games where id = p_game;
  if g.id is null or not (public.owns_player(g.white) or public.owns_player(g.black)) then raise exception 'not your game'; end if;
  return query select x.side, o.id, o.avatar, o.colour, case g.category when 'rapid' then o.rapid_r when 'blitz' then o.blitz_r end
    from (values ('w', g.white), ('b', g.black)) as x(side, id) left join public.online_players o on o.id = x.id;
end $$;

-- ratings: Elo with K 40 for a player's first 20 rated games, then 20. Runs once, when a rated game finishes.
create or replace function public.rate_game() returns trigger
  language plpgsql security definer set search_path = public as $$
declare w public.online_players; b public.online_players; sw numeric; ew numeric; kw int; kb int; dw int; db int;
begin
  if not new.rated or new.status <> 'finished' or old.status = 'finished' or new.result is null then return new; end if;
  -- a game that ends before both sides have moved changes nobody's rating
  if coalesce(array_length(new.moves, 1), 0) < 2 then return new; end if;
  select * into w from public.online_players where id = new.white;
  select * into b from public.online_players where id = new.black;
  if w.id is null or b.id is null then return new; end if;
  sw := case new.result when '1-0' then 1 when '0-1' then 0 else 0.5 end;
  if new.category = 'rapid' then
    ew := 1 / (1 + power(10, (b.rapid_r - w.rapid_r) / 400.0));
    kw := case when w.rapid_n < 20 then 40 else 20 end; kb := case when b.rapid_n < 20 then 40 else 20 end;
    dw := round(kw * (sw - ew)); db := round(kb * ((1 - sw) - (1 - ew)));
    update public.online_players set rapid_r = greatest(100, rapid_r + dw), rapid_n = rapid_n + 1 where id = w.id;
    update public.online_players set rapid_r = greatest(100, rapid_r + db), rapid_n = rapid_n + 1 where id = b.id;
  else
    ew := 1 / (1 + power(10, (b.blitz_r - w.blitz_r) / 400.0));
    kw := case when w.blitz_n < 20 then 40 else 20 end; kb := case when b.blitz_n < 20 then 40 else 20 end;
    dw := round(kw * (sw - ew)); db := round(kb * ((1 - sw) - (1 - ew)));
    update public.online_players set blitz_r = greatest(100, blitz_r + dw), blitz_n = blitz_n + 1 where id = w.id;
    update public.online_players set blitz_r = greatest(100, blitz_r + db), blitz_n = blitz_n + 1 where id = b.id;
  end if;
  return new;
end $$;
drop trigger if exists rate_game on public.games;
create trigger rate_game after update of status on public.games for each row execute function public.rate_game();

revoke all on function public.enable_online_adult(text, text, text), public.block_player(uuid, uuid), public.find_game(uuid, text),
  public.stop_seeking(uuid), public.game_players(uuid), public.rate_game() from public, anon, authenticated;
grant execute on function public.enable_online_adult(text, text, text), public.block_player(uuid, uuid), public.find_game(uuid, text),
  public.stop_seeking(uuid), public.game_players(uuid) to authenticated;
