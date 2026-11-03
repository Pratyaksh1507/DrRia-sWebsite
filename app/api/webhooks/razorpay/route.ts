import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get('x-razorpay-signature');
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    if (!webhookSecret || webhookSecret.includes('placeholder')) {
      console.warn('[Webhook Warning] RAZORPAY_WEBHOOK_SECRET is not configured.');
      return NextResponse.json({ received: true });
    }

    if (!signature) {
      return NextResponse.json({ error: 'Missing webhook signature' }, { status: 400 });
    }

    // Verify webhook HMAC SHA256 signature
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(rawBody)
      .digest('hex');

    if (expectedSignature !== signature) {
      console.error('[Webhook Signature Mismatch] Invalid signature rejected.');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    const event = JSON.parse(rawBody);
    const eventType = event.event;

    // Handle payment.captured or order.paid
    if (eventType === 'payment.captured' || eventType === 'order.paid') {
      const payment = event.payload?.payment?.entity;
      const razorpayOrderId = payment?.order_id;
      const razorpayPaymentId = payment?.id;

      if (razorpayOrderId) {
        const adminSupabase = createAdminClient();

        // Update order status to 'paid' if not already updated
        const { error } = await adminSupabase
          .from('orders')
          .update({
            status: 'paid',
            razorpay_payment_id: razorpayPaymentId,
            updated_at: new Date().toISOString(),
          })
          .eq('razorpay_order_id', razorpayOrderId);

        if (error) {
          console.error('[Webhook Order Update Error]', error);
        } else {
          console.log(`[Webhook Success] Order with Razorpay ID ${razorpayOrderId} marked as paid.`);
          // Clear server cart for the user who placed this order
          const { data: orderData } = await adminSupabase
            .from('orders')
            .select('user_id')
            .eq('razorpay_order_id', razorpayOrderId)
            .maybeSingle();

          if (orderData?.user_id) {
            await adminSupabase.from('carts').delete().eq('user_id', orderData.user_id);
          }
        }
      }
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('[Webhook Exception]', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}

