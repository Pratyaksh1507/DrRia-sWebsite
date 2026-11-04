import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendOrderConfirmationEmail } from '@/lib/email';
import { checkRateLimit } from '@/lib/rate-limit';
import {
  verifyRazorpayPaymentSignature,
  verifyPaymentCapturedAndAmount,
} from '@/lib/payment-verify';

const verifyPaymentSchema = z.object({
  orderId: z.string().min(1),
  razorpay_order_id: z.string().min(1),
  razorpay_payment_id: z.string().min(1),
  razorpay_signature: z.string().min(1),
});

interface OrderItemRow {
  product_name: string;
  quantity: number;
  unit_price: number;
}

export async function POST(request: Request) {
  // 1. Rate Limiting per client IP
  const ip = request.headers.get('x-forwarded-for') || 'local';
  if (!checkRateLimit(`order_verify_${ip}`, 15, 60000)) {
    return NextResponse.json(
      { error: 'Too many requests. Please slow down.' },
      { status: 429 }
    );
  }

  try {
    const body = await request.json();
    const validation = verifyPaymentSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const { orderId, razorpay_order_id, razorpay_payment_id, razorpay_signature } =
      validation.data;

    // 2. Authenticate the User
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized request.' },
        { status: 401 }
      );
    }

    const adminSupabase = createAdminClient();

    // 3. Confirm razorpay_order_id belongs to the signed-in user's order
    const { data: order, error: fetchError } = await adminSupabase
      .from('orders')
      .select('*, order_items(*)')
      .eq('id', orderId)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !order) {
      return NextResponse.json(
        { error: 'Order not found or access denied.' },
        { status: 404 }
      );
    }

    if (order.razorpay_order_id !== razorpay_order_id) {
      return NextResponse.json(
        { error: 'Razorpay order ID mismatch.' },
        { status: 400 }
      );
    }

    // 4. Secret Key Validation & Production Fail-Closed
    const isProduction = process.env.NODE_ENV === 'production';
    const rzpSecret = process.env.RAZORPAY_KEY_SECRET;
    const isPlaceholderSecret = !rzpSecret || rzpSecret.includes('placeholder');

    if (isPlaceholderSecret) {
      if (isProduction) {
        return NextResponse.json(
          { error: 'Payment gateway configuration is unavailable in production.' },
          { status: 503 }
        );
      }
      // ONLY allow mock verification in non-production environments
      console.log('[Payment Verification Mock] Gateway secret unset; running in development test mode.');
    } else {
      // 5. Timing-Safe HMAC Signature Verification
      if (
        !verifyRazorpayPaymentSignature({
          orderId: razorpay_order_id,
          paymentId: razorpay_payment_id,
          signature: razorpay_signature,
          secret: rzpSecret,
        })
      ) {
        return NextResponse.json(
          { error: 'Payment signature verification failed. Tampering detected.' },
          { status: 400 }
        );
      }

      // 6. Verify Payment Status, Amount, and Currency via Razorpay API
      const rzpKeyId = process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
      if (!rzpKeyId) {
        return NextResponse.json(
          { error: 'Razorpay Key ID is not configured.' },
          { status: 500 }
        );
      }

      const authHeader = Buffer.from(`${rzpKeyId}:${rzpSecret}`).toString('base64');
      const rzpRes = await fetch(`https://api.razorpay.com/v1/payments/${razorpay_payment_id}`, {
        headers: {
          Authorization: `Basic ${authHeader}`,
        },
      });

      if (!rzpRes.ok) {
        return NextResponse.json(
          { error: 'Failed to verify payment status with payment gateway.' },
          { status: 400 }
        );
      }

      const payment = await rzpRes.json();
      const verification = verifyPaymentCapturedAndAmount({
        payment: {
          status: payment?.status,
          amount: payment?.amount,
          currency: payment?.currency,
        },
        orderTotalRupees: order.total,
      });

      if (!verification.valid) {
        return NextResponse.json(
          { error: verification.error },
          { status: 400 }
        );
      }
    }

    // 7. ATOMIC PAID TRANSITION:
    // update orders set status='paid', razorpay_payment_id=$1, updated_at=now() where id=$2 and status='pending' returning id
    const { data: updatedOrders, error: updateError } = await adminSupabase
      .from('orders')
      .update({
        status: 'paid',
        razorpay_payment_id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId)
      .eq('status', 'pending')
      .select('id');

    if (updateError) {
      throw updateError;
    }

    // 8. Only if a row is returned: clear the cart and send the confirmation email.
    if (updatedOrders && updatedOrders.length > 0) {
      // Clear Server-Side Cart for User
      await adminSupabase.from('carts').delete().eq('user_id', user.id);

      // Send Order Confirmation Email Asynchronously
      if (user.email) {
        try {
          const address = order.address_snapshot || {
            line1: 'Address provided at checkout',
            city: '',
            state: '',
            pincode: '',
          };

          const orderItems = (order.order_items || []) as OrderItemRow[];
          const items = orderItems.map((i) => ({
            name: i.product_name,
            quantity: i.quantity,
            price: i.unit_price,
          }));

          sendOrderConfirmationEmail({
            toEmail: user.email,
            customerName: address.name || user.user_metadata?.full_name || 'Customer',
            orderId,
            total: order.total,
            items,
            address,
          }).catch((err) => console.error('[Async Email Send Failed]', err));
        } catch (emailErr) {
          console.error('[Verify Email Assembly Exception]', emailErr);
        }
      }

      return NextResponse.json({
        success: true,
        orderId,
        message: 'Payment verified successfully.',
      });
    }

    // 9. If no row is returned, read the order's current status (a read for reporting only):
    const { data: currentOrder, error: statusReadError } = await adminSupabase
      .from('orders')
      .select('status')
      .eq('id', orderId)
      .maybeSingle();

    if (statusReadError || !currentOrder) {
      return NextResponse.json({ error: 'Order not found.' }, { status: 404 });
    }

    if (currentOrder.status === 'cancelled') {
      console.warn(
        `PAYMENT RECEIVED FOR CANCELLED ORDER ${orderId} ${razorpay_payment_id} needs refund review`
      );

      // Write durable audit_logs row (no secrets, no card data)
      try {
        await adminSupabase.from('audit_logs').insert({
          action: 'payment_on_cancelled_order',
          entity_type: 'order',
          entity_id: orderId,
          new_value: {
            payment_id: razorpay_payment_id,
            amount: order.total,
            currency: 'INR',
          },
        });
      } catch (auditErr) {
        console.error('[Audit Log Insert Error]', auditErr);
      }

      return NextResponse.json({
        success: false,
        code: 'ORDER_CANCELLED_PAYMENT_RECEIVED',
        message: 'Payment received for a cancelled order. Our team will contact you about a refund.',
        orderId,
      });
    }

    // 'paid' (or already moved on to shipped/delivered after being paid): treat as already processed, return 200.
    return NextResponse.json({
      success: true,
      orderId,
      message: 'Payment already verified.',
    });
  } catch (error: unknown) {
    console.error('[Payment Verification Error]', error);
    const message = error instanceof Error ? error.message : 'Payment verification failed.';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
