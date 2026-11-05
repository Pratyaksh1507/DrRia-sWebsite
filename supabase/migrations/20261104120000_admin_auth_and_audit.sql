-- Dr Ria's Phase 1 Migration: Single-Admin Authentication & Audit Logging
-- Migration: 20261104_admin_auth_and_audit.sql
-- Description:
-- 1. Creates public.admin_users table strictly restricted to a single administrator row
-- 2. Creates/enhances public.audit_logs with admin_id and ip tracking
-- 3. Enables RLS on all tables with zero public/client policies (server/service-role only)

--------------------------------------------------------------------------------
-- 1. ADMIN USERS TABLE (Single-Admin Enforcement)
--------------------------------------------------------------------------------
create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  is_singleton boolean default true not null check (is_singleton),
  constraint admin_users_singleton unique (is_singleton),
  created_at timestamptz default now() not null
);

-- Database trigger to strictly prevent insertion of more than 1 admin user
create or replace function public.check_single_admin_user()
returns trigger as $$
begin
  if (select count(*) from public.admin_users) >= 1 then
    raise exception 'Configuration error: Only a single administrator account is permitted in Dr Rias platform.';
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists enforce_single_admin_user on public.admin_users;
create trigger enforce_single_admin_user
  before insert on public.admin_users
  for each row
  execute function public.check_single_admin_user();

-- Enable RLS: Strictly server-only via Supabase Service Role (admin client)
alter table public.admin_users enable row level security;
-- NOTE: Zero client policies are defined. anon and authenticated roles have NO direct access.

--------------------------------------------------------------------------------
-- 2. AUDIT LOGS TABLE
--------------------------------------------------------------------------------
create table if not exists public.audit_logs (
  id uuid default gen_random_uuid() primary key,
  admin_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text not null,
  old_value jsonb,
  new_value jsonb,
  ip text,
  created_at timestamptz default now() not null
);

-- Ensure admin_id and ip columns exist if audit_logs was previously created
alter table public.audit_logs
  add column if not exists admin_id uuid references auth.users(id) on delete set null,
  add column if not exists ip text;

-- Indices for rapid querying and security audit inspection
create index if not exists audit_logs_action_idx on public.audit_logs(action);
create index if not exists audit_logs_admin_id_idx on public.audit_logs(admin_id);
create index if not exists audit_logs_entity_idx on public.audit_logs(entity_type, entity_id);
create index if not exists audit_logs_created_at_idx on public.audit_logs(created_at desc);

-- Enable RLS: Strictly server-only via Supabase Service Role
alter table public.audit_logs enable row level security;
-- NOTE: Zero client policies. No direct client access.

--------------------------------------------------------------------------------
-- 3. APPEND-ONLY IMMUTABILITY TRIGGER & PERMISSIONS
--------------------------------------------------------------------------------
-- Database trigger strictly preventing ordinary UPDATE or DELETE on audit_logs.
-- Preserves audit history without claiming cryptographic tamper-evidence.
create or replace function public.prevent_audit_logs_mutation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  raise exception 'Security violation: audit_logs records are append-only and cannot be updated or deleted.';
  return null;
end;
$$;

drop trigger if exists enforce_append_only_audit_logs on public.audit_logs;
create trigger enforce_append_only_audit_logs
  before update or delete on public.audit_logs
  for each row
  execute function public.prevent_audit_logs_mutation();

-- Revoke mutation privileges from standard roles
revoke update, delete, truncate on public.audit_logs from public, anon, authenticated;

