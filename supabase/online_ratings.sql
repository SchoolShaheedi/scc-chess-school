-- SCC Chess School: online ratings v2 (bullet / blitz / rapid, Glicko-2) and the time controls. NOT YET APPLIED.
-- Apply FIRST (then online_matching.sql, then deploy the play-move function, then the app). Builds on online.sql,
-- online_adults.sql, magical_online.sql and simul.sql. The user's request (2026-11-03): "play online ... automatically
-- connect to a player, also online rating system, and play anyone", safety choice "Grown-ups only".
--
-- What this file does
--   * Time controls: 1+0, 2+1 (bullet) / 3+0, 3+2, 5+0 (blitz) / 10+0, 15+10, 30+0 (rapid). The category comes from the
--     base minutes (under 3 = bullet, under 10 = blitz, else rapid, as on chess.com). The old '10', '5', '3+2' still work.
--   * games_category_check now allows 'bullet'.
--   * Ratings move from Elo columns on online_players to Glicko-2 rows in player_ratings (rating, rd, volatility,
--     games). RD above 110 is "provisional" and the app shows a "?". Every rated game is also written to rating_history
--     (the graph, best rating and the history list). The old rapid_r / blitz_r columns stay but are no longer used.
--   * ONE trigger (rate_game) still rates every way a game can end. A game with fewer than 2 moves changes nothing.
--   * Two pools that never mix, enforced by a BEFORE INSERT guard on games: a rated game needs two players of the same
--     pool; grown-up rated games are stranger games only (adult friends play unrated); children's rated games are
--     friend/class games only; a "stranger" game can never include a child.
--   * Clock lag allowance: games get a small per-side quota (white_quota / black_quota) that play-move uses (bullet).
--   * delete_my_account() now finishes the caller's unfinished games first (they are lost, the opponent wins) instead
--     of leaving them active with an empty side.
-- Nothing here writes a chat column: still four fixed reactions only.

-- ---------- time controls ----------
create or replace function public.tc_valid(t text) returns boolean language sql immutable as $$
  select t = any (array['1+0','2+1','3+0','3+2','5+0','10+0','15+10','30+0','10','5']);
$$;
/** The one spelling of a clock: the legacy '10' and '5' become '10+0' and '5+0'; 'none' stays. */
create or replace function public.tc_norm(t text) returns text language sql immutable as $$
  select case t when '10' then '10+0' when '5' then '5+0' else t end;
$$;
create or replace function public.tc_mins(t text) returns int language sql immutable as $$
  select case when t = 'none' then 0 else split_part(public.tc_norm(t), '+', 1)::int end;
$$;
create or replace function public.tc_inc(t text) returns int language sql immutable as $$
  select case when t = 'none' then 0 else split_part(public.tc_norm(t), '+', 2)::int end;
$$;
create or replace function public.tc_category(mins int) returns text language sql immutable as $$
  select case when mins <= 0 then null when mins < 3 then 'bullet' when mins < 10 then 'blitz' else 'rapid' end;
$$;

alter table public.challenges drop constraint if exists challenges_tc_check;
alter table public.challenges add constraint challenges_tc_check check (tc = 'none' or public.tc_valid(tc));

-- ---------- games: bullet, kinds, lag quota, rating changes ----------
alter table public.games drop constraint if exists games_category_check;
alter table public.games add constraint games_category_check check (category in ('bullet', 'blitz', 'rapid'));
alter table public.games add column if not exists kind text not null default 'friend' check (kind in ('friend', 'stranger'));
alter table public.games add column if not exists via text not null default 'challenge' check (via in ('challenge', 'seek', 'rematch', 'simul'));
alter table public.games add column if not exists white_delta int;     -- the rating change, set by rate_game
alter table public.games add column if not exists black_delta int;
alter table public.games add column if not exists white_quota int not null default 1500;   -- ms of lag allowance left (play-move)
alter table public.games add column if not exists black_quota int not null default 1500;
-- the 18+ pairing games so far were stranger games from the pool
update public.games set kind = 'stranger', via = 'seek' where rated and simul_id is null;
update public.games set via = 'simul' where simul_id is not null;

-- ---------- Glicko-2 (Glickman, 2013). Rating scale: 173.7178; the maths below is the published algorithm ----------
create or replace function public.glicko2_f(x double precision, delta double precision, phi double precision, v double precision,
  a double precision, tau double precision) returns double precision language sql immutable as $$
  select exp(x) * (delta ^ 2 - phi ^ 2 - v - exp(x)) / (2 * (phi ^ 2 + v + exp(x)) ^ 2) - (x - a) / (tau ^ 2);
