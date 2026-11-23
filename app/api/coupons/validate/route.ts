import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { checkRateLimit } from '@/lib/rate-limit';

const validateCouponSchema = z.object({
  code: z
    .string()
    .min(2, 'Coupon code must be at least 2 characters')
    .max(30, 'Coupon code too long')
    .regex(/^[A-Za-z0-9_-]+$/, 'Invalid coupon code format'),
  subtotal: z.number().int().nonnegative().optional(),
});

export async function POST(request: Request) {
  const ip = request.headers.get('x-forwarded-for') || 'local';
  if (!checkRateLimit(`coupon_validate_${ip}`, 10, 60000)) {
    return NextResponse.json(
      { valid: false, error: 'Too many requests. Please try again in a minute.' },
      { status: 429 }
    );
  }

  try {
    const body = await request.json();
    const parsed = validateCouponSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { valid: false, error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { code, subtotal: clientSubtotal } = parsed.data;

    // Check customer authentication (Coupons are bound to customer accounts)
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { valid: false, error: 'Please sign in to your account to apply promo codes.' },
        { status: 401 }
      );
    }

    // Try Supabase RPC first
    try {
      const { data: rpcResult, error: rpcError } = await supabase.rpc(
        'validate_coupon',
        { lookup_code: code.trim() }
      );

      if (!rpcError && rpcResult) {
        if (rpcResult.valid === false) {
          return NextResponse.json(
            { valid: false, error: rpcResult.error || 'Invalid coupon code.' },
            { status: 400 }
          );
        }

        return NextResponse.json({
          valid: true,
          couponId: rpcResult.coupon_id,
          code: rpcResult.code,
          discountType: rpcResult.discount_type,
          discountValue: rpcResult.discount_value,
          discountAmount: rpcResult.discount_amount,
          subtotal: rpcResult.subtotal,
        });
      }
    } catch {
      // Fallback to direct query using admin client if RPC is unavailable or requires active session cart
    }

    // Fallback: Admin client query against public.coupons
    const adminSupabase = createAdminClient();
    const { data: coupon, error: couponError } = await adminSupabase
      .from('coupons')
      .select('*')
      .ilike('code', code.trim())
      .eq('is_active', true)
      .single();

    if (couponError || !coupon) {
      return NextResponse.json(
        { valid: false, error: 'Invalid or expired coupon code.' },
        { status: 400 }
      );
    }

    const now = new Date();
    if (coupon.starts_at && new Date(coupon.starts_at) > now) {
      return NextResponse.json(
        { valid: false, error: 'This coupon is not yet active.' },
        { status: 400 }
      );
    }

    if (coupon.expires_at && new Date(coupon.expires_at) < now) {
      return NextResponse.json(
        { valid: false, error: 'This coupon has expired.' },
        { status: 400 }
      );
    }

    if (coupon.usage_limit && coupon.times_used >= coupon.usage_limit) {
      return NextResponse.json(
        { valid: false, error: 'This coupon has reached its total usage limit.' },
        { status: 400 }
      );
    }

    // Check customer single-use limit in coupon_redemptions
    const { data: priorRedemption } = await adminSupabase
      .from('coupon_redemptions')
      .select('id')
      .eq('coupon_id', coupon.id)
      .eq('user_id', user.id)
      .limit(1)
      .maybeSingle();

    if (priorRedemption) {
      return NextResponse.json(
        { valid: false, error: 'You have already redeemed this coupon code.' },
        { status: 400 }
      );
    }

    const targetSubtotal = clientSubtotal || 0;
    if (coupon.min_order_value && targetSubtotal < coupon.min_order_value) {
      return NextResponse.json(
        {
          valid: false,
          error: `Minimum order value of ₹${coupon.min_order_value} required for this code.`,
        },
        { status: 400 }
      );
    }

    let discountAmount = 0;
    if (coupon.discount_type === 'percentage') {
      discountAmount = Math.round((targetSubtotal * coupon.discount_value) / 100);
      if (coupon.max_discount && discountAmount > coupon.max_discount) {
        discountAmount = coupon.max_discount;
      }
    } else {
      discountAmount = Math.min(coupon.discount_value, targetSubtotal);
    }

    return NextResponse.json({
      valid: true,
      couponId: coupon.id,
      code: coupon.code,
      discountType: coupon.discount_type,
      discountValue: coupon.discount_value,
      discountAmount,
      subtotal: targetSubtotal,
    });
  } catch (err: unknown) {
    console.error('[Coupon Validation Exception]', err);
    return NextResponse.json(
      { valid: false, error: 'Unable to validate coupon at this time.' },
      { status: 500 }
    );
  }
}
