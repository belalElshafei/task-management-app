import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    const token = request.cookies.get('token')?.value;
    const { pathname } = request.nextUrl;

    // Define public routes that don't require authentication
    const isPublicRoute = pathname === '/login' || pathname === '/register';

    // If no token and trying to access a protected route, redirect to login
    if (!token && !isPublicRoute && pathname !== '/') {
        return NextResponse.redirect(new URL('/login', request.url));
    }

    // If token exists and trying to access login/register, redirect to dashboard
    if (token && isPublicRoute) {
        return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
