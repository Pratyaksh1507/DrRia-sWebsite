import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/rate-limit';

export async function POST(request: Request) {
  const ip = request.headers.get('x-forwarded-for') || 'local';
  const { origin } = new URL(request.url);

  if (!checkRateLimit(`auth_signout_${ip}`, 30, 60000)) {
    return NextResponse.redirect(`${origin}/?error=rate_limited`, { status: 302 });
  }

  const supabase = await createClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(`${origin}/`, { status: 302 });
}

export async function GET(request: Request) {
  const ip = request.headers.get('x-forwarded-for') || 'local';
  const { origin } = new URL(request.url);

  if (!checkRateLimit(`auth_signout_${ip}`, 30, 60000)) {
    return NextResponse.redirect(`${origin}/?error=rate_limited`, { status: 302 });
  }

  const supabase = await createClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(`${origin}/`, { status: 302 });
}
