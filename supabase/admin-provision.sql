-- =============================================================================
-- DR RIA'S E-COMMERCE PLATFORM — SINGLE ADMIN PROVISIONING SCRIPT
-- =============================================================================
-- RUN THIS SCRIPT ONCE IN YOUR SUPABASE SQL EDITOR TO PROVISION THE ADMIN USER.
--
-- INSTRUCTIONS:
-- 1. Ensure the administrator has signed up or been added in Supabase Auth:
--    Dashboard -> Authentication -> Users -> Add User (Create user with Email + Password).
-- 2. Confirm the administrator's email is verified (Auto-confirm email or click link).
-- 3. Replace 'admin@drrias.in' below with the actual admin email.
-- 4. Run this script in the Supabase SQL Editor.
--
-- SECURITY NOTICE:
-- The platform enforces a single administrator constraint at the database level.
-- There is no public registration or administrative elevation API.
-- =============================================================================

do $$
declare
  target_admin_email text := 'drrias.official@gmail.com'; -- DESIGNATED DOCTOR / ADMINISTRATOR EMAIL
  target_user_id uuid;
  target_confirmed_at timestamptz;
  existing_admin_id uuid;
begin
  -- 1. Locate the registered authentication record and confirm verification
  select id, email_confirmed_at into target_user_id, target_confirmed_at
  from auth.users
  where email = lower(trim(target_admin_email));

  if target_user_id is null then
    raise exception 'User with email "%" was not found in auth.users. Please create the user in Supabase Authentication before running this script.', target_admin_email;
  end if;

  if target_confirmed_at is null then
    raise exception 'User with email "%" has not confirmed their email address. Please verify or auto-confirm the user in Supabase Auth before provisioning.', target_admin_email;
  end if;

  -- 2. Check if another administrator is already provisioned
  select user_id into existing_admin_id
  from public.admin_users
  limit 1;

  if existing_admin_id is not null and existing_admin_id <> target_user_id then
    raise exception 'An administrator account already exists (ID: %). Only a single administrator is permitted. To replace the admin, remove the existing row first.', existing_admin_id;
  end if;

  -- 3. Insert or confirm the admin user
  insert into public.admin_users (user_id)
  values (target_user_id)
  on conflict (user_id) do nothing;

  -- 4. Record audit log
  insert into public.audit_logs (
    admin_id,
    action,
    entity_type,
    entity_id,
    new_value
  )
  values (
    target_user_id,
    'admin_provisioned',
    'admin_users',
    target_user_id::text,
    jsonb_build_object('email', target_admin_email, 'provisioned_at', now())
  );

  raise notice 'SUCCESS: Admin access provisioned for % (User ID: %). You may now sign in at /admin/login.', target_admin_email, target_user_id;
end $$;
