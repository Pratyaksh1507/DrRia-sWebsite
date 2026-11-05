import { notFound, redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import type { User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export {
  ADMIN_SESSION_TIMEOUT_MS,
  ADMIN_LAST_ACTIVITY_COOKIE,
  ADMIN_MFA_VERIFIED_COOKIE,
  type AdminAuthCheckResult,
  evaluateAdminSession,
} from './admin-evaluator';
import {
  ADMIN_SESSION_TIMEOUT_MS,
  ADMIN_LAST_ACTIVITY_COOKIE,
  ADMIN_MFA_VERIFIED_COOKIE,
} from './admin-evaluator';

/**
 * Server Component / Page Guard:
 * Strictly gates /admin/* pages. Non-admins receive an immediate 404 notFound().
 * Returns the authenticated admin user or redirects to MFA/login.
 */
export async function requireAdmin(): Promise<User> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/admin/login');
  }

  // Confirm membership in public.admin_users
  let isAdminUser = false;
  try {
    const { queryDb } = await import('./db');
    const res = await queryDb(
      'SELECT user_id FROM public.admin_users WHERE user_id = $1 LIMIT 1;',
      [user.id]
    );
    isAdminUser = res.rows.length > 0;
  } catch {
    const adminSupabase = createAdminClient();
    const { data: adminRecord } = await adminSupabase
      .from('admin_users')
      .select('user_id')
      .eq('user_id', user.id)
      .maybeSingle();
    isAdminUser = Boolean(adminRecord);
  }

  // Return 404 for non-admins so customers never know the admin area exists
  if (!isAdminUser) {
    notFound();
  }

  // Verify MFA Assurance Level
  const { data: mfaData, error: mfaError } =
    await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

  const currentAal = (mfaData?.currentLevel as 'aal1' | 'aal2') || 'aal1';
  const nextAal = (mfaData?.nextLevel as 'aal1' | 'aal2') || 'aal1';

  if (mfaError || currentAal !== 'aal2') {
    if (nextAal === 'aal1') {
      redirect('/admin/mfa/enroll');
    }
    redirect('/admin/mfa/challenge');
  }

  // Inactivity timeout check (30 minutes)
  const cookieStore = await cookies();
  const lastActivityStr = cookieStore.get(ADMIN_LAST_ACTIVITY_COOKIE)?.value;
  const lastActivity = lastActivityStr ? parseInt(lastActivityStr, 10) : Date.now();

  if (Date.now() - lastActivity > ADMIN_SESSION_TIMEOUT_MS) {
    redirect('/admin/login?error=session_timeout');
  }

  return user;
}

/**
 * API Route Handler Guard:
 * Call at the top of every admin Route Handler.
 * Returns evaluated result with exact HTTP status (401, 403, 404, or 200).
 */
export async function requireAdminApi(request?: Request): Promise<
  | { authorized: true; user: User }
  | { authorized: false; user: null; errorResponse: { error: string; status: number } }
> {
  const ip = request?.headers.get('x-forwarded-for') || null;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      authorized: false,
      user: null,
      errorResponse: { error: 'Unauthorized: Authentication required', status: 401 },
    };
  }

  const adminSupabase = createAdminClient();
  const { data: adminRecord } = await adminSupabase
    .from('admin_users')
    .select('user_id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!adminRecord) {
    await logAdminAudit({
      adminId: user.id,
      action: 'unauthorized_admin_api_access',
      entityType: 'admin_api',
      entityId: user.id,
      newValue: { path: request?.url || null },
      ip,
    });
    return {
      authorized: false,
      user: null,
      errorResponse: { error: 'Forbidden: Admin access denied', status: 403 },
    };
  }

  const { data: mfaData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  const currentAal = mfaData?.currentLevel || 'aal1';
  const nextAal = mfaData?.nextLevel || 'aal1';

  if (currentAal !== 'aal2') {
    const errorMsg =
      nextAal === 'aal1'
        ? 'MFA enrollment required'
        : 'MFA challenge verification required';
    return {
      authorized: false,
      user: null,
      errorResponse: { error: `Forbidden: ${errorMsg} (AAL2 required)`, status: 403 },
    };
  }

  // Cookie inactivity check
  const cookieStore = await cookies();
  const lastActivityStr = cookieStore.get(ADMIN_LAST_ACTIVITY_COOKIE)?.value;
  if (lastActivityStr) {
    const lastActivity = parseInt(lastActivityStr, 10);
    if (Date.now() - lastActivity > ADMIN_SESSION_TIMEOUT_MS) {
      return {
        authorized: false,
        user: null,
        errorResponse: { error: 'Unauthorized: Admin session timed out', status: 401 },
      };
    }
  }

  return { authorized: true, user };
}

/**
 * Re-authentication check before sensitive operations (e.g. refunds, price changes).
 * Enforces that recent MFA verification occurred within the specified window.
 */
export async function requireRecentAuth(maxMinutes = 10): Promise<boolean> {
  const cookieStore = await cookies();
  const lastVerifiedStr = cookieStore.get(ADMIN_MFA_VERIFIED_COOKIE)?.value;
  if (!lastVerifiedStr) return false;

  const lastVerified = parseInt(lastVerifiedStr, 10);
  return Date.now() - lastVerified <= maxMinutes * 60 * 1000;
}

/**
 * Helper to record administrative audit entries
 */
export async function logAdminAudit({
  adminId,
  action,
  entityType,
  entityId,
  oldValue,
  newValue,
  ip,
}: {
  adminId?: string | null;
  action: string;
  entityType: string;
  entityId: string;
  oldValue?: unknown;
  newValue?: unknown;
  ip?: string | null;
}) {
  try {
    const adminSupabase = createAdminClient();
    await adminSupabase.from('audit_logs').insert({
      admin_id: adminId || null,
      action,
      entity_type: entityType,
      entity_id: entityId,
      old_value: oldValue || null,
      new_value: newValue || null,
      ip: ip || null,
    });
  } catch (err: unknown) {
    console.error('[Admin Audit Log Failed]', err);
  }
}
