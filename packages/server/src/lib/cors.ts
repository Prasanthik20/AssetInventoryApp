mport { NextApiRequest, NextApiResponse } from 'next';

/**
 * NOTE: This utility is deprecated. CORS handling is now managed globally 
 * and more effectively by the next.js middleware file (e.g., middleware.ts)
 * which ensures the OPTIONS preflight is handled correctly before routing.
 */
export function withCors(handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void>) {
  // Return the original handler directly.
  return handler;
}