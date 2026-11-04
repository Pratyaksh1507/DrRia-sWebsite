-- Dr Ria's Audit Logs Table Migration
-- Migration: 20261104_audit_logs.sql
-- Description:
-- Adds public.audit_logs table for durable, tamper-evident recording of critical security,
-- payment discrepancies, and administrative actions (e.g. payment received on cancelled order).

create table if not exists public.audit_logs (
  id uuid default gen_random_uuid() primary key,
  action text not null,
  entity_type text not null,
  entity_id text not null,
  old_value jsonb,
  new_value jsonb,
  created_at timestamptz default now() not null
);

-- Indices for rapid audit queries and reporting
create index if not exists audit_logs_action_idx on public.audit_logs(action);
create index if not exists audit_logs_entity_idx on public.audit_logs(entity_type, entity_id);
create index if not exists audit_logs_created_at_idx on public.audit_logs(created_at desc);

-- Security: Enable Row Level Security (RLS)
alter table public.audit_logs enable row level security;

-- NOTE: No client policies are created. This table is strictly backend-only
-- and accessible solely via the Supabase Service Role key (admin client).
-- Direct client access through anon or authenticated roles is completely denied.