$$;

/** One rating period against any number of opponents (the app and the trigger use a period of one game).
 *  Opponents are given as parallel arrays: rating, RD, score (1 win, 0.5 draw, 0 loss). */
create or replace function public.glicko2_update(p_r double precision, p_rd double precision, p_vol double precision,
  p_opp_r double precision[], p_opp_rd double precision[], p_score double precision[], p_tau double precision default 0.75)
  returns table (r double precision, rd double precision, vol double precision)
  language plpgsql immutable set search_path = public as $$
declare
  q constant double precision := 173.7178;
  mu double precision := (p_r - 1500) / q; phi double precision := p_rd / q; sigma double precision := p_vol;
  n int := coalesce(array_length(p_opp_r, 1), 0); i int;
  v_inv double precision := 0; dsum double precision := 0; v double precision; delta double precision;
  gj double precision; ej double precision; muj double precision; phij double precision;
  a double precision; big_a double precision; big_b double precision; fa double precision; fb double precision; fc double precision;
  c double precision; k int := 1; guard int := 0; phi_star double precision; phi_new double precision; sigma_new double precision;
begin
  if n = 0 then
    -- no games: only the deviation grows
    return query select p_r, least(350, sqrt(phi ^ 2 + sigma ^ 2) * q), p_vol; return;
  end if;
  for i in 1 .. n loop
    muj := (p_opp_r[i] - 1500) / q; phij := p_opp_rd[i] / q;
    gj := 1 / sqrt(1 + 3 * phij ^ 2 / pi() ^ 2);
    ej := 1 / (1 + exp(-gj * (mu - muj)));
    v_inv := v_inv + gj ^ 2 * ej * (1 - ej);
    dsum := dsum + gj * (p_score[i] - ej);
  end loop;
  v := 1 / v_inv; delta := v * dsum;
  a := ln(sigma ^ 2); big_a := a;
  if delta ^ 2 > phi ^ 2 + v then big_b := ln(delta ^ 2 - phi ^ 2 - v);
  else
    while public.glicko2_f(a - k * p_tau, delta, phi, v, a, p_tau) < 0 and k < 100 loop k := k + 1; end loop;
    big_b := a - k * p_tau;
  end if;
  fa := public.glicko2_f(big_a, delta, phi, v, a, p_tau); fb := public.glicko2_f(big_b, delta, phi, v, a, p_tau);
  while abs(big_b - big_a) > 0.000001 and guard < 100 loop
    c := big_a + (big_a - big_b) * fa / (fb - fa);
    fc := public.glicko2_f(c, delta, phi, v, a, p_tau);
    if fc * fb < 0 then big_a := big_b; fa := fb; else fa := fa / 2; end if;
    big_b := c; fb := fc; guard := guard + 1;
  end loop;
  sigma_new := exp(big_a / 2);
  phi_star := sqrt(phi ^ 2 + sigma_new ^ 2);
  phi_new := 1 / sqrt(1 / phi_star ^ 2 + 1 / v);
  return query select q * (mu + phi_new ^ 2 * dsum) + 1500, phi_new * q, sigma_new;
end $$;

/** RD grown for the time a player was away (Lichess's 0.21436 rating periods a day), capped at 350. */
create or replace function public.glicko2_decay(p_rd double precision, p_vol double precision, p_days double precision)
  returns double precision language sql immutable as $$
  select least(350, sqrt(p_rd ^ 2 + (173.7178 * p_vol) ^ 2 * greatest(0, p_days) * 0.21436));
$$;

-- ---------- the rating rows ----------
create table if not exists public.player_ratings (
  player   uuid not null references public.online_players (id) on delete cascade,
  category text not null check (category in ('bullet', 'blitz', 'rapid')),
  rating   double precision not null default 1200,
  rd       double precision not null default 350,
  vol      double precision not null default 0.06,
  games    int not null default 0,
  primary key (player, category)
);
alter table public.player_ratings enable row level security;
-- the owner reads their own rows; nobody writes except rate_game() / the migration
create policy "players read own ratings" on public.player_ratings for select to authenticated using (public.owns_player(player));
revoke all on table public.player_ratings from anon;
revoke insert, update, delete on table public.player_ratings from authenticated;

