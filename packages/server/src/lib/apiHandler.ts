import type { NextApiRequest, NextApiResponse } from 'next';
import { verifyToken, TokenPayload } from './auth';
import { setCorsHeaders } from './corsHeaders';
import query from './db';

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

export const withPermission = (permissionCode: string, handler: AuthenticatedHandler) => {
  return withAuth(async (req: AuthenticatedRequest, res: NextApiResponse) => {
    const { userId, tenantId, role } = req.user;

    // Super Admins bypass permission checks
    if (role === 'Super Admin' || role === 'SuperAdmin') {
      return handler(req, res);
    }

    try {
      const permissionCheck = await query(
        `SELECT 1 
         FROM "Users" u
         INNER JOIN "Role_Permissions" rp ON u."roleId" = rp."roleId"
         INNER JOIN "Permissions" p ON rp."permissionId" = p.id
         WHERE u."userId" = $1 AND p.code = $2 AND (u."tenantId" = $3 OR u."tenantId" IS NULL)
         LIMIT 1`,
        [userId, permissionCode, tenantId || null]
      );

      if (permissionCheck.rows.length === 0) {
        return res.status(403).json({ message: `Forbidden: Missing required permission ${permissionCode}` });
      }

      return handler(req, res);
    } catch (error) {
      console.error('Permission check error:', error);
      return res.status(500).json({ message: 'Internal server error during authorization.' });
    }
  });
};
