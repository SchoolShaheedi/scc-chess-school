-- SCC Chess School: everything the app stores per account. APPLIED 2026-10-02 to project scc-chess-school
-- (ref bqcfdrbnavpsmpgvnitt, London) as migration progress_table_rls_delete_account.
-- The Supabase security advisor warns that signed-in users can run delete_my_account(): that is intended,
-- it only ever deletes the caller's own account (auth.uid()).
-- One row per account. Row-level security means each signed-in user can read and write ONLY
-- their own row; the public "anon" key can do nothing else (DECISIONS #37, #38).

create table if not exists public.progress (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  data       jsonb not null,                 -- { xp, streak, lessons } - no name, no age, nothing else
  updated_at timestamptz not null default now()
);

alter table public.progress enable row level security;

create policy "read own progress"   on public.progress for select to authenticated using ((select auth.uid()) = user_id);
create policy "insert own progress" on public.progress for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "update own progress" on public.progress for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "delete own progress" on public.progress for delete to authenticated using ((select auth.uid()) = user_id);

-- "Delete my account" in the app (right to erasure). Deleting the auth user cascades to progress.
create or replace function public.delete_my_account()
returns void language sql security definer set search_path = '' as $$
  delete from auth.users where id = (select auth.uid());
$$;
revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
