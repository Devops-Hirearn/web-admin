import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Note: Authentication is handled client-side using localStorage
// This middleware can be extended for server-side auth checks if needed
export function middleware(request: NextRequest) {
  // Add any server-side checks here if needed
  return NextResponse.next();
}

export const config = {
  matcher: '/admin/:path*',
};
