import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

// Import real helpers from lib/admin-evaluator.ts
import {
  evaluateAdminSession,
  ADMIN_SESSION_TIMEOUT_MS,
} from '../lib/admin-evaluator.ts';

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
  // RATE LIMITING & SECURITY DEFENSES
  // ---------------------------------------------------------------------------
  describe('Admin Login & MFA Rate Limiting', () => {
    it('rate limits admin login attempts to 5 per IP window', () => {
      const testKey = `test_admin_login_${Date.now()}`;
      for (let i = 0; i < 5; i++) {
        assert.equal(checkRateLimit(testKey, 5, 60000), true);
      }
      // 6th attempt is blocked
      assert.equal(checkRateLimit(testKey, 5, 60000), false);
    });
  });
});
