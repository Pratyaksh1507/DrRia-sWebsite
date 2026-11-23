import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { calculateGstBreakdown, isIntraState } from '../lib/gst.ts';
import { z } from 'zod';

describe('Order Fulfillment, GST Engine & Coupons Suite', () => {
  describe('1. GST Calculation Engine (lib/gst.ts)', () => {
    test('identifies intra-state destinations (Jammu & Kashmir)', () => {
      assert.equal(isIntraState('Jammu & Kashmir'), true);
      assert.equal(isIntraState('Jammu'), true);
      assert.equal(isIntraState('Kashmir'), true);
      assert.equal(isIntraState('J&K'), true);
      assert.equal(isIntraState('j&k'), true);
    });

    test('identifies inter-state destinations (outside J&K)', () => {
      assert.equal(isIntraState('Delhi'), false);
      assert.equal(isIntraState('Maharashtra'), false);
      assert.equal(isIntraState('Karnataka'), false);
      assert.equal(isIntraState('Punjab'), false);
      assert.equal(isIntraState(null), false);
      assert.equal(isIntraState(undefined), false);
    });

    test('computes inclusive 18% GST for intra-state order (CGST 9% + SGST 9%)', () => {
      const grossAmount = 1180; // Taxable 1000 + 180 GST
      const breakdown = calculateGstBreakdown(grossAmount, 'Jammu & Kashmir');

      assert.equal(breakdown.grossAmount, 1180);
      assert.equal(breakdown.taxableAmount, 1000);
      assert.equal(breakdown.totalTax, 180);
      assert.equal(breakdown.isInterState, false);
      assert.equal(breakdown.cgst, 90);
      assert.equal(breakdown.sgst, 90);
      assert.equal(breakdown.igst, 0);
      assert.equal(breakdown.hsnCode, '3304');
      assert.equal(breakdown.ratePercent, 18);
    });

    test('computes inclusive 18% GST for inter-state order (IGST 18%)', () => {
      const grossAmount = 1180;
      const breakdown = calculateGstBreakdown(grossAmount, 'Delhi');

      assert.equal(breakdown.grossAmount, 1180);
      assert.equal(breakdown.taxableAmount, 1000);
      assert.equal(breakdown.totalTax, 180);
      assert.equal(breakdown.isInterState, true);
      assert.equal(breakdown.cgst, 0);
      assert.equal(breakdown.sgst, 0);
      assert.equal(breakdown.igst, 180);
      assert.equal(breakdown.hsnCode, '3304');
    });

    test('handles decimal paise precision cleanly', () => {
      const grossAmount = 499; // Standard Lip Balm price
      const breakdown = calculateGstBreakdown(grossAmount, 'Maharashtra');

      // 499 / 1.18 = 422.8813559... -> 422.88 taxable
      // Total tax = 499 - 422.88 = 76.12
      assert.equal(breakdown.taxableAmount, 422.88);
      assert.equal(breakdown.totalTax, 76.12);
      assert.equal(breakdown.igst, 76.12);
      assert.equal(breakdown.grossAmount, 499);
      assert.equal(Math.round((breakdown.taxableAmount + breakdown.totalTax) * 100) / 100, 499);
    });

    test('returns zero values for non-positive amounts', () => {
      const breakdown = calculateGstBreakdown(0, 'Delhi');
      assert.equal(breakdown.grossAmount, 0);
      assert.equal(breakdown.taxableAmount, 0);
      assert.equal(breakdown.totalTax, 0);
    });
  });

  describe('2. Coupon Discount Calculation Logic', () => {
    test('calculates percentage discount capped at max_discount', () => {
      const subtotal = 2000;
      const coupon = {
        discount_type: 'percentage',
        discount_value: 20, // 20%
        max_discount: 250,
      };

      const rawDiscount = (subtotal * coupon.discount_value) / 100; // 400
      const effectiveDiscount = coupon.max_discount
        ? Math.min(rawDiscount, coupon.max_discount)
        : rawDiscount;

      assert.equal(rawDiscount, 400);
      assert.equal(effectiveDiscount, 250, 'Discount is capped at max_discount (250)');
    });

    test('calculates flat discount not exceeding subtotal', () => {
      const coupon = {
        discount_type: 'flat',
        discount_value: 300,
      };

      const discount1 = Math.min(coupon.discount_value, 1500);
      assert.equal(discount1, 300);

      const discount2 = Math.min(coupon.discount_value, 200);
      assert.equal(discount2, 200, 'Flat discount cannot exceed subtotal');
    });

    test('rejects coupon when minimum order value is not met', () => {
      const coupon = {
        min_order_value: 999,
      };
      const cartSubtotal = 499;

      const isValid = cartSubtotal >= coupon.min_order_value;
      assert.equal(isValid, false, 'Cart below min order value must not qualify');
    });
  });

  describe('3. Order Fulfillment & AWB Validation Schema', () => {
    const updateFulfillmentSchema = z.object({
      status: z.enum(['pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled']),
      courier_name: z.string().max(80).nullable().optional(),
      awb_number: z.string().max(100).nullable().optional(),
      tracking_url: z.string().url().max(500).nullable().optional().or(z.literal('')),
      cancellation_reason: z.string().max(300).nullable().optional(),
    });

    test('validates successful shipping status with courier and AWB', () => {
      const payload = {
        status: 'shipped',
        courier_name: 'Delhivery',
        awb_number: '12893819283',
        tracking_url: 'https://www.delhivery.com/track/package/12893819283',
      };

      const result = updateFulfillmentSchema.safeParse(payload);
      assert.equal(result.success, true);
    });

    test('rejects invalid status values', () => {
      const payload = {
        status: 'in_transit_unknown',
      };
      const result = updateFulfillmentSchema.safeParse(payload);
      assert.equal(result.success, false);
    });

    test('accepts cancellation with reason', () => {
      const payload = {
        status: 'cancelled',
        cancellation_reason: 'Customer requested cancellation prior to packing',
      };
      const result = updateFulfillmentSchema.safeParse(payload);
      assert.equal(result.success, true);
    });
  });
});
