// import { NextResponse } from 'next/server';
// import type { NextRequest } from 'next/server';
//
// // Predefined user credentials
// const USERS = {
//     user1: 'password1',
//     user2: 'password2',
// };
//
// export function middleware(request: NextRequest) {
//     const authHeader = request.headers.get('authorization');
//
//     // If no authorization header is provided, trigger the browser's login popup
//     if (!authHeader) {
//         return new Response('Unauthorized', {
//             status: 401,
//             headers: { 'WWW-Authenticate': 'Basic realm="Login Required"' },
//         });
//     }
//
//     // Decode the Authorization header
//     const credentials = Buffer.from(authHeader.split(' ')[1], 'base64').toString();
//     const [username, password] = credentials.split(':');
//
//     // Validate the username and password
//     if (!(username in USERS && USERS[username] === password)) {
//         return new Response('Unauthorized', {
//             status: 401,
//             headers: { 'WWW-Authenticate': 'Basic realm="Login Required"' },
//         });
//     }
//
//     // Pass the authenticated username to the next step
//     request.headers.set('x-authenticated-user', username);
//
//     // Allow the request to continue to the app
//     return NextResponse.next();
// }

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { parse } from 'cookie';

// Predefined user credentials
const USERS = {
    user1: 'password1',
    user2: 'password2',
};

function isAuthenticated(request: NextRequest) {
    const cookieHeader = request.headers.get('cookie');
    console.log('Cookie Header:', cookieHeader);

    if (!cookieHeader) return false;

    const cookies = parse(cookieHeader);
    console.log('Parsed Cookies:', cookies);

    // Check for auth cookie (predefined user credentials)
    const authCookie = cookies.auth;
    if (authCookie) {
        const credentials = Buffer.from(authCookie, 'base64').toString();
        const [username, password] = credentials.split(':');
        if (username in USERS && (USERS as {[key: string]: string})[username] === password) {
            return true;
        }
    }

    // Check for email cookie (Google authentication)
    const emailCookie = cookies.user_email;
    if (emailCookie) {
        console.log('Authenticated via Google with email:', emailCookie);
        return true;
    }

    console.log('No valid authentication found');
    return false;
}

// Middleware function
export function middleware(request: NextRequest) {
    const authenticated = isAuthenticated(request);

    console.log('authenticated', authenticated);
    console.log('request.nextUrl.pathname', request.nextUrl.pathname);

    const pathname = request.nextUrl.pathname;

    // Exclude requests for static files and assets
    if (pathname.startsWith('/_next') || pathname.startsWith('/static')) {
        return NextResponse.next();
    }

    if (!authenticated && !request.nextUrl.pathname.startsWith('/login')) {
        console.log('redirecting to /login');
        return NextResponse.redirect(new URL('/login', request.url));
    }

    if (authenticated && request.nextUrl.pathname === '/login') {
        return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    // Add authenticated username to headers
    const response = NextResponse.next();
    const authHeader = request.headers.get('authorization');
    if (authHeader) {
        const credentials = Buffer.from(authHeader.split(' ')[1], 'base64').toString();
        const [username] = credentials.split(':');
        response.headers.set('x-authenticated-user', username);
    }

    return response;
}


