import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;
    const token = request.cookies.get('token')?.value;

    console.log(`[Middleware] Checking path: ${pathname} | Token present: ${!!token}`);

    // Create a base response that prevents caching
    const response = NextResponse.next();
    response.headers.set('x-middleware-cache', 'no-cache');
    response.headers.set('Cache-Control', 'no-store, max-age=0');

    // CRITICAL: On the first successful login redirect, clear the cache to purge any stale "unauthorized" states
    if (request.nextUrl.searchParams.get('auth') === 'success') {
        response.headers.set('Clear-Site-Data', '"cache"');
    }

    const isNextInternalRequest = request.headers.get('x-nextjs-data') || pathname.startsWith('/_next');
    const isPublicRoute = pathname === '/login' || pathname === '/register';

    // 1. Safety: If we're already on /login, just return the no-cache response
    if (pathname === '/login') return response;

    // 2. Redirect No-Token cases
    if (!token && !isPublicRoute && !isNextInternalRequest && pathname !== '/') {
        console.warn(`[Middleware] No token found. Redirecting to /login (no-cache).`);
        const redirectResponse = NextResponse.redirect(new URL('/login', request.url));
        redirectResponse.headers.set('x-middleware-cache', 'no-cache');
        redirectResponse.headers.set('Cache-Control', 'no-store, max-age=0');
        return redirectResponse;
    }

    return response;
}

export const config = {
    // Matcher covers all routes except static assets and API
    matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
