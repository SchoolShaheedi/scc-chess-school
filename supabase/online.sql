-- SCC Chess School: live games with friends and classmates (DECISIONS #86). APPLIED 2026-10-06 to project
-- scc-chess-school (ref bqcfdrbnavpsmpgvnitt) as migration online_play_friends_classmates, after a security review.
-- Safeguarding is enforced HERE, in the database, not in the app (the same approach as classes.sql):
--
--   * Online play is OFF for every child until a parent switches it on for that child (a row in online_players).
--     Switching it off resigns that child's unfinished games, then deletes the row with every friendship and
--     challenge; the other child keeps their copy of past games (that side becomes empty).
--   * Players are seen ONLY as an animal and a colour. No names, no emails, no account ids leave the database:
--     other players are known by an opaque player id.
--   * You can only challenge a FRIEND or a CLASSMATE (a child in the same teacher's class, classes.sql). A friend is
--     added with a friend code a parent shares in person, AND the other family must accept the request. Wrong codes
--     are limited to 10 an hour per account, so codes can't be guessed. No search, no strangers, no matchmaking.
--   * There is NO free text anywhere: the only messages are four fixed reactions, stored as short codes.
--   * Nobody can write a move, a result or a clock directly. Moves go through the play-move server function, which
--     checks the move is legal and it is that player's turn, and keeps the clocks by the server's own time.
--   * Everything else (challenging, answering, resigning, draws, reactions, friends) goes through the functions below,
--     each of which checks that the caller owns the player they act for.

-- ---------- players ----------
create table if not exists public.online_players (
  id          uuid primary key default gen_random_uuid(),
  parent      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  profile_id  text not null check (char_length(profile_id) <= 24),
  avatar      text not null check (avatar in ('cat','dog','rabbit','bird','fish','turtle','squirrel','snail')),
  colour      text not null check (colour ~ '^#[0-9A-Fa-f]{6}$'),
  friend_code text not null unique check (friend_code ~ '^[A-HJ-NP-Z2-9]{6}$'),
  created_at  timestamptz not null default now(),
  unique (parent, profile_id)
);
alter table public.online_players enable row level security;
create policy "parents read own players" on public.online_players for select to authenticated using (parent = (select auth.uid()));
-- no insert/update/delete policies: enable_online(), disable_online() and new_friend_code() do it

create or replace function public.owns_player(p uuid) returns boolean
  language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.online_players where id = p and parent = auth.uid());
$$;

create or replace function public.new_code() returns text language sql volatile set search_path = public as $$
  select string_agg(substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 1 + floor(random() * 32)::int, 1), '') from generate_series(1, 6);
$$;

/** The parent switches online play on for one child (or updates its animal and colour). Returns the player id. */
create or replace function public.enable_online(p_profile text, p_avatar text, p_colour text) returns uuid
  language plpgsql security definer set search_path = public as $$
declare v uuid; c text;
begin
  if auth.uid() is null then raise exception 'sign in first'; end if;
  select id into v from public.online_players where parent = auth.uid() and profile_id = p_profile;
  if v is not null then
    update public.online_players set avatar = p_avatar, colour = p_colour where id = v;
    return v;
  end if;
  loop c := public.new_code(); exit when not exists (select 1 from public.online_players where friend_code = c); end loop;
  insert into public.online_players (parent, profile_id, avatar, colour, friend_code) values (auth.uid(), p_profile, p_avatar, p_colour, c)
    returning id into v;
  return v;
end $$;

/** Switch it off: unfinished games are resigned (the other child keeps the game and the win), then the player is
 *  deleted with every friendship and challenge. Their side of old games becomes empty (games.white/black set null). */
create or replace function public.disable_online(p_player uuid) returns void
  language plpgsql security definer set search_path = public as $$
begin
  if not public.owns_player(p_player) then raise exception 'not your player'; end if;
  update public.games set status = 'finished', reason = 'abandoned', updated_at = now(),
    result = case when white = p_player then '0-1' else '1-0' end
    where status = 'active' and (white = p_player or black = p_player);
  delete from public.online_players where id = p_player;
end $$;

/** A new friend code (if the old one was shared too widely). Existing friends stay friends. */
create or replace function public.new_friend_code(p_player uuid) returns text
  language plpgsql security definer set search_path = public as $$
declare c text;
begin
  if not public.owns_player(p_player) then raise exception 'not your player'; end if;
  loop c := public.new_code(); exit when not exists (select 1 from public.online_players where friend_code = c); end loop;
  update public.online_players set friend_code = c where id = p_player;
  return c;
