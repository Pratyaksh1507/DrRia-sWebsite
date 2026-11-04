import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getProductBySlug } from '@/data/products';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendOrderConfirmationEmail } from '@/lib/email';
import { checkRateLimit } from '@/lib/rate-limit';

const createOrderSchema = z.object({
  items: z
    .array(
      z.object({
        slug: z.string().min(1),
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

    const { items, address, paymentMethod, idempotencyKey } = validation.data;

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
          keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || 'rzp_test_placeholder',
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
      const product = getProductBySlug(item.slug);
      if (!product) {
        return NextResponse.json(
          { error: `Product not found: ${item.slug}` },
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

    const shipping = 0; // Standard shipping included
    const total = subtotal + shipping;

    // Generate unique human-readable order ID
    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    const orderId = `DRRIA-${Date.now().toString(36).toUpperCase()}-${randomSuffix}`;

    let razorpayOrderId: string | null = null;

    if (paymentMethod === 'online') {
      razorpayOrderId = `order_${Math.random().toString(36).substring(2, 12)}`;
      const rzpKey = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
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
      // Insert order items
      const itemsToInsert = validatedItems.map((item) => ({
        order_id: orderId,
        product_slug: item.slug,
        product_name: item.name,
        unit_price: item.unitPrice,
        quantity: item.quantity,
      }));

      await adminSupabase.from('order_items').insert(itemsToInsert);
    }

    // If COD, trigger order confirmation email immediately
    if (paymentMethod === 'cod' && user.email) {
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

    return NextResponse.json({
      orderId,
      razorpayOrderId,
      amount: total * 100,
      currency: 'INR',
      keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || 'rzp_test_placeholder',
      isCod: paymentMethod === 'cod',
    });
  } catch (error: unknown) {
    console.error('[Order Creation Exception]', error);
    const message = error instanceof Error ? error.message : 'Internal server error while creating order.';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
