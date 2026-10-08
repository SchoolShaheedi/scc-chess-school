-- SCC Chess School: class leaderboards and the grown-up rating ladder (DECISIONS #89). APPLIED 2026-10-08 as migration
-- community_leaderboards_ladder, after a security review and live checks.
-- Builds on classes.sql and online_adults.sql. The rules that protect children are HERE:
--
--   * A child appears to CLASSMATES only if their parent has switched "show on the class leaderboard" on for that
--     class (memberships.on_board, off by default, changed only through set_on_board()). A child always sees their
--     own row. Teachers already see every pupil's summary (classes.sql); nothing changes for them.
--   * A classmate is shown ONLY as an animal, a colour and this week's practice numbers. No ids leave the database.
--   * The week runs Monday to Sunday (UK time). A summary from an earlier week counts as zero, so the board resets.
--   * The grown-up ladder can be read ONLY by a grown-up player (online_adults.sql); a child's account can't call it.

-- the weekly numbers join the summary; still numbers only, and still nothing else is accepted
alter table public.memberships drop constraint if exists memberships_summary_check;
alter table public.memberships add constraint memberships_summary_check check (
  (summary - array['level','lessons','lessonsWeek','tests','daysWeek','weekOf','wkDays','wkLessons','wkPuzzles']) = '{}'::jsonb);
-- the weekly numbers come from the family's app: only whole numbers in a sensible range are accepted, so a bad value
-- can't break the board for the whole class, and an inflated one can only go so far
alter table public.memberships drop constraint if exists memberships_week_numbers_check;
alter table public.memberships add constraint memberships_week_numbers_check check (
  (summary->'weekOf' is null or (jsonb_typeof(summary->'weekOf') = 'number' and (summary->>'weekOf') ~ '^20[0-9]{6}$'))
  and (summary->'wkDays' is null or (jsonb_typeof(summary->'wkDays') = 'number' and (summary->>'wkDays') ~ '^[0-7]$'))
  and (summary->'wkLessons' is null or (jsonb_typeof(summary->'wkLessons') = 'number' and (summary->>'wkLessons') ~ '^[0-9]{1,2}$'))
  and (summary->'wkPuzzles' is null or (jsonb_typeof(summary->'wkPuzzles') = 'number' and (summary->>'wkPuzzles') ~ '^[0-9]{1,3}$')));
alter table public.memberships add column if not exists on_board boolean not null default false;

/** The parent shows (or hides) one child on one class's leaderboard. */
create or replace function public.set_on_board(p_class uuid, p_profile text, p_on boolean) returns void
  language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'sign in first'; end if;
  update public.memberships set on_board = p_on where class_id = p_class and parent = auth.uid() and profile_id = p_profile;
  if not found then raise exception 'not your child in that class'; end if;
end $$;

/** This week's class leaderboard, as one child of the caller sees it: classmates whose parents agreed, plus that child.
 *  Points: 10 a day practised, 5 a lesson, 1 a puzzle (at most 50 a week), so effort wins, not starting level. */
create or replace function public.class_leaderboard(p_class uuid, p_profile text)
  returns table (avatar text, colour text, days int, lessons int, puzzles int, points int, me boolean)
  language plpgsql stable security definer set search_path = public as $$
declare wk int := to_char(date_trunc('week', now() at time zone 'Europe/London'), 'YYYYMMDD')::int;
begin
  if not exists (select 1 from public.memberships where class_id = p_class and parent = auth.uid() and profile_id = p_profile) then
    raise exception 'not your child in that class';
  end if;
  return query
  with board as (
    select m.avatar, m.colour, (m.parent = auth.uid() and m.profile_id = p_profile) as is_me,
      -- capped as well as validated: a family that edits its own numbers can't run away with the board
      case when (m.summary->>'weekOf')::int = wk then least(7, coalesce((m.summary->>'wkDays')::int, 0)) else 0 end as d,
      case when (m.summary->>'weekOf')::int = wk then least(20, coalesce((m.summary->>'wkLessons')::int, 0)) else 0 end as l,
      case when (m.summary->>'weekOf')::int = wk then least(50, coalesce((m.summary->>'wkPuzzles')::int, 0)) else 0 end as p
    from public.memberships m
    where m.class_id = p_class and (m.on_board or (m.parent = auth.uid() and m.profile_id = p_profile)))
  select r.avatar, r.colour, r.d, r.l, r.p, r.d * 10 + r.l * 5 + r.p, r.is_me from board r
  order by r.d * 10 + r.l * 5 + r.p desc, r.d desc;
end $$;

/** The grown-up ladder for one clock speed: the top 50 grown-ups with at least 5 rated games, plus the caller's own
 *  place. Only a grown-up player may read it. */
create or replace function public.adult_ladder(p_player uuid, p_category text)
  returns table (place int, avatar text, colour text, rating int, games int, me boolean)
  language plpgsql stable security definer set search_path = public as $$
begin
  if not public.owns_player(p_player) or not exists (select 1 from public.online_players where id = p_player and adult and not paused) then
    raise exception 'the ladder is for grown-up players only';
  end if;
  if p_category not in ('rapid', 'blitz') then raise exception 'unknown category'; end if;
  return query
  with ranked as (
    select o.id, o.avatar, o.colour,
      case p_category when 'rapid' then o.rapid_r else o.blitz_r end as r,
      case p_category when 'rapid' then o.rapid_n else o.blitz_n end as n
    from public.online_players o where o.adult and not o.paused),
  placed as (select k.*, (row_number() over (order by k.r desc, k.n desc))::int as pl from ranked k where k.n >= 5)
  select x.pl, x.avatar, x.colour, x.r, x.n, x.id = p_player from placed x where x.pl <= 50 or x.id = p_player order by x.pl;
end $$;

revoke all on function public.set_on_board(uuid, text, boolean), public.class_leaderboard(uuid, text), public.adult_ladder(uuid, text)
  from public, anon, authenticated;
grant execute on function public.set_on_board(uuid, text, boolean), public.class_leaderboard(uuid, text), public.adult_ladder(uuid, text)
  to authenticated;
