-- Premium feature persistence (Instant Income + Autopilot settings/completions)

create table if not exists public.user_premium_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  instant_income_niche text,
  instant_income_affiliate_url text,
  autopilot_promotion_url text,
  autopilot_selected_niche text default 'All',
  updated_at timestamptz not null default now()
);

create table if not exists public.user_autopilot_completions (
  user_id uuid not null references auth.users (id) on delete cascade,
  source_id text not null,
  completed_at timestamptz not null default now(),
  primary key (user_id, source_id)
);

alter table public.user_premium_settings enable row level security;
alter table public.user_autopilot_completions enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'user_premium_settings'
      and policyname = 'Users can view own premium settings'
  ) then
    create policy "Users can view own premium settings"
      on public.user_premium_settings for select
      using (auth.uid() = user_id);
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'user_premium_settings'
      and policyname = 'Users can insert own premium settings'
  ) then
    create policy "Users can insert own premium settings"
      on public.user_premium_settings for insert
      with check (auth.uid() = user_id);
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'user_premium_settings'
      and policyname = 'Users can update own premium settings'
  ) then
    create policy "Users can update own premium settings"
      on public.user_premium_settings for update
      using (auth.uid() = user_id);
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'user_autopilot_completions'
      and policyname = 'Users can view own autopilot completions'
  ) then
    create policy "Users can view own autopilot completions"
      on public.user_autopilot_completions for select
      using (auth.uid() = user_id);
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'user_autopilot_completions'
      and policyname = 'Users can insert own autopilot completions'
  ) then
    create policy "Users can insert own autopilot completions"
      on public.user_autopilot_completions for insert
      with check (auth.uid() = user_id);
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'user_autopilot_completions'
      and policyname = 'Users can update own autopilot completions'
  ) then
    create policy "Users can update own autopilot completions"
      on public.user_autopilot_completions for update
      using (auth.uid() = user_id);
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'user_autopilot_completions'
      and policyname = 'Users can delete own autopilot completions'
  ) then
    create policy "Users can delete own autopilot completions"
      on public.user_autopilot_completions for delete
      using (auth.uid() = user_id);
  end if;
end $$;

create index if not exists idx_user_autopilot_completions_user_id
  on public.user_autopilot_completions (user_id);
