import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  const { response, user } = await updateSession(request);

  // Protected routes: /account/* and /checkout
  const isProtected =
    pathname.startsWith('/account') || pathname.startsWith('/checkout');

  if (isProtected && !user) {
    const supabaseConfigured =
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder');

    if (supabaseConfigured) {
      const redirectUrl = new URL('/login', request.url);
      redirectUrl.searchParams.set('next', `${pathname}${search}`);
      return NextResponse.redirect(redirectUrl);
    }
  }

  // If already authenticated and visits /login, redirect to next or /account
  if (pathname === '/login' && user) {
    const nextParam = request.nextUrl.searchParams.get('next');
    const target = nextParam && nextParam.startsWith('/') ? nextParam : '/account';
    return NextResponse.redirect(new URL(target, request.url));
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, apple-touch-icon, and public assets
     */
    '/((?!_next/static|_next/image|favicon.ico|apple-touch-icon.png|brand/|images/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif)$).*)',
  ],
};

