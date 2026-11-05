import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { checkRateLimit } from '@/lib/rate-limit';
import { logAdminAudit } from '@/lib/admin-auth';

const mfaChallengeSchema = z
  .object({
    code: z.string().regex(/^\d{6}$/, 'Enter the 6-digit authenticator code'),
  })
  .strict();

export async function POST(request: Request) {
  const ip = request.headers.get('x-forwarded-for') || 'local';

  // Rate limit MFA verification attempts: 5 attempts per 10 mins
  if (!checkRateLimit(`admin_mfa_${ip}`, 5, 10 * 60 * 1000)) {
    return NextResponse.json(
      { error: 'Too many verification attempts. Please wait a few minutes.' },
      { status: 429 }
    );
  }

  try {
    const body = await request.json();
    const validation = mfaChallengeSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const { code } = validation.data;

    // Verify session
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Session expired' }, { status: 401 });
    }

    // Confirm admin table membership
    const adminSupabase = createAdminClient();
    const { data: adminRecord } = await adminSupabase
      .from('admin_users')
      .select('user_id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!adminRecord) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Retrieve active TOTP factor
    const { data: factors, error: factorsError } =
      await supabase.auth.mfa.listFactors();

    if (factorsError || !factors?.totp || factors.totp.length === 0) {
      return NextResponse.json(
        { error: 'No authenticator factor found. Please enroll first.' },
        { status: 400 }
      );
    }

    const factorId = factors.totp[0].id;

    // Challenge and verify TOTP code
    const { data: verifyData, error: verifyError } =
      await supabase.auth.mfa.challengeAndVerify({
        factorId,
        code,
      });

    if (verifyError || !verifyData) {
      await logAdminAudit({
        adminId: user.id,
        action: 'failed_mfa',
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

    // Success! Log admin_login
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

    // Set secure activity and MFA verification cookies
    const isProd = process.env.NODE_ENV === 'production';
    const nowStr = Date.now().toString();

    response.cookies.set('drria_admin_last_activity', nowStr, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      path: '/',
    });

    response.cookies.set('drria_admin_mfa_verified_at', nowStr, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      path: '/',
    });

    return response;
  } catch (error: unknown) {
    console.error('[Admin MFA Challenge Exception]', error);
    return NextResponse.json(
      { error: 'Verification failed. Please try again.' },
      { status: 500 }
    );
  }
}

