-- SCC Chess School: classes for teachers (DECISIONS #82). Safeguarding is enforced HERE, in the database,
-- not in the app: row-level security decides who can see what, whatever a modified app might try.
--
--   * Only emails the charity puts in public.teachers can create a class.
--   * A PARENT (the account holder) joins a child's profile to a class with the class code, after seeing what
--     will be shared, and can leave at any time; leaving deletes the teacher's view of that child.
--   * A teacher sees, for their own classes only: the child's animal + colour and a small summary (level,
--     lessons finished, tests passed, days practised this week). No names, emails, puzzles, games or ratings.
--   * No child's name is ever stored: a teacher's own labels for pupils live on the teacher's device.

-- 1. The allow-list. Managed by the charity in the Supabase dashboard; nobody can read or change it from the app.
create table if not exists public.teachers (
  email text primary key check (email = lower(email))
);
alter table public.teachers enable row level security;   -- no policies: invisible to app users

create or replace function public.is_teacher() returns boolean
  language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.teachers where email = lower(coalesce(auth.jwt() ->> 'email', '')));
$$;
revoke all on function public.is_teacher() from public, anon;
grant execute on function public.is_teacher() to authenticated;

-- 2. Classes. The code is what a parent types; 6 characters from an alphabet with no look-alikes.
create table if not exists public.classes (
  id         uuid primary key default gen_random_uuid(),
  teacher    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  code       text not null unique check (code ~ '^[A-HJ-NP-Z2-9]{6}$'),
  title      text not null check (char_length(title) between 1 and 40),
  homework   text check (homework is null or homework ~ '^[0-9]{1,2}\.[0-9]{1,2}$'),   -- a lesson id, e.g. 4.2
  created_at timestamptz not null default now()
);
alter table public.classes enable row level security;
create policy "teachers read own classes"   on public.classes for select to authenticated using (teacher = (select auth.uid()));
create policy "teachers create classes"     on public.classes for insert to authenticated with check (teacher = (select auth.uid()) and (select public.is_teacher()));
create policy "teachers update own classes" on public.classes for update to authenticated using (teacher = (select auth.uid())) with check (teacher = (select auth.uid()));
create policy "teachers delete own classes" on public.classes for delete to authenticated using (teacher = (select auth.uid()));

-- 3. Memberships: one child profile of one parent account in one class, with the shared summary.
create table if not exists public.memberships (
  class_id   uuid not null references public.classes (id) on delete cascade,
  parent     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  profile_id text not null check (char_length(profile_id) <= 24),
  avatar     text not null check (avatar in ('cat','dog','rabbit','bird','fish','turtle','squirrel','snail')),
  colour     text not null check (colour ~ '^#[0-9A-Fa-f]{6}$'),
  -- { level, lessons, lessonsWeek, tests, daysWeek }: five numbers and nothing else (any other key is refused)
  summary    jsonb not null default '{}'::jsonb check ((summary - array['level','lessons','lessonsWeek','tests','daysWeek']) = '{}'::jsonb),
  joined_at  timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (class_id, parent, profile_id)
);
alter table public.memberships enable row level security;
create policy "parents read own memberships"   on public.memberships for select to authenticated using (parent = (select auth.uid()));
create policy "parents update own summaries"   on public.memberships for update to authenticated using (parent = (select auth.uid())) with check (parent = (select auth.uid()));
create policy "parents leave classes"          on public.memberships for delete to authenticated using (parent = (select auth.uid()));
create policy "teachers read their pupils"     on public.memberships for select to authenticated
  using (exists (select 1 from public.classes c where c.id = class_id and c.teacher = (select auth.uid())));
create policy "teachers remove their pupils"   on public.memberships for delete to authenticated
  using (exists (select 1 from public.classes c where c.id = class_id and c.teacher = (select auth.uid())));
-- there is no insert policy: joining goes only through join_class(), which checks the code
-- a parent may change ONLY the summary: without this, editing class_id would join another class with no code
revoke update on public.memberships from authenticated, anon;
grant update (summary, updated_at) on public.memberships to authenticated;

-- 4. What a parent sees before agreeing: the class title, nothing about the teacher.
create or replace function public.class_preview(p_code text) returns table (title text)
  language sql stable security definer set search_path = public as $$
  select c.title from public.classes c where c.code = upper(p_code);
$$;

-- 5. Joining (by the parent, for one child profile).
create or replace function public.join_class(p_code text, p_profile text, p_avatar text, p_colour text) returns uuid
  language plpgsql security definer set search_path = public as $$
declare v_class uuid;
begin
  if auth.uid() is null then raise exception 'sign in first'; end if;
  select id into v_class from public.classes where code = upper(p_code);
  if v_class is null then raise exception 'no class with that code'; end if;
  insert into public.memberships (class_id, parent, profile_id, avatar, colour)
    values (v_class, auth.uid(), p_profile, p_avatar, p_colour)
    on conflict (class_id, parent, profile_id) do update set avatar = excluded.avatar, colour = excluded.colour;
  return v_class;
end $$;

-- 6. A parent's classes (with homework) for showing on the child's home screen.
create or replace function public.my_classes() returns table (class_id uuid, profile_id text, title text, homework text)
  language sql stable security definer set search_path = public as $$
  select m.class_id, m.profile_id, c.title, c.homework from public.memberships m join public.classes c on c.id = m.class_id
  where m.parent = auth.uid();
$$;

revoke all on function public.class_preview(text), public.join_class(text, text, text, text), public.my_classes() from public, anon;
grant execute on function public.class_preview(text), public.join_class(text, text, text, text), public.my_classes() to authenticated;
