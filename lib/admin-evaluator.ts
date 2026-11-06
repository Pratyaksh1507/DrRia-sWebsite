export const ADMIN_SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
export {
  ADMIN_LAST_ACTIVITY_COOKIE,
  ADMIN_MFA_VERIFIED_COOKIE,
  ACTIVITY_TIMEOUT_MAX_AGE_SEC,
  MFA_VERIFIED_MAX_AGE_SEC,
} from './admin-cookie.ts';

export interface AdminAuthCheckResult {
  authorized: boolean;
  status: 200 | 401 | 403 | 404;
  reason?:
    | 'unauthenticated'
    | 'forbidden_non_admin'
    | 'requires_mfa_enrollment'
    | 'requires_mfa_challenge'
    | 'session_timeout';
  redirectUrl?: string;
  adminId?: string;
}

/**
 * Pure evaluation logic for admin session authorization.
 * Exported for deterministic testing across all 5 authentication & MFA states.
 */
export function evaluateAdminSession({
  user,
  isAdminUser,
  currentAal,
  nextAal,
  lastActivityTimestamp,
  currentTime = Date.now(),
  activityCookieValid,
}: {
  user: { id: string; email?: string } | null;
  isAdminUser: boolean;
  currentAal: 'aal1' | 'aal2';
  nextAal?: 'aal1' | 'aal2';
  lastActivityTimestamp?: number | null;
  currentTime?: number;
  activityCookieValid?: boolean;
}): AdminAuthCheckResult {
  // 1. Signed-out user
  if (!user) {
    return {
      authorized: false,
      status: 401,
      reason: 'unauthenticated',
      redirectUrl: '/admin/login',
    };
  }

  // 2. Normal customer (authenticated in Supabase, but NOT present in admin_users table)
  if (!isAdminUser) {
    return {
      authorized: false,
      status: 404, // Stealth 404 on pages to conceal admin route existence; 403 on API
      reason: 'forbidden_non_admin',
    };
  }

  // 3. Admin user without TOTP MFA enrolled (needs initial enrollment)
  if (currentAal !== 'aal2' && nextAal === 'aal1') {
    return {
      authorized: false,
      status: 403,
      reason: 'requires_mfa_enrollment',
      redirectUrl: '/admin/mfa/enroll',
      adminId: user.id,
    };
  }

  // 4. Admin user with MFA enrolled, but current session is only aal1 (needs challenge)
  if (currentAal !== 'aal2') {
    return {
      authorized: false,
      status: 403,
      reason: 'requires_mfa_challenge',
      redirectUrl: '/admin/mfa/challenge',
      adminId: user.id,
    };
  }

  // 5. Inactive session timeout (30 minutes) or invalid activity state
  if (activityCookieValid === false) {
    return {
      authorized: false,
      status: 401,
      reason: 'session_timeout',
      redirectUrl: '/admin/login?error=session_timeout',
      adminId: user.id,
    };
  }

  if (
    lastActivityTimestamp &&
    currentTime - lastActivityTimestamp > ADMIN_SESSION_TIMEOUT_MS
  ) {
    return {
      authorized: false,
      status: 401,
      reason: 'session_timeout',
      redirectUrl: '/admin/login?error=session_timeout',
      adminId: user.id,
    };
  }

  // 6. Fully authorized single admin with verified AAL2 session
  return {
    authorized: true,
    status: 200,
    adminId: user.id,
  };
}