-- the Elo ratings so far carry over: same rating, and an RD that shrinks with the games already played
insert into public.player_ratings (player, category, rating, rd, vol, games)
  select id, 'rapid', rapid_r, greatest(80, 350 - 14 * rapid_n), 0.06, rapid_n from public.online_players where rapid_n > 0
  on conflict do nothing;
insert into public.player_ratings (player, category, rating, rd, vol, games)
  select id, 'blitz', blitz_r, greatest(80, 350 - 14 * blitz_n), 0.06, blitz_n from public.online_players where blitz_n > 0
  on conflict do nothing;

create table if not exists public.rating_history (
  id         bigint generated always as identity primary key,
  player     uuid not null references public.online_players (id) on delete cascade,
  game       uuid references public.games (id) on delete set null,   -- null: the starting point carried over from the Elo ratings
  category   text not null check (category in ('bullet', 'blitz', 'rapid')),
  rating     double precision not null,                              -- AFTER the game
  delta      int not null default 0,
  result     text check (result in ('w', 'd', 'l')),
  opponent   uuid references public.online_players (id) on delete set null,
  opp_rating int,
  created_at timestamptz not null default now()
);
create index if not exists rating_history_player on public.rating_history (player, category, created_at desc);
alter table public.rating_history enable row level security;   -- no policies: read only through rating_history_for() / rating_summary()
revoke all on table public.rating_history from anon, authenticated;
insert into public.rating_history (player, game, category, rating, delta, result)
  select player, null, category, rating, 0, null from public.player_ratings;

/** The rating of one player for one category (1200 if they have no rows yet). Internal. */
create or replace function public.rating_of(p_player uuid, p_category text) returns double precision
  language sql stable security definer set search_path = public as $$
  select coalesce((select rating from public.player_ratings where player = p_player and category = p_category), 1200);
$$;

-- ---------- the two pools that never mix: a guard on every new game ----------
create or replace function public.games_guard() returns trigger
  language plpgsql security definer set search_path = public as $$
declare w public.online_players; b public.online_players;
begin
  if new.rated or new.kind = 'stranger' then
    select * into w from public.online_players where id = new.white;
    select * into b from public.online_players where id = new.black;
    if w.id is null or b.id is null then raise exception 'a rated or stranger game needs two players'; end if;
    if w.adult <> b.adult then raise exception 'grown-ups and children never play each other'; end if;
    if new.kind = 'stranger' and (not w.adult or w.paused or b.paused) then raise exception 'strangers are grown-ups only'; end if;
    if new.rated then
      if new.category is null or new.tc_min <= 0 or new.variant <> 'chess' or new.simul_id is not null then
        raise exception 'only timed, plain-chess games are rated';
      end if;
      if w.adult and new.kind <> 'stranger' then raise exception 'grown-up rated games are stranger games only'; end if;
      if not w.adult and new.kind <> 'friend' then raise exception 'children''s rated games are friends and classmates only'; end if;
    end if;
  end if;
  return new;
end $$;
drop trigger if exists games_guard on public.games;
create trigger games_guard before insert on public.games for each row execute function public.games_guard();

-- ---------- rating a finished game: Glicko-2, a rating period of one game ----------
create or replace function public.rate_game() returns trigger
  language plpgsql security definer set search_path = public as $$
declare
  rw public.player_ratings; rb public.player_ratings; sw double precision; lw timestamptz; lb timestamptz;
  rdw double precision; rdb double precision; nw record; nb record; dw int; db int;
