import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getProductBySlug, ProductQueryError } from '@/lib/products';
import { getRazorpayKeyId } from '@/lib/payment-verify';
import { productSlugSchema } from '@/lib/cart-schema';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendOrderConfirmationEmail } from '@/lib/email';
import { checkRateLimit } from '@/lib/rate-limit';
import { calculateGstBreakdown } from '@/lib/gst';
import { decrementProductStock } from '@/lib/inventory';

interface CouponRow {
  id: string;
  code: string;
  discount_type: 'percentage' | 'flat';
  discount_value: number;
  min_order_value: number;
  max_discount: number | null;
  usage_limit: number | null;
  times_used: number;
  is_active: boolean;
  starts_at: string;
  expires_at: string | null;
}

const createOrderSchema = z.object({
  items: z
    .array(
      z.object({
        slug: productSlugSchema,
        quantity: z.number().int().min(1).max(20),
      })
    )
    .min(1, 'Cart cannot be empty'),
  address: z.object({
    name: z.string().min(2, 'Name is required'),
    phone: z.string().regex(/^[6-9]\d{9}$/, 'Valid 10-digit mobile number required'),
    line1: z.string().min(3, 'Address line 1 is required'),
    line2: z.string().optional().default(''),
    city: z.string().min(2, 'City is required'),
    state: z.string().min(2, 'State is required'),
    pincode: z.string().regex(/^\d{6}$/, 'Valid 6-digit PIN code required'),
  }),
  paymentMethod: z.enum(['online', 'cod']).optional().default('online'),
  idempotencyKey: z.string().optional(),
  couponCode: z.string().max(30).optional(),
});

