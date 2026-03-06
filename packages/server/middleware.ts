import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const allowedOrigins = [
  "http://localhost:8081",
  "http://localhost:8082",
  "http://localhost:3000",
  "http://127.0.0.1:8081",
  "http://127.0.0.1:8082",
  "http://127.0.0.1:3000",
  "https://assetmgmt.asquaretech.in"
];

function isOriginAllowed(origin: string): boolean {
  return allowedOrigins.includes(origin) || origin.includes('localhost') || origin.includes('127.0.0.1');
}

export function middleware(req: NextRequest) {
  const origin = req.headers.get("origin") || "";
  const isAllowed = isOriginAllowed(origin);

  // Handle preflight requests first
  if (req.method === "OPTIONS") {
    const preflightHeaders = new Headers();
    
    if (isAllowed && origin) {
      preflightHeaders.set("Access-Control-Allow-Origin", origin);
    } else if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
      preflightHeaders.set("Access-Control-Allow-Origin", origin);
    }
    
    preflightHeaders.set("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS,PATCH");
    preflightHeaders.set("Access-Control-Allow-Headers", "Content-Type, Authorization, Accept");
    preflightHeaders.set("Access-Control-Allow-Credentials", "true");
    preflightHeaders.set("Access-Control-Max-Age", "86400");
    
    return new NextResponse(null, {
      status: 204,
      headers: preflightHeaders,
    });
  }

  // Handle actual requests
  const res = NextResponse.next();

  if (isAllowed && origin) {
    res.headers.set("Access-Control-Allow-Origin", origin);
  } else if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
    res.headers.set("Access-Control-Allow-Origin", origin);
  }

  res.headers.set("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS,PATCH");
  res.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, Accept");
  res.headers.set("Access-Control-Allow-Credentials", "true");

  return res;
}
export const config = {
  matcher: "/api/:path*",
};