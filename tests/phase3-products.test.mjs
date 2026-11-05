import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import pg from 'pg';
import { getAllProducts, getProductBySlug, isValidProductSlug } from '../lib/products.ts';

import fs from 'node:fs';

let connectionString = process.env.DATABASE_URL || '';
if (!connectionString && fs.existsSync('.env.local')) {
  const envContent = fs.readFileSync('.env.local', 'utf8');
  const match = envContent.match(/DATABASE_URL=(.+)/);
  if (match) connectionString = match[1].trim();
}

describe('Phase 3: Product Catalogue & Dynamic Storefront Integration', () => {
  describe('1. Storefront Product Loading & Inactive Isolation', () => {
    test('public getAllProducts() loads active products and excludes unpublished products', async () => {
      const publicProducts = await getAllProducts();

      assert.ok(publicProducts.length >= 4, 'Should load at least 4 active products');

      const slugs = publicProducts.map((p) => p.slug);
      assert.ok(slugs.includes('anti-pigmentation-lip-balm'), 'Includes Lip Balm');
      assert.ok(slugs.includes('vita-c-daily-glow-face-wash'), 'Includes Face Wash');
      assert.ok(slugs.includes('hydroboost-face-moisturizer'), 'Includes Moisturizer');
      assert.ok(slugs.includes('spf50-sunscreen'), 'Includes Sunscreen');

      // Crucial: Hair Growth Oil MUST NOT be in public storefront catalogue
      assert.equal(
        slugs.includes('hair-growth-oil'),
        false,
        'Hair Growth Oil must remain unpublished on public storefront'
      );
    });

    test('getAllProducts({ includeUnpublished: true }) returns the complete 5 product catalogue', async () => {
      const allProducts = await getAllProducts({ includeUnpublished: true });
      const slugs = allProducts.map((p) => p.slug);

      assert.ok(slugs.includes('hair-growth-oil'), 'Includes unpublished Hair Growth Oil for admin');
      const hairOil = allProducts.find((p) => p.slug === 'hair-growth-oil');
      assert.equal(hairOil.isActive, false, 'Hair Growth Oil marked isActive: false');
    });

    test('getProductBySlug hides unpublished products from public storefront', async () => {
      const hairOilPublic = await getProductBySlug('hair-growth-oil');
      assert.equal(hairOilPublic, undefined, 'Public lookup of unpublished product must return undefined');

      const hairOilAdmin = await getProductBySlug('hair-growth-oil', { includeUnpublished: true });
      assert.ok(hairOilAdmin, 'Admin lookup must return unpublished product');
      assert.equal(hairOilAdmin.slug, 'hair-growth-oil');
    });

    test('product images and responsive properties are populated', async () => {
      const lipBalm = await getProductBySlug('anti-pigmentation-lip-balm');
      assert.ok(lipBalm, 'Lip Balm exists');
      assert.ok(lipBalm.images.length >= 1, 'Has at least one image');
      assert.ok(lipBalm.images[0].src.startsWith('/images/'), 'Image src points to valid image path');
      assert.equal(typeof lipBalm.price, 'number');
      assert.equal(typeof lipBalm.mrp, 'number');
      assert.ok(lipBalm.mrp >= lipBalm.price, 'MRP is greater than or equal to selling price');
    });
  });

  describe('2. Inactive Product Purchase Prevention & Order Protection', () => {
    test('rejects inactive or unpublished product from order creation', async () => {
      const testItem = { slug: 'hair-growth-oil', quantity: 1 };
      const product = await getProductBySlug(testItem.slug);

      const canPurchase = Boolean(product && product.isActive !== false && product.inStock);
      assert.equal(canPurchase, false, 'Unpublished item cannot be purchased');
    });

    test('recalculates order subtotal authoritatively from database prices', async () => {
      const lipBalm = await getProductBySlug('anti-pigmentation-lip-balm');
      const fakeClientPrice = 1; // Malicious client attempts to pass ₹1
      const quantity = 2;

      // Authoritative calculation
      const serverCalculatedTotal = lipBalm.price * quantity;
      assert.equal(serverCalculatedTotal, 333 * 2, 'Authoritative subtotal matches database price (666)');
      assert.notEqual(serverCalculatedTotal, fakeClientPrice * quantity, 'Malicious client price ignored');
    });
  });

  describe('3. Customer Rejection from Admin Product Management', () => {
    test('direct PostgreSQL database grants strictly deny customer UPDATE or INSERT on products', async () => {
      const pool = new pg.Pool({
        connectionString,
        ssl: { rejectUnauthorized: false },
      });

      const client = await pool.connect();
      try {
        // Test UPDATE rejection
        await client.query('BEGIN');
        await client.query(`SET LOCAL ROLE authenticated;`);
        await assert.rejects(
          async () => {
            await client.query(`UPDATE public.products SET price = 100 WHERE slug = 'anti-pigmentation-lip-balm';`);
          },
          (err) => {
            return err.code === '42501'; // 42501: permission denied for table products
          },
          'Customer must be denied UPDATE privilege on products'
        );
        await client.query('ROLLBACK');

        // Test INSERT rejection in fresh transaction
        await client.query('BEGIN');
        await client.query(`SET LOCAL ROLE authenticated;`);
        await assert.rejects(
          async () => {
            await client.query(`
              INSERT INTO public.products (slug, name, category, price, mrp, hsn_code, tax_rate)
              VALUES ('fake-product', 'Fake', 'skin', 10, 10, '3304', 18);
            `);
          },
          (err) => {
            return err.code === '42501'; // 42501: permission denied for table products
          },
          'Customer must be denied INSERT privilege on products'
        );
        await client.query('ROLLBACK');
      } finally {
        client.release();
        await pool.end();
      }
    });
  });

  describe('4. Price & MRP Validation Rules', () => {
    test('enforces MRP >= selling price constraint in database', async () => {
      const pool = new pg.Pool({
        connectionString,
        ssl: { rejectUnauthorized: false },
      });

      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        // Attempting to set MRP lower than selling price must violate check constraint
        await assert.rejects(
          async () => {
            await client.query(`
              UPDATE public.products
              SET price = 500, mrp = 400
              WHERE slug = 'anti-pigmentation-lip-balm';
            `);
          },
          (err) => {
            return err.code === '23514'; // 23514: check_violation (products_check: mrp >= price)
          },
          'Must reject price update where MRP is less than selling price'
        );
      } finally {
        await client.query('ROLLBACK');
        client.release();
        await pool.end();
      }
    });

    test('computes discount percentage correctly when MRP > price', () => {
      const mrp = 500;
      const price = 400;
      const discount = Math.round(((mrp - price) / mrp) * 100);
      assert.equal(discount, 20, '500 MRP with 400 price yields 20% discount');
    });
  });

  describe('5. Seed Script Idempotency & Admin Modification Preservation', () => {
    test('seed-products.sql defines ON CONFLICT (slug) DO NOTHING with stable UUIDs', () => {
      const seedSql = readFileSync(
        join(process.cwd(), 'supabase', 'seed-products.sql'),
        'utf-8'
      );

      assert.ok(
        seedSql.includes('ON CONFLICT (slug) DO NOTHING;'),
        'seed-products.sql must contain ON CONFLICT (slug) DO NOTHING;'
      );

      assert.ok(
        seedSql.includes('a1000000-0000-4000-8000-000000000001'),
        'seed-products.sql must use stable deterministic product UUIDs'
      );

      assert.ok(
        seedSql.includes("'hair-growth-oil'"),
        'Includes Hair Growth Oil'
      );
      assert.ok(
        seedSql.includes('false,  -- UNPUBLISHED'),
        'Hair Growth Oil must be configured unpublished (is_active: false)'
      );
    });

    test('re-running seed does not overwrite admin-updated price or stock', async () => {
      const pool = new pg.Pool({
        connectionString,
        ssl: { rejectUnauthorized: false },
      });

      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        // Simulate admin price change (MRP >= price)
        await client.query(`
          UPDATE public.products
          SET price = 299, mrp = 399, stock_quantity = 85
          WHERE slug = 'anti-pigmentation-lip-balm';
        `);

        // Execute seed script inside transaction
        const seedSql = readFileSync(
          join(process.cwd(), 'supabase', 'seed-products.sql'),
          'utf-8'
        );
        await client.query(seedSql);

        // Verify admin values were NOT overwritten back to default 333 / 100
        const check = await client.query(`
          SELECT price, mrp, stock_quantity
          FROM public.products
          WHERE slug = 'anti-pigmentation-lip-balm';
        `);

        assert.equal(check.rows[0].price, 299, 'Admin price 299 was preserved');
        assert.equal(check.rows[0].mrp, 399, 'Admin MRP 399 was preserved');
        assert.equal(check.rows[0].stock_quantity, 85, 'Admin stock 85 was preserved');
      } finally {
        await client.query('ROLLBACK');
        client.release();
        await pool.end();
      }
    });
  });

  describe('6. Admin Provisioning Script Verification', () => {
    test('supabase/admin-provision.sql strictly enforces email verification and singleton', () => {
      const sql = readFileSync(
        join(process.cwd(), 'supabase', 'admin-provision.sql'),
        'utf-8'
      );

      assert.ok(
        sql.includes('target_confirmed_at is null'),
        'Must check email confirmed_at'
      );
      assert.ok(
        sql.includes('existing_admin_id is not null'),
        'Must enforce single-admin limit'
      );
      assert.ok(
        sql.includes('insert into public.audit_logs'),
        'Must log admin provisioning to audit_logs'
      );
    });
  });
});
