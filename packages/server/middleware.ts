import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  // Allowed origins — only localhost
  const allowedOrigins = [
    "http://localhost:8081",
    "http://localhost:8082", // <- Add your frontend port
    "http://localhost:3000",
  ];

  const origin = req.headers.get("origin") || "";
  
  const headers = new Headers();
  if (allowedOrigins.includes(origin)) {
    headers.set("Access-Control-Allow-Origin", origin);
  }
  headers.set("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  headers.set("Access-Control-Allow-Credentials", "true");

  // Preflight OPTIONS request
  if (req.method === "OPTIONS") {
    return new NextResponse(null, { status: 200, headers });
  }

  // For other requests, forward request with headers attached
  return NextResponse.next({ request: req, headers });
}

// Apply middleware only to API routes
export const config = { matcher: "/api/:path*" };