end $$;

-- ---------- friends ----------
create table if not exists public.friendships (
  a uuid not null references public.online_players (id) on delete cascade,
  b uuid not null references public.online_players (id) on delete cascade,
  requested_by uuid not null,                     -- the player who typed the code; the OTHER one must accept
  accepted boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (a, b), check (a < b), check (requested_by in (a, b))
);
-- wrong friend codes, to stop guessing: 10 an hour per account
create table if not exists public.friend_code_misses (parent uuid not null references auth.users (id) on delete cascade, at timestamptz not null default now());
alter table public.friend_code_misses enable row level security;   -- no policies: invisible to everyone
alter table public.friendships enable row level security;
create policy "players read own friendships" on public.friendships for select to authenticated
  using (public.owns_player(a) or public.owns_player(b));

/** Send a friend request with the other child's code. It becomes a friendship only when their family accepts. */
-- Returns 'sent', 'too_many', 'no_code' or 'own_code'. It RETURNS rather than raising for a wrong code: raising
-- would roll back the miss it has just counted, and the guessing limit would never bite.
create or replace function public.add_friend(p_player uuid, p_code text) returns text
  language plpgsql security definer set search_path = public as $$
declare other uuid;
begin
  if not public.owns_player(p_player) then raise exception 'not your player'; end if;
  delete from public.friend_code_misses where at < now() - interval '1 hour';
  if (select count(*) from public.friend_code_misses where parent = auth.uid()) >= 10 then return 'too_many'; end if;
  select id into other from public.online_players where friend_code = upper(p_code);
  if other is null then insert into public.friend_code_misses (parent) values (auth.uid()); return 'no_code'; end if;
  if other = p_player then return 'own_code'; end if;
  insert into public.friendships (a, b, requested_by) values (least(p_player, other), greatest(p_player, other), p_player)
    on conflict (a, b) do update set accepted = true
    where public.friendships.requested_by <> p_player;   -- both typed each other's code: that is agreement
  return 'sent';
end $$;

/** The family of the child who was asked accepts (or turns down) a friend request. */
create or replace function public.answer_friend(p_player uuid, p_other uuid, p_accept boolean) returns void
  language plpgsql security definer set search_path = public as $$
begin
  if not public.owns_player(p_player) then raise exception 'not your player'; end if;
  if p_accept then
    update public.friendships set accepted = true where a = least(p_player, p_other) and b = greatest(p_player, p_other) and requested_by = p_other;
  else
    delete from public.friendships where a = least(p_player, p_other) and b = greatest(p_player, p_other) and requested_by = p_other and not accepted;
  end if;
end $$;

/** Friend requests waiting for this child's family to answer. */
create or replace function public.friend_requests(p_player uuid) returns table (player uuid, avatar text, colour text)
  language plpgsql stable security definer set search_path = public as $$
begin
  if not public.owns_player(p_player) then raise exception 'not your player'; end if;
  return query select o.id, o.avatar, o.colour from public.friendships f join public.online_players o on o.id = f.requested_by
    where not f.accepted and f.requested_by <> p_player and (f.a = p_player or f.b = p_player);
end $$;

/** Unfriend (also how a family stops someone challenging their child; a new friend code stops re-adding). */
create or replace function public.remove_friend(p_player uuid, p_other uuid) returns void
  language plpgsql security definer set search_path = public as $$
begin
  if not public.owns_player(p_player) then raise exception 'not your player'; end if;
  delete from public.friendships where a = least(p_player, p_other) and b = greatest(p_player, p_other);
  -- and nothing already sent between them can still start a game
  update public.challenges set status = 'cancelled' where status = 'pending'
    and ((from_player = p_player and to_player = p_other) or (from_player = p_other and to_player = p_player));
end $$;

/** Two players may play if they are friends, or children in the same class (memberships, classes.sql). */
create or replace function public.can_play(x uuid, y uuid) returns boolean
  language sql stable security definer set search_path = public as $$
  -- defence in depth: only ever answers for the caller's own player, even though no client can call it directly
  select x <> y and (public.owns_player(x) or public.owns_player(y)) and (
    exists (select 1 from public.friendships where a = least(x, y) and b = greatest(x, y) and accepted)
    or exists (
      select 1 from public.online_players px join public.memberships mx on mx.parent = px.parent and mx.profile_id = px.profile_id,
                    public.online_players py join public.memberships my on my.parent = py.parent and my.profile_id = py.profile_id
      where px.id = x and py.id = y and mx.class_id = my.class_id));
