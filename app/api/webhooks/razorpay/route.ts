import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendOrderConfirmationEmail } from '@/lib/email';
import {
  verifyRazorpayWebhookSignature,
  verifyPaymentCapturedAndAmount,
} from '@/lib/payment-verify';

interface RazorpayWebhookPayload {
  id?: string;
  event_id?: string;
  event?: string;
  payload?: {
    payment?: {
      entity?: {
        id?: string;
        order_id?: string;
        amount?: number;
        currency?: string;
        status?: string;
      };
    };
  };
}

interface OrderItemRow {
  product_name: string;
  quantity: number;
  unit_price: number;
}

export async function POST(request: Request) {
  let eventId: string | null = null;
  let adminSupabase: ReturnType<typeof createAdminClient> | null = null;

  try {
    // 1. Read RAW request body for cryptographic signature verification
    const rawBody = await request.text();
    const signature = request.headers.get('x-razorpay-signature');
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    const isProduction = process.env.NODE_ENV === 'production';
    const isPlaceholderSecret = !webhookSecret || webhookSecret.includes('placeholder');

    // 2. Secret Configuration & Fail-Closed in Production
    if (isPlaceholderSecret) {
      if (isProduction) {
        return NextResponse.json(
          { error: 'Webhook secret is not configured in production.' },
          { status: 503 }
        );
      }
      console.warn('[Webhook Warning] RAZORPAY_WEBHOOK_SECRET is unset; running in development mode.');
    } else {
      if (!signature) {
        return NextResponse.json({ error: 'Missing webhook signature' }, { status: 400 });
      }

      // Timing-Safe HMAC SHA256 Signature Verification via shared helper
      if (!verifyRazorpayWebhookSignature({ rawBody, signature, secret: webhookSecret })) {
        console.error('[Webhook Signature Mismatch] Invalid signature rejected.');
        return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
      }
    }

    // 3. Parse JSON Event Payload
    let event: RazorpayWebhookPayload;
    try {
      event = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: 'Malformed JSON payload' }, { status: 400 });
    }

    const payloadHash = crypto.createHash('sha256').update(rawBody).digest('hex');
    eventId =
      request.headers.get('x-razorpay-event-id') ||
      event.id ||
      event.event_id ||
      `evt_${payloadHash}`;
    const eventType = event.event || 'unknown';

    adminSupabase = createAdminClient();

    // 4. Insert into webhook_events first for strictly once-only deduplication
    const { error: insertError } = await adminSupabase
      .from('webhook_events')
      .insert({
        gateway: 'razorpay',
        event_id: eventId,
        event_type: eventType,
        processing_status: 'processing',
        payload_hash: payloadHash,
      });

    if (insertError) {
      // Postgres error code 23505 indicates unique constraint violation (duplicate event)
      if (insertError.code === '23505' || insertError.message?.includes('duplicate key')) {
        const { data: existingEvent, error: fetchErr } = await adminSupabase
          .from('webhook_events')
          .select('processing_status, created_at')
          .eq('event_id', eventId)
          .single();

        if (fetchErr || !existingEvent) {
          console.warn('[Webhook Fetch Existing Error]', fetchErr);
        } else {
          // If "processed", skip
          if (existingEvent.processing_status === 'processed') {
            return NextResponse.json({ received: true, duplicate: true, status: 'processed' });
          }

          // If "processing" older than 2 minutes or "failed", reprocess it
          const isFailed = existingEvent.processing_status === 'failed';
          const ageMs = Date.now() - new Date(existingEvent.created_at).getTime();
          const isStaleProcessing =
            existingEvent.processing_status === 'processing' && ageMs > 2 * 60 * 1000;

          if (isFailed || isStaleProcessing) {
            console.log(
              `[Webhook Reprocessing] Retrying event ${eventId} (previous status: ${existingEvent.processing_status}, age: ${Math.round(ageMs / 1000)}s)`
            );
            await adminSupabase
              .from('webhook_events')
              .update({
                processing_status: 'processing',
                processed_at: null,
              })
              .eq('event_id', eventId);
          } else {
            // Still actively processing (< 2 mins)
            console.log(
              `[Webhook Concurrency] Event ${eventId} is currently processing. Skipping duplicate concurrent delivery.`
            );
            return NextResponse.json({ received: true, duplicate: true, status: 'processing' });
          }
        }
      } else {
        console.warn('[Webhook Event Record Warning]', insertError);
      }
    }

    // 5. Handle Payment Events (payment.captured / order.paid)
    if (eventType === 'payment.captured' || eventType === 'order.paid') {
      const payment = event.payload?.payment?.entity;
      const razorpayOrderId = payment?.order_id;
      const razorpayPaymentId = payment?.id;

      if (!razorpayOrderId) {
        await adminSupabase
          .from('webhook_events')
          .update({
            processing_status: 'skipped',
            processed_at: new Date().toISOString(),
          })
          .eq('event_id', eventId);

        return NextResponse.json({ received: true, skipped: true });
      }

      // Check amount and currency against stored order
      const { data: storedOrder, error: orderFetchError } = await adminSupabase
        .from('orders')
        .select('*, order_items(*)')
        .eq('razorpay_order_id', razorpayOrderId)
        .maybeSingle();

      if (orderFetchError || !storedOrder) {
        console.warn(`[Webhook Order Lookup] No matching order found for Razorpay order ID ${razorpayOrderId}`);
        await adminSupabase
          .from('webhook_events')
          .update({
            processing_status: 'failed',
            processed_at: new Date().toISOString(),
          })
          .eq('event_id', eventId);

        return NextResponse.json(
          { error: 'Order not found for gateway order ID' },
          { status: 404 }
        );
      }

      // Verify status, amount in paise, and currency via shared helper
      const verification = verifyPaymentCapturedAndAmount({
        payment: {
          status: payment?.status,
          amount: payment?.amount,
          currency: payment?.currency,
        },
        orderTotalRupees: storedOrder.total,
      });

      if (!verification.valid) {
        console.error(`[Webhook Verification Mismatch] ${verification.error}`);
        await adminSupabase
          .from('webhook_events')
          .update({
            processing_status: 'failed',
            processed_at: new Date().toISOString(),
          })
          .eq('event_id', eventId);

        return NextResponse.json(
          { error: verification.error },
          { status: 400 }
        );
      }

      // 6. ATOMIC PAID TRANSITION:
      // update orders set status='paid', razorpay_payment_id=$1, updated_at=now() where id=$2 and status='pending' returning id
      const { data: updatedOrders, error: updateError } = await adminSupabase
        .from('orders')
        .update({
          status: 'paid',
          razorpay_payment_id: razorpayPaymentId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', storedOrder.id)
        .eq('status', 'pending')
        .select('id');

      if (updateError) {
        throw updateError;
      }

      // Only if a row is returned: clear the cart and send confirmation email
      if (updatedOrders && updatedOrders.length > 0) {
        // Clear server cart for user
        if (storedOrder.user_id) {
          await adminSupabase.from('carts').delete().eq('user_id', storedOrder.user_id);
        }

        // Send confirmation email
        const address = storedOrder.address_snapshot || {};
        const customerEmail = address.email || storedOrder.user_email;
        if (customerEmail) {
          try {
            const orderItems = (storedOrder.order_items || []) as OrderItemRow[];
            const items = orderItems.map((i) => ({
              name: i.product_name,
              quantity: i.quantity,
              price: i.unit_price,
            }));

            sendOrderConfirmationEmail({
              toEmail: customerEmail,
              customerName: address.name || 'Customer',
              orderId: storedOrder.id,
              total: storedOrder.total,
              items,
              address,
            }).catch((err) => console.error('[Async Webhook Email Send Failed]', err));
          } catch (emailErr) {
            console.error('[Webhook Email Assembly Exception]', emailErr);
          }
        }
      } else {
        // If no row is returned, read the order's current status (a read for reporting only):
        const { data: currentOrder, error: checkError } = await adminSupabase
          .from('orders')
          .select('status')
          .eq('id', storedOrder.id)
          .maybeSingle();

        if (checkError || !currentOrder) {
          // For the webhook, mark the event "failed" and return 500 so it retries.
          await adminSupabase
            .from('webhook_events')
            .update({
              processing_status: 'failed',
              processed_at: new Date().toISOString(),
            })
            .eq('event_id', eventId);

          return NextResponse.json(
            { error: 'Order not found upon status check' },
            { status: 500 }
          );
        }

        if (currentOrder.status === 'cancelled') {
          // 'cancelled' (payment captured after cancellation): do NOT change the order.
          // Log server-side warning "PAYMENT RECEIVED FOR CANCELLED ORDER <id> <payment_id> needs refund review" (no secrets, no card data)
          console.warn(
            `PAYMENT RECEIVED FOR CANCELLED ORDER ${storedOrder.id} ${razorpayPaymentId || ''} needs refund review`
          );

          // Write durable audit_logs row (no secrets, no card data)
          try {
            await adminSupabase.from('audit_logs').insert({
              action: 'payment_on_cancelled_order',
              entity_type: 'order',
              entity_id: storedOrder.id,
              new_value: {
                payment_id: razorpayPaymentId,
                amount: storedOrder.total,
                currency: 'INR',
              },
            });
          } catch (auditErr) {
            console.error('[Audit Log Insert Error]', auditErr);
          }

          // Return 200 so Razorpay stops retrying
          await adminSupabase
            .from('webhook_events')
            .update({
              processing_status: 'processed',
              processed_at: new Date().toISOString(),
            })
            .eq('event_id', eventId);

          return NextResponse.json({
            received: true,
            note: 'Payment received for cancelled order. Flagged for review.',
          });
        }

        // 'paid' (or already moved on to shipped/delivered after being paid): treat as already processed, return 200.
      }

      // Set status to "processed" ONLY after the order update succeeds
      await adminSupabase
        .from('webhook_events')
        .update({
          processing_status: 'processed',
          processed_at: new Date().toISOString(),
        })
        .eq('event_id', eventId);
    } else {
      // Non-payment unhandled event
      await adminSupabase
        .from('webhook_events')
        .update({
          processing_status: 'skipped',
          processed_at: new Date().toISOString(),
        })
        .eq('event_id', eventId);
    }

    return NextResponse.json({ received: true });
  } catch (error: unknown) {
    console.error('[Webhook Exception]', error);

    // Set the status to "failed" in catch block and return 500 so Razorpay retries
    if (eventId && adminSupabase) {
      try {
        await adminSupabase
          .from('webhook_events')
          .update({
            processing_status: 'failed',
            processed_at: new Date().toISOString(),
          })
          .eq('event_id', eventId);
      } catch (statusErr) {
        console.error('[Webhook Failed Status Update Error]', statusErr);
      }
    }

    const message = error instanceof Error ? error.message : 'Webhook processing failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
