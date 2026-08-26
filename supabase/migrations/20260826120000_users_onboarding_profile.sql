-- Member profile table for onboarding completion (and future profile fields).
-- Earlier migrations only ALTERed public.users IF it already existed.

create table if not exists public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  onboarding_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.users
  add column if not exists onboarding_completed_at timestamptz,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

create index if not exists users_onboarding_completed_at_idx
  on public.users (onboarding_completed_at);

alter table public.users enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'users'
      and policyname = 'Users can view own profile'
  ) then
    create policy "Users can view own profile"
      on public.users for select
      using (auth.uid() = id);
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'users'
      and policyname = 'Users can insert own profile'
  ) then
    create policy "Users can insert own profile"
      on public.users for insert
      with check (auth.uid() = id);
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'users'
      and policyname = 'Users can update own profile'
  ) then
    create policy "Users can update own profile"
      on public.users for update
      using (auth.uid() = id)
      with check (auth.uid() = id);
  end if;
end $$;
