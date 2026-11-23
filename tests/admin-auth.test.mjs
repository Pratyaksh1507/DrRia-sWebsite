import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

// Import real helpers from lib/admin-evaluator.ts
import {
  evaluateAdminSession,
  ADMIN_SESSION_TIMEOUT_MS,
} from '../lib/admin-evaluator.ts';

import {
  createSignedAdminCookieValue,
  verifySignedAdminCookieValue,
  extractSessionId,
  ADMIN_LAST_ACTIVITY_COOKIE,
  ADMIN_MFA_VERIFIED_COOKIE,
  MFA_VERIFIED_MAX_AGE_MS,
  ACTIVITY_TIMEOUT_MAX_AGE_MS,
} from '../lib/admin-cookie.ts';

import { checkRateLimit } from '../lib/rate-limit.ts';

// -----------------------------------------------------------------------------
// POSTGRES DATABASE SIMULATOR FOR SINGLE-ADMIN CONSTRAINTS
// -----------------------------------------------------------------------------
class MockAdminDatabase {
  constructor() {
    this.adminUsers = new Map();
    this.auditLogs = [];
  }

  // Mirrors: INSERT INTO public.admin_users (user_id, is_singleton) VALUES ($1, true)
  // Protected by trigger: check_single_admin_user() AND UNIQUE(is_singleton)
  insertAdminUser(userId) {
    if (this.adminUsers.size >= 1) {
      throw new Error(
        'duplicate key value violates unique constraint "admin_users_singleton_key" / trigger "enforce_single_admin_user": System allows at most one administrator account'
      );
    }
    const record = {
      user_id: userId,
      is_singleton: true,
      created_at: new Date().toISOString(),
    };
    this.adminUsers.set(userId, record);
    return record;
  }

  getAdminUser(userId) {
    return this.adminUsers.get(userId) || null;
  }

  countAdminUsers() {
    return this.adminUsers.size;
  }
}

