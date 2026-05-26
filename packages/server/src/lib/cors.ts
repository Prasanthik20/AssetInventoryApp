import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const LOCAL_ORIGIN_REGEX = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

function normalizeOrigin(origin: string): string {
  return origin.trim().replace(/\/$/, '');
}

function getAllowedOrigins(): Set<string> {
  const fromEnv = [
    process.env.FRONTEND_URL,
    process.env.WEB_FRONTEND_URL,
  ]
    .filter(Boolean)
    .map((value) => normalizeOrigin(value as string));

  const defaults = [
    'https://assetmgmt.asquaretech.in',
    'http://localhost:3000',
    'http://localhost:8081',
    'http://localhost:8082',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:8081',
    'http://127.0.0.1:8082',
    'https://asq-asset-api-ckdtfzgqdggjcedv.southindia-01.azurewebsites.net',
  ];

  return new Set([...defaults, ...fromEnv]);
}

function isOriginAllowed(origin: string): boolean {
  const normalized = normalizeOrigin(origin);
  if (!normalized) return false;
  if (LOCAL_ORIGIN_REGEX.test(normalized)) return true;
  return getAllowedOrigins().has(normalized);
}

function applyCorsHeaders(headers: Headers, origin: string, allowOrigin: boolean): void {
  if (allowOrigin) {
    headers.set('Access-Control-Allow-Origin', normalizeOrigin(origin));
  }
  headers.set('Vary', 'Origin');
  headers.set('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS,PATCH');
  headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, X-Requested-With');
  headers.set('Access-Control-Allow-Credentials', 'true');
  headers.set('Access-Control-Max-Age', '86400');
}

export function middleware(req: NextRequest) {
  const origin = req.headers.get('origin') || '';
  const isAllowed = isOriginAllowed(origin);

  if (req.method === 'OPTIONS') {
    const preflightHeaders = new Headers();
    applyCorsHeaders(preflightHeaders, origin, isAllowed && Boolean(origin));

    return new NextResponse(null, {
      status: 204,
      headers: preflightHeaders,
    });
  }

  const res = NextResponse.next();

  applyCorsHeaders(res.headers, origin, isAllowed && Boolean(origin));

  return res;
}
export const config = {
  matcher: "/api/:path*",
};