import type { NextApiResponse } from 'next';

export function setCorsHeaders(res: NextApiResponse, origin?: string): void {
  const allowedOrigins = [
    'https://assetmgmt.asquaretech.in',
    'http://localhost:8081',
    'http://localhost:8082',
    'http://localhost:3000',
    'http://127.0.0.1:8081',
    'http://127.0.0.1:8082',
    'http://127.0.0.1:3000',
  ];

  const isAllowed = !origin || 
                   allowedOrigins.includes(origin) || 
                   origin.includes('localhost') || 
                   origin.includes('127.0.0.1');

  if (isAllowed) {
    const headerValue = origin || 'https://assetmgmt.asquaretech.in';
    res.setHeader('Access-Control-Allow-Origin', headerValue);
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS,PATCH');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, X-Requested-With');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
}
