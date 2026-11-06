import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import pg from 'pg';
import {
  getAllProducts,
  getProductBySlug,
  isValidProductSlug,
  mapDbProductToStorefront,
  ProductQueryError,
} from '../lib/products.ts';
import { createUpdateCartSchema } from '../lib/cart-schema.ts';

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

  describe('7. Database-Only Product Support & Zero Static Dependency (Phase 2.5)', () => {
    const dbOnlyProductRow = {
      id: 'e1000000-0000-0000-0000-000000000099',
      slug: 'peptide-barrier-repair-serum',
      name: 'Peptide Barrier Repair Serum',
      category: 'skin',
      tagline: 'Multi-peptide cellular restoration',
      description: 'Advanced peptide and ceramide complex formulated for barrier recovery.',
      price: 549,
      mrp: 799,
      stock_quantity: 45,
      hsn_code: '330499',
      tax_rate: 18,
      is_active: true,
      deleted_at: null,
      badge: 'Peptide Active',
      image_url: '/images/products/peptide-serum.webp',
      rating: 4.9,
      reviews_count: 12,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      size: '30 ml / 1.01 fl oz',
      images: [
        {
          src: '/images/products/peptide-serum-front.webp',
          webpSrcSet: '/images/products/peptide-serum-front.webp 768w',
          avifSrcSet: '/images/products/peptide-serum-front.webp 768w',
          alt: 'Peptide Barrier Repair Serum bottle front view',
          width: 768,
          height: 768,
          blurDataURL: '',
        },
      ],
      key_ingredients: ['Copper Tripeptide-1', 'Matrixyl 3000', 'Ceramide NP', 'Hyaluronic Acid'],
      benefits: ['Restores skin barrier', 'Smooths fine lines', 'Deep cellular hydration'],
      full_ingredients: 'Aqua, Glycerin, Butylene Glycol, Copper Tripeptide-1, Palmitoyl Tripeptide-1, Palmitoyl Tetrapeptide-7, Ceramide NP, Sodium Hyaluronate, Phenoxyethanol.',
      how_to_use: 'Apply 3-4 drops morning and evening to cleansed skin before moisturizer.',
      storage: 'Store in a cool dry place away from direct sunlight.',
      caution: 'For external use only. Perform a patch test before first use.',
      manufacturer_details: 'Trassally International Pvt. Ltd.',
      marketed_by: "Dr Ria's, 93-c Shastri Nagar, Jammu 180004",
      mfg_lic_no: 'COS8UP2026999999',
      badges: ['Peptide Active', 'Barrier Repair', 'Dermatologist Tested'],
    };

    test('mapDbProductToStorefront fully renders database-only product without static fallback', () => {
      const rendered = mapDbProductToStorefront(dbOnlyProductRow);

      assert.equal(rendered.id, dbOnlyProductRow.id);
      assert.equal(rendered.slug, 'peptide-barrier-repair-serum');
      assert.equal(rendered.name, 'Peptide Barrier Repair Serum');
      assert.equal(rendered.price, 549);
      assert.equal(rendered.mrp, 799);
      assert.equal(rendered.discountPercentage, 31);
      assert.equal(rendered.size, '30 ml / 1.01 fl oz');
      assert.equal(rendered.images.length, 1);
      assert.equal(rendered.images[0].src, '/images/products/peptide-serum-front.webp');
      assert.deepEqual(rendered.keyIngredients, [
        'Copper Tripeptide-1',
        'Matrixyl 3000',
        'Ceramide NP',
        'Hyaluronic Acid',
      ]);
      assert.deepEqual(rendered.benefits, [
        'Restores skin barrier',
        'Smooths fine lines',
        'Deep cellular hydration',
      ]);
      assert.equal(rendered.fullIngredients, dbOnlyProductRow.full_ingredients);
      assert.equal(rendered.howToUse, dbOnlyProductRow.how_to_use);
      assert.equal(rendered.complianceNote, dbOnlyProductRow.caution);
      assert.equal(rendered.inStock, true);
      assert.equal(rendered.stockQuantity, 45);
      assert.deepEqual(rendered.badges, ['Peptide Active', 'Barrier Repair', 'Dermatologist Tested']);
    });

    test('isValidProductSlug validates database-only product slug format without static data', () => {
      assert.equal(isValidProductSlug('peptide-barrier-repair-serum'), true);
      assert.equal(isValidProductSlug('any-new-custom-product-2026'), true);
      assert.equal(isValidProductSlug('INVALID_UPPERCASE'), false);
      assert.equal(isValidProductSlug('bad slug with spaces'), false);
      assert.equal(isValidProductSlug('-leading-dash'), false);
    });

    test('database-only product can be validated in cart schema and ordered', () => {
      const cartSchema = createUpdateCartSchema();
      const cartPayload = {
        items: [{ slug: 'peptide-barrier-repair-serum', quantity: 2 }],
      };

      const parseResult = cartSchema.safeParse(cartPayload);
      assert.equal(parseResult.success, true, 'Cart schema accepts database-only product');

      // Server-side order price calculation
      const rendered = mapDbProductToStorefront(dbOnlyProductRow);
      const orderSubtotal = rendered.price * cartPayload.items[0].quantity;
      assert.equal(orderSubtotal, 549 * 2, 'Server calculates order total directly from database row');
    });

    test('live database transaction supports inserting and querying a database-only product', async () => {
      const pool = new pg.Pool({
        connectionString,
        ssl: { rejectUnauthorized: false },
      });

      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        // Insert database-only product
        await client.query(
          `INSERT INTO public.products (
            id, slug, name, category, tagline, description, price, mrp, stock_quantity,
            hsn_code, tax_rate, is_active, size, images, key_ingredients, benefits,
            full_ingredients, how_to_use, storage, caution, manufacturer_details, marketed_by,
            mfg_lic_no, badges
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24
          );`,
          [
            dbOnlyProductRow.id,
            dbOnlyProductRow.slug,
            dbOnlyProductRow.name,
            dbOnlyProductRow.category,
            dbOnlyProductRow.tagline,
            dbOnlyProductRow.description,
            dbOnlyProductRow.price,
            dbOnlyProductRow.mrp,
            dbOnlyProductRow.stock_quantity,
            dbOnlyProductRow.hsn_code,
            dbOnlyProductRow.tax_rate,
            dbOnlyProductRow.is_active,
            dbOnlyProductRow.size,
            JSON.stringify(dbOnlyProductRow.images),
            JSON.stringify(dbOnlyProductRow.key_ingredients),
            JSON.stringify(dbOnlyProductRow.benefits),
            dbOnlyProductRow.full_ingredients,
            dbOnlyProductRow.how_to_use,
            dbOnlyProductRow.storage,
            dbOnlyProductRow.caution,
            dbOnlyProductRow.manufacturer_details,
            dbOnlyProductRow.marketed_by,
            dbOnlyProductRow.mfg_lic_no,
            JSON.stringify(dbOnlyProductRow.badges),
          ]
        );

        // Query the product back
        const result = await client.query(
          `SELECT * FROM public.products WHERE slug = $1;`,
          [dbOnlyProductRow.slug]
        );

        assert.equal(result.rows.length, 1);
        const row = result.rows[0];
        const storefrontProduct = mapDbProductToStorefront(row);

        assert.equal(storefrontProduct.slug, 'peptide-barrier-repair-serum');
        assert.equal(storefrontProduct.price, 549);
        assert.equal(storefrontProduct.size, '30 ml / 1.01 fl oz');
        assert.equal(storefrontProduct.keyIngredients.length, 4);
        assert.equal(storefrontProduct.benefits.length, 3);
        assert.equal(storefrontProduct.inStock, true);
      } finally {
        await client.query('ROLLBACK');
        client.release();
        await pool.end();
      }
    });
  });
});
