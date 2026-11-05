import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/rate-limit';
import { sanitizeNext } from '@/lib/auth-helpers';
import { getSiteUrl } from '@/lib/site-url';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);

  // Rate limit OAuth callback requests per IP to prevent flood / replay attacks
  const ip = request.headers.get('x-forwarded-for') || 'local';
  if (!checkRateLimit(`auth_callback_${ip}`, 20, 60000)) {
    return NextResponse.redirect(`${origin}/login?error=too_many_requests`);
  }

  const code = searchParams.get('code');
  const rawNext = searchParams.get('next');
  const next = sanitizeNext(rawNext);

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const redirectBase = getSiteUrl();
      return NextResponse.redirect(`${redirectBase}${next}`);
    }
  }

  const redirectBase = getSiteUrl();
  return NextResponse.redirect(`${redirectBase}/login?error=auth_callback_failed`);
}
