import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

// =============================================================================
// TEST CLASSIFICATION DISCLOSURE:
// The tests in this file are:
// 1. CONFIGURATION & CODE UNIT TESTS (Env vars, server-only client protection)
// 2. STATIC SQL SCHEMA & SECURITY AUDIT CHECKS (AST / regex inspection of migration files)
// 3. SIMULATED DATABASE RLS TESTS (In-memory JavaScript Mock Engine)
//
// NOTICE: These tests do NOT execute against a live PostgreSQL server or remote
// Supabase instance. Live RLS verification requires deploying migrations to an
// active PostgreSQL instance.
// =============================================================================

// -----------------------------------------------------------------------------
// IN-MEMORY SIMULATED RLS ENGINE (For policy logic unit testing)
// -----------------------------------------------------------------------------
class MockPostgresRLSEngine {
  constructor() {
    this.tables = {
      products: [],
      cart_items: [],
      orders: [],
      admin_users: [],
      audit_logs: [],
      webhook_events: [],
      inventory_reservations: [],
    };
  }

  // Evaluates SELECT query under user context (null = anon/unauthenticated)
  select(table, authUid, filter = {}) {
    const rows = this.tables[table] || [];

    return rows.filter((row) => {
      // 1. Backend-only tables with ZERO client policies
      if (
        table === 'admin_users' ||
        table === 'audit_logs' ||
        table === 'webhook_events' ||
        table === 'inventory_reservations'
      ) {
        return false;
      }

      // 2. Public products catalogue: active, non-deleted products visible to all
      if (table === 'products') {
        return row.is_active === true && !row.deleted_at;
      }

      // 3. User-owned tables: strictly enforce auth.uid() = user_id or cart_id
      if (table === 'cart_items') {
        if (!authUid) return false;
        return (row.cart_id || row.user_id) === authUid;
      }

      if (table === 'orders') {
        if (!authUid) return false;
        return row.user_id === authUid;
      }

      return false;
    });
  }

  // Evaluates INSERT under user context
  insert(table, authUid, newRow) {
    if (
      table === 'admin_users' ||
      table === 'audit_logs' ||
      table === 'webhook_events' ||
      table === 'inventory_reservations' ||
      table === 'products'
    ) {
      throw new Error(`42501: new row violates row-level security policy for table "${table}"`);
    }

    if (table === 'cart_items') {
      const ownerId = newRow.cart_id || newRow.user_id;
      if (!authUid || ownerId !== authUid) {
        throw new Error('42501: new row violates row-level security policy for table "cart_items"');
      }
      this.tables.cart_items.push(newRow);
      return newRow;
    }

    throw new Error(`42501: permission denied for table "${table}"`);
  }
}

