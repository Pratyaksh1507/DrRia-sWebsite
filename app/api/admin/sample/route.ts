import { NextResponse } from 'next/server';
import { requireAdminApi } from '@/lib/admin-auth';

export async function GET(request: Request) {
  const auth = await requireAdminApi(request);

  if (!auth.authorized || !auth.user) {
    return NextResponse.json(
      { error: auth.errorResponse?.error || 'Access denied' },
      { status: auth.errorResponse?.status || 403 }
    );
  }

  return NextResponse.json({
    ok: true,
    message: 'Welcome to Dr Ria Administration API',
    adminId: auth.user.id,
    aal: 'aal2',
    timestamp: new Date().toISOString(),
  });
}