export async function POST(request: Request) {
  const ip = request.headers.get('x-forwarded-for') || 'local';
  if (!checkRateLimit(`order_create_${ip}`)) {
    return NextResponse.json(
      { error: 'Too many requests. Please slow down.' },
      { status: 429 }
    );
  }

  try {
    const body = await request.json();
    const validation = createOrderSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const { items, address, paymentMethod, idempotencyKey, couponCode } = validation.data;

    // Check user authentication
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required. Please sign in.' },
        { status: 401 }
      );
    }

    const adminSupabase = createAdminClient();

    // Idempotency check: check if an order with this idempotency key already exists
    if (idempotencyKey) {
      const { data: existingOrder } = await adminSupabase
        .from('orders')
        .select('*')
        .eq('idempotency_key', idempotencyKey)
        .eq('user_id', user.id)
        .single();

      if (existingOrder) {
        return NextResponse.json({
          orderId: existingOrder.id,
          razorpayOrderId: existingOrder.razorpay_order_id,
          amount: existingOrder.total * 100,
          currency: 'INR',
          keyId: getRazorpayKeyId() || 'rzp_test_placeholder',
          isCod: paymentMethod === 'cod',
        });
      }
    }

    // SERVER-SIDE PRICE RECALCULATION (Never trust client prices!)
    let subtotal = 0;
    const validatedItems: Array<{
      slug: string;
      name: string;
      unitPrice: number;
      quantity: number;
    }> = [];

    for (const item of items) {
      const product = await getProductBySlug(item.slug);
      if (!product || product.isActive === false || !product.inStock) {
        return NextResponse.json(
          { error: `Product not available for purchase: ${item.slug}` },
          { status: 400 }
        );
      }
      const itemTotal = product.price * item.quantity;
      subtotal += itemTotal;
      validatedItems.push({
        slug: product.slug,
        name: product.name,
        unitPrice: product.price,
        quantity: item.quantity,
      });
    }

    // SERVER-SIDE AUTHORITATIVE COUPON VALIDATION & DISCOUNT
    let discountAmount = 0;
    let appliedCoupon: CouponRow | null = null;

    if (couponCode && couponCode.trim()) {
      try {
        const { data: coupon } = await adminSupabase
          .from('coupons')
          .select('*')
          .ilike('code', couponCode.trim())
          .eq('is_active', true)
          .single<CouponRow>();

        const now = new Date();
        if (
          coupon &&
          (!coupon.starts_at || new Date(coupon.starts_at) <= now) &&
          (!coupon.expires_at || new Date(coupon.expires_at) >= now) &&
          (!coupon.usage_limit || coupon.times_used < coupon.usage_limit) &&
          (!coupon.min_order_value || subtotal >= coupon.min_order_value)
        ) {
          const { data: alreadyUsed } = await adminSupabase
            .from('coupon_redemptions')
            .select('id')
            .eq('coupon_id', coupon.id)
            .eq('user_id', user.id)
            .limit(1)
            .maybeSingle();

          if (!alreadyUsed) {
            if (coupon.discount_type === 'percentage') {
              discountAmount = Math.round((subtotal * coupon.discount_value) / 100);
              if (coupon.max_discount && discountAmount > coupon.max_discount) {
                discountAmount = coupon.max_discount;
              }
            } else {
              discountAmount = Math.min(coupon.discount_value, subtotal);
            }
            appliedCoupon = coupon;
          }
        }
      } catch (couponLookupErr) {
        console.warn('[Order Create] Coupon lookup non-fatal error:', couponLookupErr);
      }
    }

    const shipping = 0; // Standard shipping included
    const total = Math.max(0, subtotal - discountAmount + shipping);

    // Generate unique human-readable order ID
    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    const orderId = `DRRIA-${Date.now().toString(36).toUpperCase()}-${randomSuffix}`;

    let razorpayOrderId: string | null = null;

    if (paymentMethod === 'online') {
      razorpayOrderId = `order_${Math.random().toString(36).substring(2, 12)}`;
      const rzpKey = getRazorpayKeyId();
      const rzpSecret = process.env.RAZORPAY_KEY_SECRET;

      if (
        rzpKey &&
        rzpSecret &&
        !rzpKey.includes('placeholder') &&
        !rzpSecret.includes('placeholder')
      ) {
        const authHeader = Buffer.from(`${rzpKey}:${rzpSecret}`).toString('base64');
        const rzpRes = await fetch('https://api.razorpay.com/v1/orders', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Basic ${authHeader}`,
          },
          body: JSON.stringify({
            amount: total * 100, // paise
            currency: 'INR',
            receipt: orderId,
          }),
        });

        if (rzpRes.ok) {
          const rzpData = await rzpRes.json();
          razorpayOrderId = rzpData.id;
        } else {
          console.warn('Razorpay order creation returned non-200; falling back to generated order ID.');
        }
      }
    }

    // Insert order into Supabase database (status: 'pending')
    const { error: orderError } = await adminSupabase.from('orders').insert({
      id: orderId,
      user_id: user.id,
      status: 'pending',
      subtotal,
      shipping,
      total,
      address_snapshot: address,
      razorpay_order_id: razorpayOrderId,
      idempotency_key: idempotencyKey || null,
    });

    if (orderError) {
      console.error('[Database Order Error]', orderError);
    } else {
      // Insert order items with authoritative GST snapshots
      const itemsToInsert = validatedItems.map((item) => {
        const itemGross = item.unitPrice * item.quantity;
        const gst = calculateGstBreakdown(itemGross, address.state);
        return {
          order_id: orderId,
          product_slug: item.slug,
          product_name: item.name,
          unit_price: item.unitPrice,
          quantity: item.quantity,
          tax_rate: gst.ratePercent,
          hsn_code: gst.hsnCode,
          taxable_amount: Math.round(gst.taxableAmount),
          tax_amount: Math.round(gst.totalTax),
          discount_amount: 0,
          total_amount: itemGross,
        };
      });

      await adminSupabase.from('order_items').insert(itemsToInsert);

      // Record coupon redemption if applied
      if (appliedCoupon && discountAmount > 0) {
        try {
          await adminSupabase.from('coupon_redemptions').insert({
            coupon_id: appliedCoupon.id,
            order_id: orderId,
            user_id: user.id,
            discount_amount: discountAmount,
          });
          await adminSupabase
            .from('coupons')
            .update({ times_used: (appliedCoupon.times_used || 0) + 1 })
            .eq('id', appliedCoupon.id);
        } catch (redemptionErr) {
          console.warn('[Order Create] Coupon redemption recording warning:', redemptionErr);
        }
      }
    }

    // If COD, trigger stock decrement and order confirmation email immediately
    if (paymentMethod === 'cod') {
      try {
        await decrementProductStock(
          validatedItems.map((i) => ({ slug: i.slug, quantity: i.quantity }))
        );
      } catch (stockErr) {
        console.warn('[COD Stock Decrement Warning]', stockErr);
      }

      if (user.email) {
        sendOrderConfirmationEmail({
          toEmail: user.email,
          orderId,
          customerName: address.name,
          items: validatedItems.map((i) => ({
            name: i.name,
            quantity: i.quantity,
            price: i.unitPrice,
          })),
          total,
          address,
        }).catch((err) => console.error('[COD Email Dispatch Error]', err));
      }
    }

    return NextResponse.json({
      orderId,
      razorpayOrderId,
      amount: total * 100,
      currency: 'INR',
      subtotal,
      discount: discountAmount,
      total,
      keyId: getRazorpayKeyId() || 'rzp_test_placeholder',
      isCod: paymentMethod === 'cod',
    });
  } catch (error: unknown) {
    if (error instanceof ProductQueryError) {
      console.error('[Order Create] Product catalogue query failed:', error.message);
      return NextResponse.json(
        { error: 'Product catalogue is temporarily unavailable. Please try again later.' },
        { status: 503 }
      );
    }
    console.error('[Order Creation Exception]', error instanceof Error ? error.message : error);
    return NextResponse.json(
      { error: 'Failed to create order. Please try again later.' },
      { status: 500 }
    );
  }
}
