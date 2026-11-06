import crypto from 'crypto';

export const ADMIN_COOKIE_SECRET_ENV = 'ADMIN_COOKIE_SECRET';
export const ADMIN_LAST_ACTIVITY_COOKIE = 'drria_admin_last_activity';
export const ADMIN_MFA_VERIFIED_COOKIE = 'drria_admin_mfa_verified_at';

export const MFA_VERIFIED_MAX_AGE_SEC = 10 * 60; // 10 minutes (600 seconds)
export const ACTIVITY_TIMEOUT_MAX_AGE_SEC = 30 * 60; // 30 minutes (1800 seconds)

export const MFA_VERIFIED_MAX_AGE_MS = MFA_VERIFIED_MAX_AGE_SEC * 1000; // 600,000 ms
export const ACTIVITY_TIMEOUT_MAX_AGE_MS = ACTIVITY_TIMEOUT_MAX_AGE_SEC * 1000; // 1,800,000 ms
export const ADMIN_SESSION_TIMEOUT_MS = ACTIVITY_TIMEOUT_MAX_AGE_MS; // 30 minutes alias

export const MAX_FUTURE_SKEW_MS = 60 * 1000; // 60 seconds allowable clock skew

/**
 * Retrieves the server-only secret used for signing admin session cookies.
 * Strictly forbids reusing the Supabase service-role secret key.
 */
export function getAdminCookieSecret(): string {
  const secret = process.env.ADMIN_COOKIE_SECRET;
  const supabaseSecret =
    process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (secret && supabaseSecret && secret === supabaseSecret) {
    throw new Error(
      'Security Violation: ADMIN_COOKIE_SECRET must not reuse the Supabase service-role secret key.'
    );
  }

  if (secret && secret.trim().length >= 32) {
    return secret.trim();
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'ADMIN_COOKIE_SECRET environment variable is missing or insecure (minimum 32 characters required).'
    );
  }

  // Development and test fallback secret (never used in production)
  return 'drria-dev-admin-cookie-secret-min-32-chars-long-0123456789abcdef';
}

/**
 * Extracts the session ID from a Supabase access token JWT payload or session object.
 */
export function extractSessionId(
  session?: { access_token?: string } | null,
  user?: { id: string } | null
): string {
  if (session?.access_token) {
    try {
      const parts = session.access_token.split('.');
      if (parts.length >= 2) {
        const payload = JSON.parse(
          Buffer.from(parts[1], 'base64url').toString('utf8')
        );
        if (typeof payload.session_id === 'string' && payload.session_id.length > 0) {
          return payload.session_id;
        }
        if (typeof payload.sid === 'string' && payload.sid.length > 0) {
          return payload.sid;
        }
      }
    } catch {
      // Fall through to hash
    }
    return crypto
      .createHash('sha256')
      .update(session.access_token)
      .digest('hex')
      .slice(0, 36);
  }
  return user?.id || 'anonymous';
}

/**
 * Extracts the session ID directly from the Supabase auth token cookies.
 * Does not call supabase.auth.getSession() to maintain compliance with server-side auth rules.
 */
export function extractSessionIdFromCookies(
  cookiesList: { name: string; value: string }[],
  fallbackId?: string
): string {
  try {
    const authCookies = cookiesList
      .filter((c) => c.name.startsWith('sb-') && c.name.includes('-auth-token'))
      .sort((a, b) => a.name.localeCompare(b.name));

    if (authCookies.length > 0) {
      const combined = authCookies.map((c) => c.value).join('');
      let rawJson = combined;
      if (rawJson.startsWith('base64-')) {
        rawJson = Buffer.from(rawJson.slice(7), 'base64url').toString('utf8');
      }
      if (rawJson.startsWith('{') || rawJson.startsWith('[')) {
        const parsed = JSON.parse(rawJson);
        const token = Array.isArray(parsed) ? parsed[0] : parsed.access_token;
        if (typeof token === 'string') {
          const parts = token.split('.');
          if (parts.length >= 2) {
            const payload = JSON.parse(
              Buffer.from(parts[1], 'base64url').toString('utf8')
            );
            if (typeof payload.session_id === 'string' && payload.session_id.length > 0) {
              return payload.session_id;
            }
          }
        }
      }
    }
  } catch {
    // Fall through to fallbackId
  }

  return fallbackId || 'anonymous';
}

/**
 * Generates an HMAC-SHA256 signature for an admin cookie value.
 * Payload format: `${type}:${userId}:${sessionId}:${timestamp}`
 * Cookie value format: `${timestamp}.${signature}`
 */
