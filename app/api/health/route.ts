import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const authHeader = request.headers.get('authorization');
  const secretParam = searchParams.get('secret');

  const requiredSecret = process.env.HEALTH_CHECK_SECRET;
  if (requiredSecret) {
    const bearer = authHeader?.replace('Bearer ', '');
    if (bearer !== requiredSecret && secretParam !== requiredSecret) {
      return NextResponse.json({ error: 'Unauthorized health check' }, { status: 401 });
    }
  }

  // Pure boolean checks — NEVER expose credentials or keys
  const isPresent = (val?: string | null) =>
    Boolean(val && val.trim() !== '' && !val.includes('placeholder') && !val.includes('your_'));

  const supabaseUrlPresent = isPresent(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const supabaseAnonPresent = isPresent(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const supabaseServicePresent = isPresent(process.env.SUPABASE_SERVICE_ROLE_KEY);

  const googlePresent = isPresent(process.env.GOOGLE_CLIENT_ID) ||
    process.env.NEXT_PUBLIC_GOOGLE_AUTH_CONFIGURED === 'true';

  const smsPresent = isPresent(process.env.SMS_API_KEY) ||
    process.env.NEXT_PUBLIC_SMS_CONFIGURED === 'true';

  const emailPresent = isPresent(process.env.EMAIL_PROVIDER_API_KEY) ||
    isPresent(process.env.RESEND_API_KEY);

  const razorpayKeyPresent = isPresent(process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID);
  const razorpaySecretPresent = isPresent(process.env.RAZORPAY_KEY_SECRET);

  const services = {
    supabase: supabaseUrlPresent && supabaseAnonPresent,
    supabaseServiceRole: supabaseServicePresent,
    googleAuth: googlePresent,
    sms: smsPresent,
    email: emailPresent,
    razorpay: razorpayKeyPresent && razorpaySecretPresent,
  };

  const allConfigured = Object.values(services).every(Boolean);

  return NextResponse.json({
    status: allConfigured ? 'healthy' : 'pending_configuration',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    services,
  });
}
