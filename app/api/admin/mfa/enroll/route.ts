import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { checkRateLimit } from '@/lib/rate-limit';
import {
  logAdminAudit,
  extractSessionId,
  setSignedAdminActivityCookie,
  setSignedAdminMfaVerifiedCookie,
} from '@/lib/admin-auth';

const enrollVerifySchema = z
  .object({
    factorId: z.string().min(1, 'Factor ID is required'),
    code: z.string().regex(/^\d{6}$/, 'Enter the 6-digit authenticator code'),
  })
  .strict();

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (
    !supabaseUrl ||
    !supabaseKey ||
    supabaseUrl.includes('placeholder') ||
    supabaseKey.includes('placeholder')
  ) {
    console.error('[Admin Auth] config missing: Supabase URL or publishable key not configured.');
    return NextResponse.json(
      { error: 'Service temporarily unavailable' },
      { status: 503 }
    );
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const adminSupabase = createAdminClient();
    const { data: adminRecord } = await adminSupabase
      .from('admin_users')
      .select('user_id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!adminRecord) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Clean up any prior unverified TOTP factors to avoid factor pollution
    const { data: factorList } = await supabase.auth.mfa.listFactors();
    if (factorList?.all) {
      for (const factor of factorList.all) {
        if (factor.factor_type === 'totp' && factor.status === 'unverified') {
          await supabase.auth.mfa.unenroll({ factorId: factor.id });
        }
      }
    }

    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: 'totp',
      issuer: "Dr Ria's",
      friendlyName: user.email || 'Admin',
    });

    if (error || !data) {
      return NextResponse.json(
        { error: error?.message || 'Failed to initialize MFA enrollment' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      factorId: data.id,
      qrCode: data.totp.qr_code,
      secret: data.totp.secret,
      uri: data.totp.uri,
    });
  } catch (err: unknown) {
    console.error('[Admin MFA Enroll GET Exception]', err);
    return NextResponse.json(
      { error: 'An unexpected error occurred during enrollment' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (
    !supabaseUrl ||
    !supabaseKey ||
    supabaseUrl.includes('placeholder') ||
    supabaseKey.includes('placeholder')
  ) {
    console.error('[Admin Auth] config missing: Supabase URL or publishable key not configured.');
    return NextResponse.json(
      { error: 'Service temporarily unavailable' },
      { status: 503 }
    );
  }

  const ip = request.headers.get('x-forwarded-for') || 'local';

  if (!checkRateLimit(`admin_mfa_enroll_${ip}`, 5, 10 * 60 * 1000)) {
    return NextResponse.json(
      { error: 'Too many attempts. Please try again later.' },
      { status: 429 }
    );
  }

  try {
    const body = await request.json();
    const validation = enrollVerifySchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const { factorId, code } = validation.data;

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Session expired' }, { status: 401 });
    }

    const adminSupabase = createAdminClient();
    const { data: adminRecord } = await adminSupabase
      .from('admin_users')
      .select('user_id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!adminRecord) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const { data: verifyData, error: verifyError } =
      await supabase.auth.mfa.challengeAndVerify({
        factorId,
        code,
      });

    if (verifyError || !verifyData) {
      await logAdminAudit({
        adminId: user.id,
        action: 'failed_mfa_enrollment',
        entityType: 'auth_mfa',
        entityId: factorId,
        newValue: { reason: verifyError?.message || 'invalid_totp_code' },
        ip,
      });

      return NextResponse.json(
        { error: 'Invalid verification code. Please check your authenticator app.' },
        { status: 400 }
      );
    }

    // Log enrollment and successful login
    await logAdminAudit({
      adminId: user.id,
      action: 'admin_mfa_enrolled',
      entityType: 'auth_mfa',
      entityId: factorId,
      newValue: { factorType: 'totp' },
      ip,
    });

    await logAdminAudit({
      adminId: user.id,
      action: 'admin_login',
      entityType: 'auth_session',
      entityId: user.id,
      newValue: { aal: 'aal2', verifiedAt: new Date().toISOString() },
      ip,
    });

    const response = NextResponse.json({
      success: true,
      redirect: '/admin',
    });

    // Set signed activity and MFA verification cookies bound to user and session
    const sessionId = extractSessionId(verifyData, user);

    setSignedAdminActivityCookie(response, {
      userId: user.id,
      sessionId,
    });

    setSignedAdminMfaVerifiedCookie(response, {
      userId: user.id,
      sessionId,
    });

    return response;
  } catch (err: unknown) {
    console.error('[Admin MFA Enroll POST Exception]', err);
    return NextResponse.json(
      { error: 'Verification failed. Please try again.' },
      { status: 500 }
    );
  }
}