begin
  if not new.rated or new.status <> 'finished' or old.status = 'finished' or new.result is null or new.category is null then return new; end if;
  -- a game that ends before both sides have moved changes nobody's rating
  if coalesce(array_length(new.moves, 1), 0) < 2 then return new; end if;
  if new.white is null or new.black is null then return new; end if;
  insert into public.player_ratings (player, category) values (new.white, new.category), (new.black, new.category) on conflict do nothing;
  perform 1 from public.player_ratings where player in (new.white, new.black) and category = new.category order by player for update;
  select * into rw from public.player_ratings where player = new.white and category = new.category;
  select * into rb from public.player_ratings where player = new.black and category = new.category;
  select max(created_at) into lw from public.rating_history where player = new.white and category = new.category;
  select max(created_at) into lb from public.rating_history where player = new.black and category = new.category;
  rdw := case when lw is null then rw.rd else public.glicko2_decay(rw.rd, rw.vol, extract(epoch from now() - lw) / 86400) end;
  rdb := case when lb is null then rb.rd else public.glicko2_decay(rb.rd, rb.vol, extract(epoch from now() - lb) / 86400) end;
  sw := case new.result when '1-0' then 1 when '0-1' then 0 else 0.5 end;
  select * into nw from public.glicko2_update(rw.rating, rdw, rw.vol, array[rb.rating], array[rdb], array[sw]);
  select * into nb from public.glicko2_update(rb.rating, rdb, rb.vol, array[rw.rating], array[rdw], array[1 - sw]);
  -- bounds, as on Lichess: a rating never below 100, a deviation never below 45
  nw.r := least(4000, greatest(100, nw.r)); nb.r := least(4000, greatest(100, nb.r));
  nw.rd := least(350, greatest(45, nw.rd)); nb.rd := least(350, greatest(45, nb.rd));
  nw.vol := least(0.1, greatest(0.01, nw.vol)); nb.vol := least(0.1, greatest(0.01, nb.vol));
  dw := round(nw.r)::int - round(rw.rating)::int; db := round(nb.r)::int - round(rb.rating)::int;
  update public.player_ratings set rating = nw.r, rd = nw.rd, vol = nw.vol, games = games + 1 where player = new.white and category = new.category;
  update public.player_ratings set rating = nb.r, rd = nb.rd, vol = nb.vol, games = games + 1 where player = new.black and category = new.category;
  insert into public.rating_history (player, game, category, rating, delta, result, opponent, opp_rating) values
    (new.white, new.id, new.category, nw.r, dw, case new.result when '1-0' then 'w' when '0-1' then 'l' else 'd' end, new.black, round(rb.rating)::int),
    (new.black, new.id, new.category, nb.r, db, case new.result when '0-1' then 'w' when '1-0' then 'l' else 'd' end, new.white, round(rw.rating)::int);
  -- this UPDATE does not touch status, so it does not run this trigger again
  update public.games set white_delta = dw, black_delta = db where id = new.id;
  return new;
end $$;
drop trigger if exists rate_game on public.games;
create trigger rate_game after update of status on public.games for each row execute function public.rate_game();

-- ---------- what a player may read ----------
/** My ratings, win/draw/loss counts and best rating for all three speeds. Only for my own player. */
create or replace function public.rating_summary(p_player uuid)
  returns table (category text, rating int, provisional boolean, games int, wins int, draws int, losses int, best int)
  language plpgsql stable security definer set search_path = public as $$
begin
  if not public.owns_player(p_player) then raise exception 'not your player'; end if;
  return query
  select c.cat, round(coalesce(pr.rating, 1200))::int, coalesce(pr.rd, 350) > 110, coalesce(pr.games, 0),
    (select count(*) from public.games g where g.rated and g.category = c.cat and g.status = 'finished' and coalesce(array_length(g.moves, 1), 0) >= 2
       and ((g.white = p_player and g.result = '1-0') or (g.black = p_player and g.result = '0-1')))::int,
    (select count(*) from public.games g where g.rated and g.category = c.cat and g.status = 'finished' and coalesce(array_length(g.moves, 1), 0) >= 2
       and (g.white = p_player or g.black = p_player) and g.result = '1/2-1/2')::int,
    (select count(*) from public.games g where g.rated and g.category = c.cat and g.status = 'finished' and coalesce(array_length(g.moves, 1), 0) >= 2
       and ((g.white = p_player and g.result = '0-1') or (g.black = p_player and g.result = '1-0')))::int,
    greatest(round(coalesce((select max(h.rating) from public.rating_history h where h.player = p_player and h.category = c.cat), 1200))::int,
             round(coalesce(pr.rating, 1200))::int)
  from (values ('bullet'), ('blitz'), ('rapid')) as c(cat)
  left join public.player_ratings pr on pr.player = p_player and pr.category = c.cat
  order by case c.cat when 'bullet' then 1 when 'blitz' then 2 else 3 end;
end $$;

/** My rated games for one speed, newest first (the graph and the history list): the opponent as animal + colour + rating only. */
create or replace function public.rating_history_for(p_player uuid, p_category text, p_limit int default 100)
  returns table (game uuid, at timestamptz, rating int, delta int, result text, opp_avatar text, opp_colour text, opp_rating int, side text, reason text, moves int)
  language plpgsql stable security definer set search_path = public as $$
