-- Migration: 20261120000000_customer_reviews_and_ratings.sql
-- Description:
-- 1. Creates public.product_reviews and public.review_helpful_votes tables.
-- 2. Sets up performance indexes and Row Level Security (RLS) policies.
-- 3. Hardens table-level privilege grants (least privilege principle).
-- 4. Establishes atomic rating and review count recalculation trigger with advisory locking.

--------------------------------------------------------------------------------
-- 1. PRODUCT REVIEWS TABLE
--------------------------------------------------------------------------------
create table if not exists public.product_reviews (
  id uuid default gen_random_uuid() primary key,
  product_id uuid not null references public.products(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  order_id text references public.orders(id) on delete set null,

  -- Ratings & Review Content
  rating smallint not null check (rating >= 1 and rating <= 5),
  headline text not null check (char_length(trim(headline)) between 2 and 120),
  comment text not null check (char_length(trim(comment)) between 10 and 2000),
  customer_name text not null check (char_length(trim(customer_name)) >= 2),

  -- Skincare Categorization
  skin_type text check (skin_type in ('dry', 'oily', 'combination', 'sensitive', 'normal')),
  verified_buyer boolean not null default false,

  -- Moderation Lifecycle
  status text not null default 'approved' check (status in ('pending', 'approved', 'rejected')),
  is_featured boolean not null default false,
  helpful_count integer not null default 0 check (helpful_count >= 0),

  -- Doctor Clinical Reply Feature
  admin_response text check (admin_response is null or char_length(admin_response) <= 1000),
  admin_responded_at timestamptz,

  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,

  -- Enforces one review per customer per product (allowing edits/updates)
  constraint unique_customer_product_review unique (product_id, user_id)
);

--------------------------------------------------------------------------------
-- 2. HELPFUL VOTES TABLE (Deduplication)
--------------------------------------------------------------------------------
create table if not exists public.review_helpful_votes (
  id uuid default gen_random_uuid() primary key,
  review_id uuid not null references public.product_reviews(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  ip_address text,
  created_at timestamptz default now() not null,
  constraint unique_user_review_vote unique (review_id, user_id)
);

--------------------------------------------------------------------------------
-- 3. HIGH-PERFORMANCE COMPOUND & PARTIAL INDEXES
--------------------------------------------------------------------------------
create index if not exists idx_reviews_product_approved 
  on public.product_reviews(product_id, status, created_at desc);

create index if not exists idx_reviews_user_lookup 
  on public.product_reviews(user_id);

create index if not exists idx_reviews_rating_breakdown 
  on public.product_reviews(product_id, rating) 
  where status = 'approved';

create index if not exists idx_helpful_votes_review 
  on public.review_helpful_votes(review_id);

--------------------------------------------------------------------------------
-- 4. ROW LEVEL SECURITY (RLS) POLICIES
--------------------------------------------------------------------------------
alter table public.product_reviews enable row level security;
alter table public.review_helpful_votes enable row level security;

-- Drop existing policies if re-running
drop policy if exists "Public can read approved reviews or own pending" on public.product_reviews;
drop policy if exists "Authenticated customers can insert reviews" on public.product_reviews;
drop policy if exists "Customers can update own reviews" on public.product_reviews;
drop policy if exists "Anyone can read helpful votes" on public.review_helpful_votes;
drop policy if exists "Authenticated users can vote helpful" on public.review_helpful_votes;

-- Public can read approved reviews, and customers can see their own submitted review
create policy "Public can read approved reviews or own pending"
  on public.product_reviews
  for select
  using (status = 'approved' or ((select auth.uid()) is not null and (select auth.uid()) = user_id));

-- Authenticated customers can insert their own reviews
create policy "Authenticated customers can insert reviews"
  on public.product_reviews
  for insert
  with check ((select auth.uid()) = user_id);

-- Customers can update their own reviews
create policy "Customers can update own reviews"
  on public.product_reviews
  for update
  using ((select auth.uid()) = user_id);

-- Anyone can read helpful votes (aggregate count display)
create policy "Anyone can read helpful votes"
  on public.review_helpful_votes
  for select
  using (true);

-- Authenticated users can cast a helpful vote
create policy "Authenticated users can vote helpful"
  on public.review_helpful_votes
  for insert
  with check ((select auth.uid()) = user_id);

--------------------------------------------------------------------------------
-- 5. TABLE PRIVILEGE HARDENING (Least Privilege Principle)
--------------------------------------------------------------------------------
revoke all on table public.product_reviews from anon, authenticated, public;
grant select on table public.product_reviews to anon, authenticated;
grant insert, update on table public.product_reviews to authenticated;
grant all on table public.product_reviews to service_role, postgres;

revoke all on table public.review_helpful_votes from anon, authenticated, public;
grant select on table public.review_helpful_votes to anon, authenticated;
grant insert on table public.review_helpful_votes to authenticated;
grant all on table public.review_helpful_votes to service_role, postgres;

--------------------------------------------------------------------------------
-- 6. ATOMIC RATING & COUNT AGGREGATION TRIGGER (Advisory Locking)
--------------------------------------------------------------------------------
create or replace function public.sync_product_rating_and_count()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_id uuid;
  calc_rating numeric(3, 2);
  calc_count integer;
begin
  target_id := coalesce(new.product_id, old.product_id);

  -- Use transaction-level advisory lock to serialize updates per product and prevent deadlocks
  perform pg_advisory_xact_lock(hashtext('product_review_sync_' || target_id::text));

  select 
    coalesce(round(avg(rating)::numeric, 2), 5.00),
    count(*)
  into calc_rating, calc_count
  from public.product_reviews
  where product_id = target_id
    and status = 'approved';

  update public.products
  set rating = calc_rating,
      reviews_count = calc_count,
      updated_at = now()
  where id = target_id;

  return null;
end;
$$;

drop trigger if exists trg_sync_product_reviews on public.product_reviews;
create trigger trg_sync_product_reviews
after insert or update or delete on public.product_reviews
for each row execute function public.sync_product_rating_and_count();
