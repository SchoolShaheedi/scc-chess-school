-- DRAFT — NOT APPLIED. Magical Chess with friends online (Stage 2 of 02_Design/POWER-CHESS-SPEC.md; plan in
-- 02_Design/MAGICAL-ONLINE-PLAN.md). Builds on online.sql + online_adults.sql. Nothing here may be applied to the
-- live project until the user says yes (house rule: confirm before any live Supabase change).
--
-- What changes:
--   * a challenge and a game carry a VARIANT: 'chess' (every game so far) or 'magical';
--   * a magical game has a SEED (the gems are drawn from it, so the app and the server see the same gems), the gems
--     on the board now (ORBS), and the plies at which a piece CHANGED into its gem's piece;
--   * magical games are never rated, and only friends and classmates can play them (the same can_play rule as now).
-- What does NOT change: who can play whom, the reactions-only rule (no chat), the clocks, resign/draw, and every
-- existing game (they all become variant 'chess' by the column default).

alter table public.challenges add column if not exists variant text not null default 'chess' check (variant in ('chess', 'magical'));
alter table public.games add column if not exists variant text not null default 'chess' check (variant in ('chess', 'magical'));
alter table public.games add column if not exists seed int;                               -- magical only: the gem draw's seed
alter table public.games add column if not exists orbs jsonb not null default '[]';        -- magical only: [{ sq, piece }]
alter table public.games add column if not exists changes int[] not null default '{}';    -- magical only: plies where a piece changed
-- a magical game is never rated (DECISIONS #98: unrated, practice only)
alter table public.games add constraint magical_unrated check (variant = 'chess' or not rated);

-- challenge(): the same as now, plus the variant. The old 4-argument version is dropped, not kept beside it: two
-- versions would make the live app's 4-argument call ambiguous. The default ('chess') keeps that call working.
drop function if exists public.challenge(uuid, uuid, text, text);
create or replace function public.challenge(p_player uuid, p_to uuid, p_tc text, p_colour text, p_variant text default 'chess') returns uuid
  language plpgsql security definer set search_path = public as $$
declare v uuid;
begin
  if not public.owns_player(p_player) then raise exception 'not your player'; end if;
  if not public.can_play(p_player, p_to) then raise exception 'you can only challenge friends and classmates'; end if;
  if p_variant not in ('chess', 'magical') then raise exception 'unknown game'; end if;
  update public.challenges set status = 'cancelled' where status = 'pending' and created_at < now() - interval '10 minutes';
  if exists (select 1 from public.challenges where from_player = p_player and to_player = p_to and status = 'pending') then raise exception 'already challenged'; end if;
  if (select count(*) from public.challenges where from_player = p_player and status = 'pending') >= 5 then raise exception 'too many open challenges'; end if;
  insert into public.challenges (from_player, to_player, tc, colour, variant) values (p_player, p_to, p_tc, p_colour, p_variant) returning id into v;
  return v;
end $$;

-- answer_challenge(): the same as now, plus the variant and, for a magical game, a fresh seed
create or replace function public.answer_challenge(p_player uuid, p_challenge uuid, p_accept boolean) returns uuid
  language plpgsql security definer set search_path = public as $$
declare c public.challenges; g uuid; w uuid; b uuid; mins int; inc int;
begin
  if not public.owns_player(p_player) then raise exception 'not your player'; end if;
  select * into c from public.challenges where id = p_challenge and to_player = p_player and status = 'pending' for update;
  if c.id is null or c.created_at < now() - interval '10 minutes' then raise exception 'that challenge has gone'; end if;
  if p_accept and not public.can_play(c.to_player, c.from_player) then
    update public.challenges set status = 'cancelled' where id = c.id; raise exception 'that challenge has gone';
  end if;
  if not p_accept then update public.challenges set status = 'declined' where id = c.id; return null; end if;
  if c.colour = 'w' or (c.colour = 'random' and random() < .5) then w := c.from_player; b := c.to_player; else w := c.to_player; b := c.from_player; end if;
  mins := case c.tc when '10' then 10 when '5' then 5 when '3+2' then 3 else 0 end;
  inc := case c.tc when '3+2' then 2 else 0 end;
  insert into public.games (white, black, tc_min, tc_inc, white_ms, black_ms, variant, seed)
    values (w, b, mins, inc, mins * 60000, mins * 60000, c.variant, case when c.variant = 'magical' then floor(random() * 2147483647)::int end)
    returning id into g;
  update public.challenges set status = 'accepted', game = g where id = c.id;
  return g;
end $$;

-- the new challenge() gets the same permissions the old one had: signed-in users only, never anonymous
revoke all on function public.challenge(uuid, uuid, text, text, text) from public, anon;
grant execute on function public.challenge(uuid, uuid, text, text, text) to authenticated;
