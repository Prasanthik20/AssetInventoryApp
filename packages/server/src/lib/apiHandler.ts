import type { NextApiRequest, NextApiResponse } from 'next';
import { verifyToken, TokenPayload } from './auth';

import { setCorsHeaders } from './corsHeaders';

export interface AuthenticatedRequest extends NextApiRequest {
  user: TokenPayload;
}

export type AuthenticatedHandler = (
  req: AuthenticatedRequest,
  res: NextApiResponse
) => Promise<unknown> | unknown;

export const withAuth = (handler: AuthenticatedHandler) => {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    // 1. Always set CORS headers first
    const origin = req.headers.origin as string;
    setCorsHeaders(res, origin);

    // 2. Allow preflight requests to pass without authentication
    if (req.method === 'OPTIONS') {
      res.status(200).end();
      return;
    }

    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Authorization token missing or invalid.' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);

    if (!decoded) {
      return res.status(401).json({ message: 'Invalid or expired token.' });
    }

    // Inject user/tenant context
    (req as AuthenticatedRequest).user = decoded;

    return handler(req as AuthenticatedRequest, res);
  };
};