$$;

/** Who this child can play: friends and classmates who have online play on, as animal + colour only. */
create or replace function public.my_opponents(p_player uuid)
  returns table (player uuid, avatar text, colour text, friend boolean, classmate boolean)
  language plpgsql stable security definer set search_path = public as $$
begin
  if not public.owns_player(p_player) then raise exception 'not your player'; end if;
  return query
  select o.id, o.avatar, o.colour,
    exists (select 1 from public.friendships f where f.a = least(p_player, o.id) and f.b = greatest(p_player, o.id) and f.accepted),
    exists (select 1 from public.online_players me join public.memberships mm on mm.parent = me.parent and mm.profile_id = me.profile_id
            join public.memberships mo on mo.class_id = mm.class_id where me.id = p_player and mo.parent = o.parent and mo.profile_id = o.profile_id)
  from public.online_players o
  where o.id <> p_player and public.can_play(p_player, o.id);
end $$;

-- ---------- challenges ----------
create table if not exists public.challenges (
  id         uuid primary key default gen_random_uuid(),
  from_player uuid not null references public.online_players (id) on delete cascade,
  to_player   uuid not null references public.online_players (id) on delete cascade,
  tc         text not null check (tc in ('none','10','5','3+2')),
  colour     text not null check (colour in ('w','b','random')),
  status     text not null default 'pending' check (status in ('pending','accepted','declined','cancelled')),
  game       uuid,
  created_at timestamptz not null default now()
);
alter table public.challenges enable row level security;
create policy "players read own challenges" on public.challenges for select to authenticated
  using (public.owns_player(from_player) or public.owns_player(to_player));