// -----------------------------------------------------------------------------
// SUITE: SUPABASE INTEGRATION SECURITY & DATABASE PREPARATION
// -----------------------------------------------------------------------------
describe('Supabase Integration Security & Database Preparation Tests', () => {
  const aliceId = '11111111-aaaa-bbbb-cccc-111111111111';
  const bobId = '22222222-aaaa-bbbb-cccc-222222222222';
  const sampleProductId = '33333333-aaaa-bbbb-cccc-333333333333';

  // ---------------------------------------------------------------------------
  // 1. ENVIRONMENT VARIABLE SECURITY (Unit / Configuration Tests)
  // ---------------------------------------------------------------------------
  describe('1. Environment Variable Security & Client Isolation [Unit Tests]', () => {
    it('.env.local is ignored in .gitignore', () => {
      const gitignore = fs.readFileSync(path.resolve(process.cwd(), '.gitignore'), 'utf8');
      assert.match(gitignore, /\.env\*\.local/, '.env*.local must be listed in .gitignore');
    });

    it('no secret keys are exposed under NEXT_PUBLIC_ variables in .env.local', () => {
      if (fs.existsSync(path.resolve(process.cwd(), '.env.local'))) {
        const envContent = fs.readFileSync(path.resolve(process.cwd(), '.env.local'), 'utf8');
        const lines = envContent.split('\n');
        for (const line of lines) {
          if (line.startsWith('NEXT_PUBLIC_')) {
            assert.doesNotMatch(
              line,
              /sb_secret_|service_role/i,
              'NEXT_PUBLIC_ variable must never contain secret / service role keys'
            );
          }
        }
      }
    });

    it('lib/supabase/admin.ts throws an error if called in a browser environment', async () => {
      global.window = {};
      try {
        await assert.rejects(
          async () => {
            const mod = await import('../lib/supabase/admin.ts');
            mod.createAdminClient();
          },
          /This module cannot be imported from a Client Component|Security violation/
        );
      } finally {
        delete global.window;
      }
    });
  });

  // ---------------------------------------------------------------------------
  // 2. SIMULATED DATABASE RLS POLICIES (Simulated Engine Tests)
  // ---------------------------------------------------------------------------
  describe('2. Database RLS & Multi-Tenant Data Isolation [Simulated Engine Tests]', () => {
    it('unauthenticated access to admin_users, audit_logs, and webhook_events returns 0 rows (denied)', () => {
      const db = new MockPostgresRLSEngine();
      db.tables.admin_users.push({ user_id: 'admin-id' });
      db.tables.audit_logs.push({ action: 'admin_login', entity_id: 'admin-id' });
      db.tables.webhook_events.push({ event_id: 'evt_123', processing_status: 'processed' });

      // Unauthenticated client (authUid = null)
      assert.equal(db.select('admin_users', null).length, 0);
      assert.equal(db.select('audit_logs', null).length, 0);
      assert.equal(db.select('webhook_events', null).length, 0);
      assert.equal(db.select('inventory_reservations', null).length, 0);
    });

    it('customer Alice can only view and insert her own cart items, never Bob items', () => {
      const db = new MockPostgresRLSEngine();
      db.insert('cart_items', aliceId, { cart_id: aliceId, product_id: sampleProductId, quantity: 2 });
      db.insert('cart_items', bobId, { cart_id: bobId, product_id: sampleProductId, quantity: 1 });

      // Alice queries cart_items
      const aliceItems = db.select('cart_items', aliceId);
      assert.equal(aliceItems.length, 1);
      assert.equal(aliceItems[0].product_id, sampleProductId);
      assert.equal(aliceItems[0].cart_id, aliceId);

      // Bob queries cart_items
      const bobItems = db.select('cart_items', bobId);
      assert.equal(bobItems.length, 1);
      assert.equal(bobItems[0].product_id, sampleProductId);
      assert.equal(bobItems[0].cart_id, bobId);

      // Alice attempting to insert a cart item with Bob's cart_id is blocked
      assert.throws(
        () => db.insert('cart_items', aliceId, { cart_id: bobId, product_id: sampleProductId, quantity: 1 }),
        /violates row-level security policy/
      );
    });

    it('unauthenticated client can view active products, but cannot modify products', () => {
      const db = new MockPostgresRLSEngine();
      db.tables.products.push({ id: 'p1', slug: 'lip-balm', is_active: true, deleted_at: null });
      db.tables.products.push({ id: 'p2', slug: 'draft-item', is_active: false, deleted_at: null });
      db.tables.products.push({ id: 'p3', slug: 'deleted-item', is_active: true, deleted_at: '2026-11-01' });

      // Unauthenticated guest selects products (only active and non-deleted)
      const publicProducts = db.select('products', null);
      assert.equal(publicProducts.length, 1);
      assert.equal(publicProducts[0].slug, 'lip-balm');

      // Unauthenticated insert is rejected by RLS
      assert.throws(
        () => db.insert('products', null, { slug: 'hacked-product' }),
        /violates row-level security policy/
      );
    });
  });

  // ---------------------------------------------------------------------------
  // 3. SCHEMA INTEGRITY & SQL MIGRATION AUDIT (Static SQL Schema Checks)
  // ---------------------------------------------------------------------------
  describe('3. Schema Integrity & SQL Migration Audit [Static SQL Checks]', () => {
    it('verifies all 14 requested entity schemas are defined with RLS enabled across migrations', () => {
      const migrationsDir = path.resolve(process.cwd(), 'supabase/migrations');
      const migrationFiles = fs.readdirSync(migrationsDir).filter((f) => f.endsWith('.sql'));
      const combinedSql = migrationFiles
        .map((file) => fs.readFileSync(path.join(migrationsDir, file), 'utf8'))
        .join('\n');

      const requiredTables = [
        'profiles',
        'products',
        'addresses',
        'carts',
        'cart_items',
        'coupons',
        'coupon_redemptions',
        'orders',
        'order_items',
        'payments',
        'refunds',
        'audit_logs',
        'webhook_events',
        'inventory_reservations',
      ];

      for (const table of requiredTables) {
        const tableRegex = new RegExp(`CREATE TABLE (IF NOT EXISTS )?public\\.${table}`, 'i');
        assert.match(combinedSql, tableRegex, `Table public.${table} must be defined in migrations`);

        const rlsRegex = new RegExp(`ALTER TABLE public\\.${table} ENABLE ROW LEVEL SECURITY`, 'i');
        assert.match(combinedSql, rlsRegex, `Table public.${table} must have RLS enabled`);
      }
    });

    it('verifies cart_items uses product_id UUID and UNIQUE(cart_id, product_id)', () => {
      const coreSchemaPath = path.resolve(
        process.cwd(),
        'supabase/migrations/20261104130000_ecommerce_core_schema.sql'
      );
      const sql = fs.readFileSync(coreSchemaPath, 'utf8');

      assert.match(sql, /product_id uuid references public\.products\(id\)/i);
      assert.match(sql, /constraint unique_cart_product unique \(cart_id, product_id\)/i);
    });

    it('verifies universal 18.00 and 3304 defaults are NOT present on order_items', () => {
      const coreSchemaPath = path.resolve(
        process.cwd(),
        'supabase/migrations/20261104130000_ecommerce_core_schema.sql'
      );
      const sql = fs.readFileSync(coreSchemaPath, 'utf8');

      assert.doesNotMatch(
        sql,
        /tax_rate numeric\(4, 2\) default 18\.00/i,
        'Universal 18.00 tax rate default must be removed from order_items'
      );
      assert.doesNotMatch(
        sql,
        /hsn_code text default '3304'/i,
        'Universal 3304 HSN code default must be removed from order_items'
      );
    });

    it('verifies products table enforces verified HSN, tax_rate, and soft deletion deleted_at', () => {
      const coreSchemaPath = path.resolve(
        process.cwd(),
        'supabase/migrations/20261104130000_ecommerce_core_schema.sql'
      );
      const sql = fs.readFileSync(coreSchemaPath, 'utf8');

      assert.match(sql, /hsn_code text not null/i);
      assert.match(sql, /tax_rate numeric\(4, 2\) not null check/i);
      assert.match(sql, /deleted_at timestamptz/i);
    });

    it('verifies validate_coupon uses SET search_path = "" and calculates subtotal from database cart', () => {
      const coreSchemaPath = path.resolve(
        process.cwd(),
        'supabase/migrations/20261104130000_ecommerce_core_schema.sql'
      );
      const sql = fs.readFileSync(coreSchemaPath, 'utf8');

      assert.match(sql, /create or replace function public\.validate_coupon/i);
      assert.match(sql, /security definer/i);
      assert.match(sql, /set search_path = ''/i);
      assert.match(sql, /from public\.cart_items ci/i);
      assert.match(sql, /revoke execute on function public\.validate_coupon/i);
      assert.match(sql, /grant execute on function public\.validate_coupon\(text\) to authenticated/i);
    });

    it('verifies redeem_coupon locks coupon row atomically with FOR UPDATE', () => {
      const coreSchemaPath = path.resolve(
        process.cwd(),
        'supabase/migrations/20261104130000_ecommerce_core_schema.sql'
      );
      const sql = fs.readFileSync(coreSchemaPath, 'utf8');

      assert.match(sql, /create or replace function public\.redeem_coupon/i);
      assert.match(sql, /for update/i);
      assert.match(sql, /revoke execute on function public\.redeem_coupon/i);
    });

    it('verifies audit_logs enforces append-only immutability trigger and revokes mutations', () => {
      const adminAuditSqlPath = path.resolve(
        process.cwd(),
        'supabase/migrations/20261104120000_admin_auth_and_audit.sql'
      );
      const sql = fs.readFileSync(adminAuditSqlPath, 'utf8');

      assert.match(sql, /create or replace function public\.prevent_audit_logs_mutation/i);
      assert.match(sql, /before update or delete on public\.audit_logs/i);
      assert.match(sql, /revoke update, delete, truncate on public\.audit_logs from public, anon, authenticated/i);
    });

    it('verifies storage buckets reject active SVG formats and enforce 5MB limits', () => {
      const storageSqlPath = path.resolve(
        process.cwd(),
        'supabase/migrations/20261104140000_storage_buckets.sql'
      );
      const sql = fs.readFileSync(storageSqlPath, 'utf8');

      assert.doesNotMatch(
        sql,
        /'image\/svg\+xml'/i,
        'Storage buckets must disallow active SVG formats to prevent Stored XSS'
      );
      assert.match(sql, /5242880/);
    });
  });

  // ---------------------------------------------------------------------------
  // 4. SERVER IDENTITY VERIFICATION (Unit / Mocked Auth Tests)
  // ---------------------------------------------------------------------------
  describe('4. Server Identity Verification Standards [Unit / Mocked Auth Tests]', () => {
    it('verifies that server authentication guards use getUser() instead of getSession()', () => {
      const filesWithDirectAuth = [
        path.resolve(process.cwd(), 'lib/supabase/middleware.ts'),
        path.resolve(process.cwd(), 'lib/admin-auth.ts'),
        path.resolve(process.cwd(), 'app/api/cart/route.ts'),
        path.resolve(process.cwd(), 'app/api/orders/verify/route.ts'),
      ];

      for (const filePath of filesWithDirectAuth) {
        if (fs.existsSync(filePath)) {
          const content = fs.readFileSync(filePath, 'utf8');
          assert.match(content, /\.auth\.getUser\(\)/, `${path.basename(filePath)} must use auth.getUser()`);
          assert.doesNotMatch(content, /\.auth\.getSession\(\)/, `${path.basename(filePath)} must never use auth.getSession() for server authorization`);
        }
      }

      // Also verify proxy.ts never calls getSession
      const proxyContent = fs.readFileSync(path.resolve(process.cwd(), 'proxy.ts'), 'utf8');
      assert.doesNotMatch(proxyContent, /\.auth\.getSession\(\)/, 'proxy.ts must never use getSession()');
    });
  });
});
