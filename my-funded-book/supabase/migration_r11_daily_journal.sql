create table if not exists public.daily_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  date date not null default current_date,
  mindset text,
  respected_plan boolean,
  lesson text,
  intention text,
  updated_at timestamptz not null default now(),
  unique (user_id, date)
);
alter table public.daily_reviews enable row level security;
drop policy if exists "daily_reviews_all_own" on public.daily_reviews;
create policy "daily_reviews_all_own" on public.daily_reviews for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index if not exists idx_daily_reviews_user_date on public.daily_reviews(user_id, date desc);
