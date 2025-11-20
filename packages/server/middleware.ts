import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  // Allowed origins — only localhost
  const allowedOrigins = [
    "http://localhost:8081",
    "http://localhost:3000",
  ];

  const origin = req.headers.get("origin");
  const responseHeaders = new Headers();

  // Set Access-Control-Allow-Origin dynamically if origin is allowed
  if (origin && allowedOrigins.includes(origin)) {
    responseHeaders.set("Access-Control-Allow-Origin", origin);
  }

  // Set CORS headers
  responseHeaders.set("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  responseHeaders.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  responseHeaders.set("Access-Control-Allow-Credentials", "true");

  // Handle preflight OPTIONS request
  if (req.method === "OPTIONS") {
    return new NextResponse(null, { status: 200, headers: responseHeaders });
  }

  // Continue with request and attach headers
  const response = NextResponse.next();
  responseHeaders.forEach((value, key) => response.headers.set(key, value));

  return response;
}

// Apply middleware only to /api routes
export const config = { matcher: "/api/:path*" };