begin
  if not public.owns_player(p_player) then raise exception 'not your player'; end if;
  if p_category not in ('bullet', 'blitz', 'rapid') then raise exception 'unknown category'; end if;
  return query
  select h.game, h.created_at, round(h.rating)::int, h.delta, h.result, o.avatar, o.colour, h.opp_rating,
    case when g.white = p_player then 'w' when g.black = p_player then 'b' end, g.reason, coalesce(array_length(g.moves, 1), 0)
  from public.rating_history h
  left join public.online_players o on o.id = h.opponent
  left join public.games g on g.id = h.game
  where h.player = p_player and h.category = p_category
  order by h.created_at desc, h.id desc limit least(greatest(p_limit, 1), 200);
end $$;

/** The two sides of one of MY games: animal, colour, rating for the game's speed, and whether it is still provisional. */
drop function if exists public.game_players(uuid);
create or replace function public.game_players(p_game uuid)
  returns table (side text, player uuid, avatar text, colour text, rating int, provisional boolean)
  language plpgsql stable security definer set search_path = public as $$
declare g public.games;
begin
  select * into g from public.games where id = p_game;
  if g.id is null or not (public.owns_player(g.white) or public.owns_player(g.black)) then raise exception 'not your game'; end if;
  return query select x.side, o.id, o.avatar, o.colour,
      case when g.category is null then null else round(coalesce(pr.rating, 1200))::int end,
      case when g.category is null then null else coalesce(pr.rd, 350) > 110 end
    from (values ('w', g.white), ('b', g.black)) as x(side, id)
    left join public.online_players o on o.id = x.id
    left join public.player_ratings pr on pr.player = x.id and pr.category = g.category;
end $$;

/** The grown-up ladder, per speed (bullet, blitz, rapid): the top 50 grown-ups with at least 5 rated games, plus the caller's own place. */
drop function if exists public.adult_ladder(uuid, text);
create or replace function public.adult_ladder(p_player uuid, p_category text)
  returns table (place int, avatar text, colour text, rating int, games int, me boolean, provisional boolean)
  language plpgsql stable security definer set search_path = public as $$
begin
  if not public.owns_player(p_player) or not exists (select 1 from public.online_players where id = p_player and adult and not paused) then
    raise exception 'the ladder is for grown-up players only';
  end if;
  if p_category not in ('bullet', 'blitz', 'rapid') then raise exception 'unknown category'; end if;
  return query
  with ranked as (
    select o.id, o.avatar, o.colour, pr.rating as r, pr.games as n, pr.rd as d
    from public.online_players o join public.player_ratings pr on pr.player = o.id and pr.category = p_category
    where o.adult and not o.paused),
  placed as (select k.*, (row_number() over (order by k.r desc, k.n desc))::int as pl from ranked k where k.n >= 5)
  select x.pl, x.avatar, x.colour, round(x.r)::int, x.n, x.id = p_player, x.d > 110 from placed x where x.pl <= 50 or x.id = p_player order by x.pl;
end $$;

-- ---------- deleting an account finishes its unfinished games first ----------
-- (online_players is deleted with the account and games.white/black are then set null: the game would stay 'active'
-- with an empty side for ever.) The opponent wins; a game with fewer than 2 moves is rated by nobody (rate_game).
create or replace function public.delete_my_account() returns void
  language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'sign in first'; end if;
  update public.games g set status = 'finished', reason = 'abandoned', updated_at = now(), draw_offer = null,
    result = case when g.white in (select id from public.online_players where parent = auth.uid()) then '0-1' else '1-0' end
    where g.status = 'active'
      and (g.white in (select id from public.online_players where parent = auth.uid())
        or g.black in (select id from public.online_players where parent = auth.uid()));
  delete from auth.users where id = auth.uid();
end $$;
revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;

-- ---------- permissions ----------
-- internal helpers: callable only from inside the functions above and in online_matching.sql
revoke all on function public.tc_valid(text), public.tc_norm(text), public.tc_mins(text), public.tc_inc(text), public.tc_category(int),
  public.glicko2_f(double precision, double precision, double precision, double precision, double precision, double precision),
  public.glicko2_update(double precision, double precision, double precision, double precision[], double precision[], double precision[], double precision),
  public.glicko2_decay(double precision, double precision, double precision),
  public.rating_of(uuid, text), public.games_guard(), public.rate_game() from public, anon, authenticated;
-- what a signed-in user may call (each checks that the caller owns the player they ask about)
revoke all on function public.rating_summary(uuid), public.rating_history_for(uuid, text, int), public.game_players(uuid),
  public.adult_ladder(uuid, text) from public, anon, authenticated;
grant execute on function public.rating_summary(uuid), public.rating_history_for(uuid, text, int), public.game_players(uuid),
  public.adult_ladder(uuid, text) to authenticated;
