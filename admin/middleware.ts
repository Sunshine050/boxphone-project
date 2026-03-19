import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PUBLIC_PATHS = ['/login', '/'];
const STATIC_PREFIXES = ['/_next', '/favicon', '/api'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (STATIC_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const hasSession = request.cookies.has('access_token');
  const isPublic = PUBLIC_PATHS.includes(pathname);

  if (!hasSession && !isPublic) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/login';
    return NextResponse.redirect(loginUrl);
  }

  if (hasSession && pathname === '/login') {
    const dashUrl = request.nextUrl.clone();
    dashUrl.pathname = '/admin';
    return NextResponse.redirect(dashUrl);
  }

  const response = NextResponse.next();

  if (!isPublic) {
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
