import { notFound, redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import type { User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  extractSessionIdFromCookies,
  verifySignedAdminCookieValue,
  ADMIN_LAST_ACTIVITY_COOKIE,
  ADMIN_MFA_VERIFIED_COOKIE,
  ADMIN_SESSION_TIMEOUT_MS,
} from './admin-cookie.ts';

export {
  ADMIN_SESSION_TIMEOUT_MS,
  ADMIN_LAST_ACTIVITY_COOKIE,
  ADMIN_MFA_VERIFIED_COOKIE,
  extractSessionId,
  extractSessionIdFromCookies,
  createSignedAdminCookieValue,
  verifySignedAdminCookieValue,
  setSignedAdminActivityCookie,
  setSignedAdminMfaVerifiedCookie,
  getAdminCookieSecret,
} from './admin-cookie.ts';
export {
  type AdminAuthCheckResult,
  evaluateAdminSession,
} from './admin-evaluator.ts';

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

  // Mandatory inactivity timeout check (30 minutes) with HMAC signature and user/session binding
  const cookieStore = await cookies();
  const sessionId = extractSessionIdFromCookies(cookieStore.getAll(), user.id);
  const lastActivityCookie = cookieStore.get(ADMIN_LAST_ACTIVITY_COOKIE)?.value;

  const activityCheck = verifySignedAdminCookieValue({
    cookieValue: lastActivityCookie,
    type: 'last_activity',
    userId: user.id,
    sessionId,
    maxAgeMs: ADMIN_SESSION_TIMEOUT_MS,
  });

  if (!activityCheck.valid) {
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

  // Mandatory inactivity timeout check (30 minutes) with HMAC signature & user/session binding. Fails closed.
  const cookieStore = await cookies();
  const sessionId = extractSessionIdFromCookies(cookieStore.getAll(), user.id);
  const lastActivityCookie = cookieStore.get(ADMIN_LAST_ACTIVITY_COOKIE)?.value;

  const activityCheck = verifySignedAdminCookieValue({
    cookieValue: lastActivityCookie,
    type: 'last_activity',
    userId: user.id,
    sessionId,
    maxAgeMs: ADMIN_SESSION_TIMEOUT_MS,
  });

  if (!activityCheck.valid) {
    return {
      authorized: false,
      user: null,
      errorResponse: {
        error: 'Unauthorized: Admin session timed out or invalid',
        status: 401,
      },
    };
  }

  return { authorized: true, user };
}

/**
 * Re-authentication check before sensitive operations (e.g. refunds, price changes).
 * Enforces that recent MFA verification occurred within the specified window (default: 10 minutes).
 * Validates HMAC-SHA256 signature bound to user.id and Supabase session.id.
 */
export async function requireRecentAuth(
  maxMinutes = 10,
  context?: { userId?: string; sessionId?: string }
): Promise<boolean> {
  const supabase = await createClient();
  let userId = context?.userId;
  let sessionId = context?.sessionId;

  if (!userId) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return false;
    userId = user.id;

    if (!sessionId) {
      const cookieStore = await cookies();
      sessionId = extractSessionIdFromCookies(cookieStore.getAll(), user.id);
    }
  }

  if (!userId || !sessionId) return false;

  const cookieStore = await cookies();
  const rawCookie = cookieStore.get(ADMIN_MFA_VERIFIED_COOKIE)?.value;
  if (!rawCookie) return false;

  const result = verifySignedAdminCookieValue({
    cookieValue: rawCookie,
    type: 'mfa_verified',
    userId,
    sessionId,
    maxAgeMs: maxMinutes * 60 * 1000,
  });

  return result.valid;
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
