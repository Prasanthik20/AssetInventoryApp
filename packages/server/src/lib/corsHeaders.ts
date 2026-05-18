import type { NextApiResponse } from 'next';

export function setCorsHeaders(res: NextApiResponse, origin?: string): void {
  const allowedOrigins = [
    'http://localhost:8081',
    'http://localhost:8082',
    'http://localhost:3000',
    'http://127.0.0.1:8081',
    'http://127.0.0.1:8082',
    'http://127.0.0.1:3000',
    'https://assetmgmt.asquaretech.in',
    'https://assetmgmt.asquaretech.in/'
  ];

  // Normalize origin
  let normalizedOrigin = origin || '';
  if (normalizedOrigin.endsWith('/')) {
    normalizedOrigin = normalizedOrigin.slice(0, -1);
  }

  if (normalizedOrigin && (normalizedOrigin.includes('localhost') || normalizedOrigin.includes('127.0.0.1') || allowedOrigins.includes(normalizedOrigin))) {
    res.setHeader('Access-Control-Allow-Origin', normalizedOrigin);
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS,PATCH');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, X-Requested-With');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
}