import crypto from 'crypto';

export interface VerifyPaymentSignatureParams {
  orderId: string;
  paymentId: string;
  signature: string;
  secret: string;
}

export interface VerifyWebhookSignatureParams {
  rawBody: string;
  signature: string;
  secret: string;
}

export interface GatewayPaymentEntity {
  status?: string;
  amount?: number;
  currency?: string;
}

export interface VerificationResult {
  valid: boolean;
  error?: string;
}

/**
 * Timing-safe HMAC-SHA256 verification for client payment signatures.
 */
export function verifyRazorpayPaymentSignature({
  orderId,
  paymentId,
  signature,
  secret,
}: VerifyPaymentSignatureParams): boolean {
  if (!secret || !signature) return false;

  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');

  const expectedBuf = Buffer.from(expectedSignature, 'utf8');
  const signatureBuf = Buffer.from(signature, 'utf8');

  if (expectedBuf.length !== signatureBuf.length) {
    return false;
  }

  return crypto.timingSafeEqual(expectedBuf, signatureBuf);
}

/**
 * Timing-safe HMAC-SHA256 verification for Razorpay Webhooks against RAW request body.
 */
export function verifyRazorpayWebhookSignature({
  rawBody,
  signature,
  secret,
}: VerifyWebhookSignatureParams): boolean {
  if (!secret || !signature) return false;

  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex');

  const expectedBuf = Buffer.from(expectedSignature, 'utf8');
  const signatureBuf = Buffer.from(signature, 'utf8');

  if (expectedBuf.length !== signatureBuf.length) {
    return false;
  }

  return crypto.timingSafeEqual(expectedBuf, signatureBuf);
}

/**
 * Validates payment gateway status, amount in paise, and currency against order total.
 */
export function verifyPaymentCapturedAndAmount({
  payment,
  orderTotalRupees,
}: {
  payment: GatewayPaymentEntity;
  orderTotalRupees: number;
}): VerificationResult {
  const expectedAmountPaise = Math.round(orderTotalRupees * 100);

  if (payment.status !== 'captured') {
    return {
      valid: false,
      error: `Payment is not captured. Current status: ${payment.status || 'unknown'}`,
    };
  }

  if (payment.amount === undefined || payment.amount !== expectedAmountPaise) {
    return {
      valid: false,
      error: `Payment amount mismatch. Expected: ${expectedAmountPaise} paise, Received: ${payment.amount} paise`,
    };
  }

  if (payment.currency !== 'INR') {
    return {
      valid: false,
      error: `Payment currency mismatch. Expected: INR, Received: ${payment.currency}`,
    };
  }

  return { valid: true };
}

/**
 * Evaluates whether gateway credentials are configured, enforcing fail-closed in production.
 */
export function checkGatewaySecretConfig({
  secret,
  isProduction,
}: {
  secret?: string;
  isProduction: boolean;
}): { configured: boolean; failClosed: boolean; error?: string } {
  const isPlaceholder = !secret || secret.includes('placeholder');
  if (isPlaceholder) {
    if (isProduction) {
      return {
        configured: false,
        failClosed: true,
        error: 'Payment gateway configuration is unavailable in production.',
      };
    }
    return {
      configured: false,
      failClosed: false,
      error: 'Gateway secret not configured; running in development test mode.',
    };
  }
  return { configured: true, failClosed: false };
}

