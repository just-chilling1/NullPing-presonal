-- Training video completion tracking

create table if not exists public.user_training_completions (
  user_id uuid not null references auth.users (id) on delete cascade,
  video_id text not null,
  completed_at timestamptz not null default now(),
  primary key (user_id, video_id)
);

alter table public.user_training_completions enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'user_training_completions'
      and policyname = 'Users can view own training completions'
  ) then
    create policy "Users can view own training completions"
      on public.user_training_completions for select
      using (auth.uid() = user_id);
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'user_training_completions'
      and policyname = 'Users can insert own training completions'
  ) then
    create policy "Users can insert own training completions"
      on public.user_training_completions for insert
      with check (auth.uid() = user_id);
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'user_training_completions'
      and policyname = 'Users can delete own training completions'
  ) then
    create policy "Users can delete own training completions"
      on public.user_training_completions for delete
      using (auth.uid() = user_id);
  end if;
end $$;

create index if not exists idx_user_training_completions_user_id
  on public.user_training_completions (user_id);
