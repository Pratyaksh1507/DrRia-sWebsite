-- Migration: 20261103_carts_table.sql
-- Server-side carts table for authenticated users

--------------------------------------------------------------------------------
-- CARTS TABLE
--------------------------------------------------------------------------------
create table if not exists public.carts (
  user_id uuid references auth.users on delete cascade primary key,
  items jsonb not null default '[]'::jsonb,
  updated_at timestamptz default now() not null
);

alter table public.carts enable row level security;

-- Row Level Security Policies (users can only access their own cart)
create policy "Users can read own cart"
  on public.carts
  for select
  using (auth.uid() = user_id);

create policy "Users can insert own cart"
  on public.carts
  for insert
  with check (auth.uid() = user_id);

create policy "Users can update own cart"
  on public.carts
  for update
  using (auth.uid() = user_id);

create policy "Users can delete own cart"
  on public.carts
  for delete
  using (auth.uid() = user_id);

-- Automated updated_at timestamp trigger
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger handle_cart_updated_at
  before update on public.carts
  for each row
  execute function public.handle_updated_at();
