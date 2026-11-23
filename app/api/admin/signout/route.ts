import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logAdminAudit } from '@/lib/admin-auth';

async function handleSignOut(request: Request) {
  const ip = request.headers.get('x-forwarded-for') || 'local';
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    await logAdminAudit({
      adminId: user.id,
      action: 'admin_logout',
      entityType: 'auth_session',
      entityId: user.id,
      ip,
    });
  }

  await supabase.auth.signOut();

  const isFormOrNav =
    request.method === 'GET' ||
    request.headers.get('accept')?.includes('text/html') ||
    request.headers.get('content-type')?.includes('application/x-www-form-urlencoded');

  let response: NextResponse;
  if (isFormOrNav) {
    const url = new URL('/admin/login', request.url);
    response = NextResponse.redirect(url);
  } else {
    response = NextResponse.json({ success: true, redirect: '/admin/login' });
  }

  // Clear admin session cookies
  response.cookies.delete('drria_admin_last_activity');
  response.cookies.delete('drria_admin_mfa_verified_at');

  return response;
}

export async function POST(request: Request) {
  return handleSignOut(request);
}

export async function GET(request: Request) {
  return handleSignOut(request);
}