// -----------------------------------------------------------------------------
// SUITE: PHASE 1 SINGLE-ADMIN AUTHENTICATION & SECURITY CONTROLS
// -----------------------------------------------------------------------------
describe('Phase 1: Single-Admin Authentication & Authorization Tests', () => {
  const adminId = 'd7b1e840-025c-4f51-b0e2-8951b14f6b01';
  const customerId = 'c1a2e340-9999-4a51-b0e2-000000000000';

  // ---------------------------------------------------------------------------
  // STATE 1: Signed-Out User
  // ---------------------------------------------------------------------------
  describe('State 1: Signed-Out User', () => {
    it('redirects to /admin/login when accessing admin page and yields 401 for API', () => {
      const result = evaluateAdminSession({
        user: null,
        isAdminUser: false,
        currentAal: 'aal1',
      });

      assert.equal(result.authorized, false);
      assert.equal(result.status, 401);
      assert.equal(result.reason, 'unauthenticated');
      assert.equal(result.redirectUrl, '/admin/login');
    });
  });

  // ---------------------------------------------------------------------------
  // STATE 2: Normal Signed-In Customer
  // ---------------------------------------------------------------------------
  describe('State 2: Normal Signed-In Customer (Non-Admin)', () => {
    it('returns 404 (stealth) for page access to conceal admin existence, and 403 on API', () => {
      const result = evaluateAdminSession({
        user: { id: customerId, email: 'customer@example.com' },
        isAdminUser: false,
        currentAal: 'aal1',
      });

      assert.equal(result.authorized, false);
      assert.equal(result.status, 404); // Stealth 404
      assert.equal(result.reason, 'forbidden_non_admin');
      assert.equal(result.redirectUrl, undefined);
    });
  });

  // ---------------------------------------------------------------------------
  // STATE 3: Admin User Without MFA Enrolled
  // ---------------------------------------------------------------------------
  describe('State 3: Admin User Without MFA Enrolled', () => {
    it('redirects to /admin/mfa/enroll for page access and yields 403 on API', () => {
      const result = evaluateAdminSession({
        user: { id: adminId, email: 'admin@drrias.in' },
        isAdminUser: true,
        currentAal: 'aal1',
        nextAal: 'aal1', // No second factor enrolled yet
      });

      assert.equal(result.authorized, false);
      assert.equal(result.status, 403);
      assert.equal(result.reason, 'requires_mfa_enrollment');
      assert.equal(result.redirectUrl, '/admin/mfa/enroll');
      assert.equal(result.adminId, adminId);
    });
  });

  // ---------------------------------------------------------------------------
  // STATE 4: Admin User with AAL1 (MFA Pending / Challenge Required)
  // ---------------------------------------------------------------------------
  describe('State 4: Admin User with AAL1 (Password Verified, MFA Pending)', () => {
    it('redirects to /admin/mfa/challenge for page access and yields 403 on API', () => {
      const result = evaluateAdminSession({
        user: { id: adminId, email: 'admin@drrias.in' },
        isAdminUser: true,
        currentAal: 'aal1',
        nextAal: 'aal2', // TOTP enrolled, but challenge not yet verified in this session
      });

      assert.equal(result.authorized, false);
      assert.equal(result.status, 403);
      assert.equal(result.reason, 'requires_mfa_challenge');
      assert.equal(result.redirectUrl, '/admin/mfa/challenge');
      assert.equal(result.adminId, adminId);
    });
  });

  // ---------------------------------------------------------------------------
  // STATE 5: Admin User with AAL2 (Full MFA Verified)
  // ---------------------------------------------------------------------------
  describe('State 5: Admin User with AAL2 (Full MFA Verified)', () => {
    it('authorizes admin dashboard access with 200 OK and valid adminId', () => {
      const now = Date.now();
      const result = evaluateAdminSession({
        user: { id: adminId, email: 'admin@drrias.in' },
        isAdminUser: true,
        currentAal: 'aal2',
        nextAal: 'aal2',
        lastActivityTimestamp: now - 5 * 60 * 1000, // Active 5 mins ago
        currentTime: now,
      });

      assert.equal(result.authorized, true);
      assert.equal(result.status, 200);
      assert.equal(result.adminId, adminId);
      assert.equal(result.redirectUrl, undefined);
    });

    it('enforces 30-minute session inactivity timeout', () => {
      const now = Date.now();
      const expiredTimestamp = now - (ADMIN_SESSION_TIMEOUT_MS + 1000); // 30 mins + 1 sec ago

      const result = evaluateAdminSession({
        user: { id: adminId, email: 'admin@drrias.in' },
        isAdminUser: true,
        currentAal: 'aal2',
        nextAal: 'aal2',
        lastActivityTimestamp: expiredTimestamp,
        currentTime: now,
      });

      assert.equal(result.authorized, false);
      assert.equal(result.status, 401);
      assert.equal(result.reason, 'session_timeout');
      assert.equal(result.redirectUrl, '/admin/login?error=session_timeout');
    });
  });

  // ---------------------------------------------------------------------------
  // STATE 6: Single-Admin Database Constraint & Trigger Enforcement
  // ---------------------------------------------------------------------------
  describe('State 6: Single-Admin Database Constraint & Trigger', () => {
    it('successfully registers the first admin user', () => {
      const db = new MockAdminDatabase();
      const record = db.insertAdminUser(adminId);
      assert.equal(record.user_id, adminId);
      assert.equal(record.is_singleton, true);
      assert.equal(db.countAdminUsers(), 1);
    });

    it('strictly rejects any attempt to insert a second admin row', () => {
      const db = new MockAdminDatabase();
      db.insertAdminUser(adminId);

      const secondAttackerId = 'e9c2b111-2222-3333-4444-555555555555';
      assert.throws(
        () => {
          db.insertAdminUser(secondAttackerId);
        },
        {
          message: /duplicate key value violates unique constraint "admin_users_singleton_key"/,
        }
      );

      // Verify table count remains exactly 1
      assert.equal(db.countAdminUsers(), 1);
      assert.equal(db.getAdminUser(adminId).user_id, adminId);
      assert.equal(db.getAdminUser(secondAttackerId), null);
    });

    it('verifies SQL migration defines both singleton CHECK/UNIQUE constraint and trigger', () => {
      const migrationPath = path.resolve(
        process.cwd(),
        'supabase/migrations/20261104120000_admin_auth_and_audit.sql'
      );
      assert.ok(fs.existsSync(migrationPath), 'Migration file must exist');

      const sqlContent = fs.readFileSync(migrationPath, 'utf8');

      // Check for table creation with uuid references auth.users
      assert.match(sqlContent, /CREATE TABLE (IF NOT EXISTS )?public\.admin_users/i);
      assert.match(sqlContent, /user_id UUID PRIMARY KEY REFERENCES auth\.users/i);

      // Check for singleton guarantee (UNIQUE constraint and CHECK)
      assert.match(sqlContent, /is_singleton boolean default true not null check \(is_singleton\)/i);
      assert.match(sqlContent, /constraint admin_users_singleton unique \(is_singleton\)/i);

      // Check for enforcement trigger
      assert.match(sqlContent, /create or replace function public\.check_single_admin_user\(\)/i);
      assert.match(sqlContent, /create trigger enforce_single_admin_user/i);

      // Check that RLS is enabled with server-only access (no public policies)
      assert.match(sqlContent, /alter table public\.admin_users enable row level security/i);
      assert.match(sqlContent, /alter table public\.audit_logs enable row level security/i);
    });

    it('verifies admin-provision.sql exists with manual Supabase SQL Editor script', () => {
      const provisionPath = path.resolve(process.cwd(), 'supabase/admin-provision.sql');
      assert.ok(fs.existsSync(provisionPath), 'supabase/admin-provision.sql must exist');

      const provisionSql = fs.readFileSync(provisionPath, 'utf8');
      assert.match(provisionSql, /INSERT INTO public\.admin_users/i);
      assert.match(provisionSql, /auth\.users/i);
      assert.match(provisionSql, /ON CONFLICT/i);
    });
  });

  // ---------------------------------------------------------------------------
  // ADMIN ENTRY ROUTE (/admin) BEHAVIOR
  // ---------------------------------------------------------------------------
  describe('Admin Entry Page (/admin) Routing & Gatekeeper', () => {
    it('verifies app/admin/page.tsx exists and is configured as a dynamic blocking route', () => {
      const pagePath = path.resolve(process.cwd(), 'app/admin/page.tsx');
      assert.ok(fs.existsSync(pagePath), 'app/admin/page.tsx must exist');

      const content = fs.readFileSync(pagePath, 'utf8');
      assert.match(content, /export const instant = false/, 'Must define export const instant = false');
      assert.match(content, /requireAdmin/, 'Must enforce requireAdmin() authentication guard');
      assert.match(content, /redirect\(['"]\/admin\/products['"]\)/, 'Must redirect verified AAL2 admin to /admin/products');
    });

    it('redirects unauthenticated visitor accessing /admin to /admin/login', () => {
      const result = evaluateAdminSession({ user: null, isAdminUser: false, currentAal: 'aal1' });
      assert.equal(result.redirectUrl, '/admin/login');
      assert.equal(result.authorized, false);
    });

    it('denies authenticated non-admin customer accessing /admin with stealth 404', () => {
      const result = evaluateAdminSession({
        user: { id: customerId, email: 'customer@example.com' },
        isAdminUser: false,
        currentAal: 'aal1',
      });
      assert.equal(result.status, 404);
      assert.equal(result.authorized, false);
    });

    it('redirects authenticated admin without MFA to /admin/mfa/enroll', () => {
      const result = evaluateAdminSession({
        user: { id: adminId, email: 'admin@drrias.in' },
        isAdminUser: true,
        currentAal: 'aal1',
        nextAal: 'aal1',
      });
      assert.equal(result.redirectUrl, '/admin/mfa/enroll');
      assert.equal(result.authorized, false);
    });

    it('redirects authenticated admin with AAL1 to /admin/mfa/challenge', () => {
      const result = evaluateAdminSession({
        user: { id: adminId, email: 'admin@drrias.in' },
        isAdminUser: true,
        currentAal: 'aal1',
        nextAal: 'aal2',
      });
      assert.equal(result.redirectUrl, '/admin/mfa/challenge');
      assert.equal(result.authorized, false);
    });

    it('authorizes verified AAL2 administrator for redirection to /admin/products', () => {
      const now = Date.now();
      const result = evaluateAdminSession({
        user: { id: adminId, email: 'admin@drrias.in' },
        isAdminUser: true,
        currentAal: 'aal2',
        nextAal: 'aal2',
        lastActivityTimestamp: now,
        currentTime: now,
      });
      assert.equal(result.authorized, true);
      assert.equal(result.status, 200);
    });
  });

  // ---------------------------------------------------------------------------
  // ADMIN SESSION COOKIE SECURITY & CRYPTOGRAPHIC VERIFICATION
  // ---------------------------------------------------------------------------
  describe('Admin Session Cookie Cryptographic Security', () => {
    const testUserId = 'd7b1e840-025c-4f51-b0e2-8951b14f6b01';
    const otherUserId = 'c1a2e340-9999-4a51-b0e2-000000000000';
    const testSessionId = 'sess-uuid-1111-2222-3333-444455556666';
    const otherSessionId = 'sess-uuid-9999-8888-7777-666655554444';
    const testSecret = 'test-secret-key-at-least-32-chars-long-abcdef012345';

    // 1. Missing cookies
    it('fails closed when cookie is missing, null, undefined or empty', () => {
      assert.deepEqual(
        verifySignedAdminCookieValue({
          cookieValue: null,
          type: 'last_activity',
          userId: testUserId,
          sessionId: testSessionId,
          maxAgeMs: ACTIVITY_TIMEOUT_MAX_AGE_MS,
          secret: testSecret,
        }),
        { valid: false, reason: 'missing' }
      );

      assert.deepEqual(
        verifySignedAdminCookieValue({
          cookieValue: undefined,
          type: 'mfa_verified',
          userId: testUserId,
          sessionId: testSessionId,
          maxAgeMs: MFA_VERIFIED_MAX_AGE_MS,
          secret: testSecret,
        }),
        { valid: false, reason: 'missing' }
      );

      assert.deepEqual(
        verifySignedAdminCookieValue({
          cookieValue: '',
          type: 'mfa_verified',
          userId: testUserId,
          sessionId: testSessionId,
          maxAgeMs: MFA_VERIFIED_MAX_AGE_MS,
          secret: testSecret,
        }),
        { valid: false, reason: 'missing' }
      );
    });

    // 2. Forged raw timestamps (unauthenticated integer string)
    it('rejects forged raw timestamps without HMAC signature', () => {
      const forgedRawTimestamp = Date.now().toString();
      const result = verifySignedAdminCookieValue({
        cookieValue: forgedRawTimestamp,
        type: 'mfa_verified',
        userId: testUserId,
        sessionId: testSessionId,
        maxAgeMs: MFA_VERIFIED_MAX_AGE_MS,
        secret: testSecret,
      });
      assert.equal(result.valid, false);
      assert.equal(result.reason, 'invalid_format');
    });

    // 3. Invalid HMAC signatures / Tampered timestamps
    it('rejects tampered timestamps with invalid HMAC signatures', () => {
      const now = Date.now();
      const validCookie = createSignedAdminCookieValue({
        type: 'last_activity',
        userId: testUserId,
        sessionId: testSessionId,
        timestamp: now,
        secret: testSecret,
      });

      // Tamper with timestamp part but keep signature
      const [ts, sig] = validCookie.split('.');
      const tamperedTimestamp = (parseInt(ts, 10) + 1000).toString();
      const forgedCookie = `${tamperedTimestamp}.${sig}`;

      const result = verifySignedAdminCookieValue({
        cookieValue: forgedCookie,
        type: 'last_activity',
        userId: testUserId,
        sessionId: testSessionId,
        maxAgeMs: ACTIVITY_TIMEOUT_MAX_AGE_MS,
        currentTime: now,
        secret: testSecret,
      });
      assert.equal(result.valid, false);
      assert.equal(result.reason, 'invalid_signature');
    });

    it('rejects cookie signed with a different or attacker-controlled secret', () => {
      const now = Date.now();
      const attackerCookie = createSignedAdminCookieValue({
        type: 'mfa_verified',
        userId: testUserId,
        sessionId: testSessionId,
        timestamp: now,
        secret: 'attacker-provided-secret-key-32-chars-long-0000000',
      });

      const result = verifySignedAdminCookieValue({
        cookieValue: attackerCookie,
        type: 'mfa_verified',
        userId: testUserId,
        sessionId: testSessionId,
        maxAgeMs: MFA_VERIFIED_MAX_AGE_MS,
        currentTime: now,
        secret: testSecret,
      });
      assert.equal(result.valid, false);
      assert.equal(result.reason, 'invalid_signature');
    });

    // 4. Wrong user or session binding
    it('rejects cookie signed for User A when evaluated for User B (User Isolation)', () => {
      const now = Date.now();
      const userACookie = createSignedAdminCookieValue({
        type: 'last_activity',
        userId: testUserId,
        sessionId: testSessionId,
        timestamp: now,
        secret: testSecret,
      });

      const result = verifySignedAdminCookieValue({
        cookieValue: userACookie,
        type: 'last_activity',
        userId: otherUserId, // Different user
        sessionId: testSessionId,
        maxAgeMs: ACTIVITY_TIMEOUT_MAX_AGE_MS,
        currentTime: now,
        secret: testSecret,
      });
      assert.equal(result.valid, false);
      assert.equal(result.reason, 'invalid_signature');
    });

    it('rejects cookie signed for Session 1 when evaluated for Session 2 (Session Isolation)', () => {
      const now = Date.now();
      const session1Cookie = createSignedAdminCookieValue({
        type: 'mfa_verified',
        userId: testUserId,
        sessionId: testSessionId,
        timestamp: now,
        secret: testSecret,
      });

      const result = verifySignedAdminCookieValue({
        cookieValue: session1Cookie,
        type: 'mfa_verified',
        userId: testUserId,
        sessionId: otherSessionId, // Stale or different session
        maxAgeMs: MFA_VERIFIED_MAX_AGE_MS,
        currentTime: now,
        secret: testSecret,
      });
      assert.equal(result.valid, false);
      assert.equal(result.reason, 'invalid_signature');
    });

    // 5. Cross-cookie type replay prevention
    it('rejects cross-cookie replay (last_activity cookie used as mfa_verified)', () => {
      const now = Date.now();
      const activityCookie = createSignedAdminCookieValue({
        type: 'last_activity',
        userId: testUserId,
        sessionId: testSessionId,
        timestamp: now,
        secret: testSecret,
      });

      // Attempt to present activity cookie for MFA verification
      const result = verifySignedAdminCookieValue({
        cookieValue: activityCookie,
        type: 'mfa_verified',
        userId: testUserId,
        sessionId: testSessionId,
        maxAgeMs: MFA_VERIFIED_MAX_AGE_MS,
        currentTime: now,
        secret: testSecret,
      });
      assert.equal(result.valid, false);
      assert.equal(result.reason, 'invalid_signature');
    });

    // 6. Expired timestamps
    it('rejects expired MFA verification (older than 10 minutes)', () => {
      const now = Date.now();
      const elevenMinsAgo = now - 11 * 60 * 1000;
      const expiredMfaCookie = createSignedAdminCookieValue({
        type: 'mfa_verified',
        userId: testUserId,
        sessionId: testSessionId,
        timestamp: elevenMinsAgo,
        secret: testSecret,
      });

      const result = verifySignedAdminCookieValue({
        cookieValue: expiredMfaCookie,
        type: 'mfa_verified',
        userId: testUserId,
        sessionId: testSessionId,
        maxAgeMs: MFA_VERIFIED_MAX_AGE_MS,
        currentTime: now,
        secret: testSecret,
      });
      assert.equal(result.valid, false);
      assert.equal(result.reason, 'expired');
    });

    it('rejects expired inactivity timeout (older than 30 minutes)', () => {
      const now = Date.now();
      const thirtyOneMinsAgo = now - 31 * 60 * 1000;
      const expiredActivityCookie = createSignedAdminCookieValue({
        type: 'last_activity',
        userId: testUserId,
        sessionId: testSessionId,
        timestamp: thirtyOneMinsAgo,
        secret: testSecret,
      });

      const result = verifySignedAdminCookieValue({
        cookieValue: expiredActivityCookie,
        type: 'last_activity',
        userId: testUserId,
        sessionId: testSessionId,
        maxAgeMs: ACTIVITY_TIMEOUT_MAX_AGE_MS,
        currentTime: now,
        secret: testSecret,
      });
      assert.equal(result.valid, false);
      assert.equal(result.reason, 'expired');
    });

    // 7. Future-dated timestamps
    it('rejects future-dated timestamps exceeding clock skew allowance', () => {
      const now = Date.now();
      const futureTimestamp = now + 10 * 60 * 1000; // 10 minutes in the future
      const futureCookie = createSignedAdminCookieValue({
        type: 'last_activity',
        userId: testUserId,
        sessionId: testSessionId,
        timestamp: futureTimestamp,
        secret: testSecret,
      });

      const result = verifySignedAdminCookieValue({
        cookieValue: futureCookie,
        type: 'last_activity',
        userId: testUserId,
        sessionId: testSessionId,
        maxAgeMs: ACTIVITY_TIMEOUT_MAX_AGE_MS,
        currentTime: now,
        secret: testSecret,
      });
      assert.equal(result.valid, false);
      assert.equal(result.reason, 'future_dated');
    });

    // 8. Valid recent MFA verification
    it('accepts valid, authentic MFA verification within the 10-minute window', () => {
      const now = Date.now();
      const validMfaCookie = createSignedAdminCookieValue({
        type: 'mfa_verified',
        userId: testUserId,
        sessionId: testSessionId,
        timestamp: now - 2 * 60 * 1000, // 2 mins ago
        secret: testSecret,
      });

      const result = verifySignedAdminCookieValue({
        cookieValue: validMfaCookie,
        type: 'mfa_verified',
        userId: testUserId,
        sessionId: testSessionId,
        maxAgeMs: MFA_VERIFIED_MAX_AGE_MS,
        currentTime: now,
        secret: testSecret,
      });
      assert.equal(result.valid, true);
      assert.equal(result.timestamp, now - 2 * 60 * 1000);
    });

    // 9. Valid active activity session
    it('accepts valid, authentic activity cookie within the 30-minute window', () => {
      const now = Date.now();
      const validActivityCookie = createSignedAdminCookieValue({
        type: 'last_activity',
        userId: testUserId,
        sessionId: testSessionId,
        timestamp: now - 15 * 60 * 1000, // 15 mins ago
        secret: testSecret,
      });

      const result = verifySignedAdminCookieValue({
        cookieValue: validActivityCookie,
        type: 'last_activity',
        userId: testUserId,
        sessionId: testSessionId,
        maxAgeMs: ACTIVITY_TIMEOUT_MAX_AGE_MS,
        currentTime: now,
        secret: testSecret,
      });
      assert.equal(result.valid, true);
      assert.equal(result.timestamp, now - 15 * 60 * 1000);
    });

    // 10. Session ID extraction from JWT access token
    it('extracts session_id correctly from JWT access token payload', () => {
      const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
      const payload = Buffer.from(
        JSON.stringify({
          sub: testUserId,
          session_id: 'supabase-jwt-session-uuid-1234',
          aal: 'aal2',
        })
      ).toString('base64url');
      const fakeToken = `${header}.${payload}.sig`;

      const extracted = extractSessionId({ access_token: fakeToken }, { id: testUserId });
      assert.equal(extracted, 'supabase-jwt-session-uuid-1234');
    });
  });

  // ---------------------------------------------------------------------------
  // SENSITIVE ADMIN MUTATION STEP-UP MFA ENFORCEMENT
  // ---------------------------------------------------------------------------
  describe('Admin Mutation Step-Up MFA Enforcement', () => {
    const adminId = 'd7b1e840-025c-4f51-b0e2-8951b14f6b01';
    const customerId = 'c1a2e340-9999-4a51-b0e2-000000000000';
    const sessionId = 'sess-uuid-admin-mfa-stepup-1234';
    const testSecret = 'test-secret-key-at-least-32-chars-long-abcdef012345';

    function evaluateMutationAccess({
      user,
      isAdmin,
      aal,
      mfaCookie,
      currentTime = Date.now(),
    }) {
      // 1. Core API Guard (requireAdminApi)
      if (!user) {
        return { status: 401, error: 'Unauthorized: Authentication required' };
      }
      if (!isAdmin) {
        return { status: 403, error: 'Forbidden: Admin access denied' };
      }
      if (aal !== 'aal2') {
        return { status: 403, error: 'Forbidden: MFA verification required (AAL2 required)' };
      }

      // 2. Step-Up Recent MFA Guard (requireRecentAuth)
      const mfaCheck = verifySignedAdminCookieValue({
        cookieValue: mfaCookie,
        type: 'mfa_verified',
        userId: user.id,
        sessionId,
        maxAgeMs: 10 * 60 * 1000,
        currentTime,
        secret: testSecret,
      });

      if (!mfaCheck.valid) {
        return {
          status: 403,
          error: 'Recent MFA verification required. Please complete authentication challenge.',
          code: 'mfa_challenge_required',
          reason: mfaCheck.reason,
        };
      }

      return { status: 200, success: true };
    }

    it('rejects mutation when recent MFA cookie is missing despite valid AAL2 session', () => {
      const result = evaluateMutationAccess({
        user: { id: adminId },
        isAdmin: true,
        aal: 'aal2',
        mfaCookie: null, // No recent MFA cookie
      });

      assert.equal(result.status, 403);
      assert.equal(result.code, 'mfa_challenge_required');
      assert.equal(result.reason, 'missing');
    });

    it('rejects mutation when recent MFA cookie is expired (>10 minutes)', () => {
      const now = Date.now();
      const expiredMfaCookie = createSignedAdminCookieValue({
        type: 'mfa_verified',
        userId: adminId,
        sessionId,
        timestamp: now - 11 * 60 * 1000, // 11 mins ago
        secret: testSecret,
      });

      const result = evaluateMutationAccess({
        user: { id: adminId },
        isAdmin: true,
        aal: 'aal2',
        mfaCookie: expiredMfaCookie,
        currentTime: now,
      });

      assert.equal(result.status, 403);
      assert.equal(result.code, 'mfa_challenge_required');
      assert.equal(result.reason, 'expired');
    });

    it('accepts mutation when admin has verified AAL2 and authentic recent MFA within 10 minutes', () => {
      const now = Date.now();
      const validMfaCookie = createSignedAdminCookieValue({
        type: 'mfa_verified',
        userId: adminId,
        sessionId,
        timestamp: now - 2 * 60 * 1000, // 2 mins ago
        secret: testSecret,
      });

      const result = evaluateMutationAccess({
        user: { id: adminId },
        isAdmin: true,
        aal: 'aal2',
        mfaCookie: validMfaCookie,
        currentTime: now,
      });

      assert.equal(result.status, 200);
      assert.equal(result.success, true);
    });

    it('strictly denies ordinary authenticated customer regardless of any MFA cookie state', () => {
      const now = Date.now();
      const forgedCookie = createSignedAdminCookieValue({
        type: 'mfa_verified',
        userId: customerId,
        sessionId,
        timestamp: now,
        secret: testSecret,
      });

      const result = evaluateMutationAccess({
        user: { id: customerId },
        isAdmin: false, // Normal customer
        aal: 'aal2',
        mfaCookie: forgedCookie,
      });

      assert.equal(result.status, 403);
      assert.equal(result.error, 'Forbidden: Admin access denied');
      assert.equal(result.code, undefined); // Rejected before step-up evaluation
    });

    it('verifies Route Handlers enforce requireRecentAuth on all sensitive endpoints', () => {
      const routes = [
        path.resolve(process.cwd(), 'app/api/admin/products/route.ts'),
        path.resolve(process.cwd(), 'app/api/admin/products/[id]/route.ts'),
        path.resolve(process.cwd(), 'app/api/admin/products/upload/route.ts'),
      ];

      for (const routePath of routes) {
        assert.equal(fs.existsSync(routePath), true, `Route must exist: ${routePath}`);
        const content = fs.readFileSync(routePath, 'utf8');
        assert.match(
          content,
          /requireRecentAuth/,
          `${path.basename(routePath)} must call requireRecentAuth`
        );
        assert.match(
          content,
          /mfa_challenge_required/,
          `${path.basename(routePath)} must return mfa_challenge_required code`
        );
      }
    });
  });
});
