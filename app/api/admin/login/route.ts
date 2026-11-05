import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { checkRateLimit } from '@/lib/rate-limit';
import { logAdminAudit } from '@/lib/admin-auth';

const adminLoginSchema = z
  .object({
    email: z.string().email(),
    password: z.string().min(6),
  })
  .strict();

export async function POST(request: Request) {
  const ip = request.headers.get('x-forwarded-for') || 'local';

  // 1. Strict rate limiting: max 5 login attempts per 15 minutes per IP
  if (!checkRateLimit(`admin_login_${ip}`, 5, 15 * 60 * 1000)) {
    return NextResponse.json(
      { error: 'Too many login attempts. Please try again later.' },
      { status: 429 }
    );
  }

  try {
    const body = await request.json();
    const validation = adminLoginSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 400 }
      );
    }

    const { email, password } = validation.data;

    // Pre-flight check: verify Supabase environment configuration
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

    // 2. Authenticate against Supabase Auth
    const supabase = await createClient();
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    if (authError || !authData.user) {
      if (authError) {
        console.warn(`[Admin Auth] GoTrue rejection: ${authError.message} (status: ${authError.status || 400})`);
      }
      await logAdminAudit({
        action: 'failed_admin_login',
        entityType: 'auth',
        entityId: email.trim().toLowerCase(),
        newValue: { reason: 'bad_password_or_unregistered' },
        ip,
      });

      // Always return generic error message
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    const userId = authData.user.id;

    // 3. Confirm membership in public.admin_users (single-admin table)
    const adminSupabase = createAdminClient();
    const { data: adminRecord } = await adminSupabase
      .from('admin_users')
      .select('user_id')
      .eq('user_id', userId)
      .maybeSingle();

    if (!adminRecord) {
      // User is a registered customer but not the provisioned admin
      await logAdminAudit({
        adminId: userId,
        action: 'unauthorized_admin_access_attempt',
        entityType: 'admin_users',
        entityId: userId,
        newValue: { email: authData.user.email },
        ip,
      });

      // Sign out customer from admin context immediately
      await supabase.auth.signOut();

      // Return generic error so customer cannot enumerate admin existence
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // 4. Check MFA status
    const { data: mfaData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    const nextLevel = mfaData?.nextLevel || 'aal1';

    await logAdminAudit({
      adminId: userId,
      action: 'admin_password_verified',
      entityType: 'admin_users',
      entityId: userId,
      newValue: { currentAal: mfaData?.currentLevel, nextAal: nextLevel },
      ip,
    });

    return NextResponse.json({
      success: true,
      requiresMfa: true,
      mfaStep: nextLevel === 'aal1' ? 'enroll' : 'challenge',
      userId,
    });
  } catch (error: unknown) {
    console.error('[Admin Login Exception]', error);
    return NextResponse.json(
      { error: 'Invalid credentials' },
      { status: 500 }
    );
  }
}