-- ---------- games ----------
create table if not exists public.games (
  id         uuid primary key default gen_random_uuid(),
  white      uuid references public.online_players (id) on delete set null,   -- null = that child switched online play off
  black      uuid references public.online_players (id) on delete set null,
  tc_min     int not null default 0 check (tc_min between 0 and 60),
  tc_inc     int not null default 0 check (tc_inc between 0 and 30),
  moves      text[] not null default '{}',
  fen        text not null default 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  white_ms   int not null default 0,
  black_ms   int not null default 0,
  turn_since timestamptz,                          -- when the side to move started thinking (null until White's first move)
  status     text not null default 'active' check (status in ('active','finished')),
  result     text check (result in ('1-0','0-1','1/2-1/2')),
  reason     text check (reason in ('mate','resign','time','stalemate','repetition','fifty','material','agreement','abandoned')),
  draw_offer uuid,                                 -- the player who offered a draw, if any
  reaction   jsonb,                                -- { by: player, code: 'gl'|'gg'|'ty'|'wp', at }
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.games enable row level security;
create policy "players read own games" on public.games for select to authenticated
  using (public.owns_player(white) or public.owns_player(black));
-- no insert/update/delete policies at all: games change only through the functions below and play-move

create or replace function public.challenge(p_player uuid, p_to uuid, p_tc text, p_colour text) returns uuid
  language plpgsql security definer set search_path = public as $$
declare v uuid;
begin
  if not public.owns_player(p_player) then raise exception 'not your player'; end if;
  if not public.can_play(p_player, p_to) then raise exception 'you can only challenge friends and classmates'; end if;
  -- no flooding: one open challenge to the same player, and at most five open challenges at once
  update public.challenges set status = 'cancelled' where status = 'pending' and created_at < now() - interval '10 minutes';
  if exists (select 1 from public.challenges where from_player = p_player and to_player = p_to and status = 'pending') then raise exception 'already challenged'; end if;
  if (select count(*) from public.challenges where from_player = p_player and status = 'pending') >= 5 then raise exception 'too many open challenges'; end if;
  insert into public.challenges (from_player, to_player, tc, colour) values (p_player, p_to, p_tc, p_colour) returning id into v;
  return v;
end $$;

create or replace function public.answer_challenge(p_player uuid, p_challenge uuid, p_accept boolean) returns uuid
  language plpgsql security definer set search_path = public as $$
declare c public.challenges; g uuid; w uuid; b uuid; mins int; inc int;
begin
  if not public.owns_player(p_player) then raise exception 'not your player'; end if;
  select * into c from public.challenges where id = p_challenge and to_player = p_player and status = 'pending' for update;
  if c.id is null or c.created_at < now() - interval '10 minutes' then raise exception 'that challenge has gone'; end if;
  -- they must STILL be friends or classmates (a family may have unfriended since the challenge was sent)
  if p_accept and not public.can_play(c.to_player, c.from_player) then
    update public.challenges set status = 'cancelled' where id = c.id; raise exception 'that challenge has gone';
  end if;
  if not p_accept then update public.challenges set status = 'declined' where id = c.id; return null; end if;
  if c.colour = 'w' or (c.colour = 'random' and random() < .5) then w := c.from_player; b := c.to_player; else w := c.to_player; b := c.from_player; end if;
  mins := case c.tc when '10' then 10 when '5' then 5 when '3+2' then 3 else 0 end;
  inc := case c.tc when '3+2' then 2 else 0 end;
  insert into public.games (white, black, tc_min, tc_inc, white_ms, black_ms) values (w, b, mins, inc, mins * 60000, mins * 60000) returning id into g;
  update public.challenges set status = 'accepted', game = g where id = c.id;
  return g;
end $$;

create or replace function public.cancel_challenge(p_player uuid, p_challenge uuid) returns void
  language plpgsql security definer set search_path = public as $$
begin
  if not public.owns_player(p_player) then raise exception 'not your player'; end if;
  update public.challenges set status = 'cancelled' where id = p_challenge and from_player = p_player and status = 'pending';
end $$;

/** Resign, offer a draw, accept a draw, or send one of the four fixed reactions. */
create or replace function public.game_action(p_player uuid, p_game uuid, p_action text, p_code text default null) returns void
  language plpgsql security definer set search_path = public as $$
declare g public.games; side text;
begin
  if not public.owns_player(p_player) then raise exception 'not your player'; end if;
  select * into g from public.games where id = p_game for update;
  if g.id is null then raise exception 'no such game'; end if;
  side := case when g.white = p_player then 'w' when g.black = p_player then 'b' end;
  if side is null then raise exception 'not your game'; end if;
  if p_action = 'react' then
    if p_code not in ('gl','gg','ty','wp') then raise exception 'unknown reaction'; end if;
    -- one reaction every 5 seconds at most
    if g.reaction is not null and (g.reaction->>'by')::uuid = p_player and (g.reaction->>'at')::timestamptz > now() - interval '5 seconds' then return; end if;
    update public.games set reaction = jsonb_build_object('by', p_player, 'code', p_code, 'at', now()) where id = g.id;
    return;
  end if;
  if g.status <> 'active' then raise exception 'the game is over'; end if;
  if p_action = 'resign' then
    update public.games set status = 'finished', result = case side when 'w' then '0-1' else '1-0' end, reason = 'resign', updated_at = now() where id = g.id;
  elsif p_action = 'offer_draw' then
    update public.games set draw_offer = p_player, updated_at = now() where id = g.id;
  elsif p_action = 'accept_draw' then
    if g.draw_offer is null or g.draw_offer = p_player then raise exception 'no draw offer to accept'; end if;
    update public.games set status = 'finished', result = '1/2-1/2', reason = 'agreement', draw_offer = null, updated_at = now() where id = g.id;
  else raise exception 'unknown action'; end if;
end $$;

revoke all on function public.owns_player(uuid), public.new_code(), public.enable_online(text, text, text), public.disable_online(uuid),
  public.new_friend_code(uuid), public.add_friend(uuid, text), public.answer_friend(uuid, uuid, boolean), public.friend_requests(uuid),
  public.remove_friend(uuid, uuid), public.can_play(uuid, uuid),
  public.my_opponents(uuid), public.challenge(uuid, uuid, text, text), public.answer_challenge(uuid, uuid, boolean),
  public.cancel_challenge(uuid, uuid), public.game_action(uuid, uuid, text, text) from public, anon;
grant execute on function public.owns_player(uuid), public.enable_online(text, text, text), public.disable_online(uuid),
  public.new_friend_code(uuid), public.add_friend(uuid, text), public.answer_friend(uuid, uuid, boolean), public.friend_requests(uuid),
  public.remove_friend(uuid, uuid), public.my_opponents(uuid), public.challenge(uuid, uuid, text, text), public.answer_challenge(uuid, uuid, boolean),
  public.cancel_challenge(uuid, uuid), public.game_action(uuid, uuid, text, text) to authenticated;

-- live updates for the two players (row-level security applies to realtime too)
alter publication supabase_realtime add table public.games, public.challenges;

-- applied as a second migration (online_play_internal_functions_private): Supabase grants execute to signed-in users by
-- default, so the two helpers used only inside the functions above are closed off explicitly
revoke execute on function public.can_play(uuid, uuid), public.new_code() from authenticated, anon, public;