export function createSignedAdminCookieValue({
  type,
  userId,
  sessionId,
  timestamp = Date.now(),
  secret,
}: {
  type: 'mfa_verified' | 'last_activity';
  userId: string;
  sessionId: string;
  timestamp?: number;
  secret?: string;
}): string {
  if (!userId || !sessionId) {
    throw new Error('userId and sessionId are required to sign admin cookies.');
  }

  const signingKey = secret || getAdminCookieSecret();
  const payload = `${type}:${userId}:${sessionId}:${timestamp}`;
  const hmac = crypto
    .createHmac('sha256', signingKey)
    .update(payload)
    .digest('hex');

  return `${timestamp}.${hmac}`;
}

export type CookieVerifyResult =
  | { valid: true; timestamp: number }
  | {
      valid: false;
      reason:
        | 'missing'
        | 'invalid_format'
        | 'invalid_signature'
        | 'expired'
        | 'future_dated';
    };

/**
 * Verifies the integrity, authenticity, and freshness of a signed admin cookie.
 * Fails closed on any discrepancy:
 * - Missing or empty cookie
 * - Malformed structure (not `<timestamp>.<hex_hmac>`)
 * - Future-dated timestamps (beyond allowable clock skew)
 * - Expired timestamps (exceeding maxAgeMs)
 * - Invalid HMAC signature (tampered timestamp, wrong secret, wrong user ID, or wrong session ID)
 */
export function verifySignedAdminCookieValue({
  cookieValue,
  type,
  userId,
  sessionId,
  maxAgeMs,
  currentTime = Date.now(),
  secret,
}: {
  cookieValue?: string | null;
  type: 'mfa_verified' | 'last_activity';
  userId: string;
  sessionId: string;
  maxAgeMs: number;
  currentTime?: number;
  secret?: string;
}): CookieVerifyResult {
  if (!cookieValue || cookieValue.trim() === '') {
    return { valid: false, reason: 'missing' };
  }

  const parts = cookieValue.split('.');
  if (parts.length !== 2) {
    return { valid: false, reason: 'invalid_format' };
  }

  const [timestampStr, signature] = parts;
  if (!/^\d+$/.test(timestampStr) || !signature || signature.length !== 64) {
    return { valid: false, reason: 'invalid_format' };
  }

  const timestamp = parseInt(timestampStr, 10);
  if (isNaN(timestamp)) {
    return { valid: false, reason: 'invalid_format' };
  }

  // 1. Future timestamp check
  if (timestamp > currentTime + MAX_FUTURE_SKEW_MS) {
    return { valid: false, reason: 'future_dated' };
  }

  // 2. Expiration check
  if (currentTime - timestamp > maxAgeMs) {
    return { valid: false, reason: 'expired' };
  }

  // 3. HMAC-SHA256 signature verification bound to type, userId, sessionId, timestamp
  const signingKey = secret || getAdminCookieSecret();
  const payload = `${type}:${userId}:${sessionId}:${timestamp}`;
  const expectedHmac = crypto
    .createHmac('sha256', signingKey)
    .update(payload)
    .digest('hex');

  const sigBuf = Buffer.from(signature, 'hex');
  const expBuf = Buffer.from(expectedHmac, 'hex');

  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return { valid: false, reason: 'invalid_signature' };
  }

  return { valid: true, timestamp };
}

export interface CookieOptions {
  httpOnly: boolean;
  secure: boolean;
  sameSite: 'lax' | 'strict' | 'none';
  path: string;
  maxAge: number;
}

export function getAdminCookieOptions(
  type: 'mfa_verified' | 'last_activity'
): CookieOptions {
  const isProd = process.env.NODE_ENV === 'production';
  const maxAge =
    type === 'mfa_verified'
      ? MFA_VERIFIED_MAX_AGE_SEC
      : ACTIVITY_TIMEOUT_MAX_AGE_SEC;

  return {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    path: '/',
    maxAge,
  };
}

export function setSignedAdminActivityCookie(
  response: { cookies: { set: (name: string, value: string, options: CookieOptions) => void } },
  {
    userId,
    sessionId,
    timestamp,
  }: {
    userId: string;
    sessionId: string;
    timestamp?: number;
  }
) {
  const value = createSignedAdminCookieValue({
    type: 'last_activity',
    userId,
    sessionId,
    timestamp,
  });

  response.cookies.set(
    ADMIN_LAST_ACTIVITY_COOKIE,
    value,
    getAdminCookieOptions('last_activity')
  );
}

export function setSignedAdminMfaVerifiedCookie(
  response: { cookies: { set: (name: string, value: string, options: CookieOptions) => void } },
  {
    userId,
    sessionId,
    timestamp,
  }: {
    userId: string;
    sessionId: string;
    timestamp?: number;
  }
) {
  const value = createSignedAdminCookieValue({
    type: 'mfa_verified',
    userId,
    sessionId,
    timestamp,
  });

  response.cookies.set(
    ADMIN_MFA_VERIFIED_COOKIE,
    value,
    getAdminCookieOptions('mfa_verified')
  );
}
