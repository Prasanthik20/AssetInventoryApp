import type { NextApiResponse } from 'next';
import query from './db';
import { AuthenticatedRequest, AuthenticatedHandler, withAuth } from './apiHandler';

export interface SubscriptionInfo {
  tenantStatus: string;
  planId: string;
  planName: string;
  maxAssets: number;
  maxUsers: number;
  endDate: Date | null;
  isExpired: boolean;
}

/**
 * Resolves the subscription details and limit details for a given tenant.
 */
export async function getSubscriptionInfo(tenantId: string): Promise<SubscriptionInfo | null> {
  try {
    const sql = `
      SELECT 
        t.status AS "tenantStatus",
        p.id AS "planId",
        p.name AS "planName",
        p."maxAssets",
        p."maxUsers",
        s."endDate",
        s.status AS "subStatus"
      FROM 
        "Tenants" t
      LEFT JOIN 
        "Subscriptions" s ON s."tenantId" = t.id AND s.status = 'active'
      LEFT JOIN 
        "Plans" p ON p.id = s."planId"
      WHERE 
        t.id = $1
      ORDER BY 
        s."createdAt" DESC
      LIMIT 1;
    `;
    const res = await query(sql, [tenantId]);
    if (res.rows.length === 0) return null;

    const row = res.rows[0];
    const now = new Date();
    const endDate = row.endDate ? new Date(row.endDate) : null;
    
    // An account is expired if its tenantStatus is 'expired', or the end date has passed.
    const isExpired = 
      row.tenantStatus === 'expired' || 
      row.subStatus === 'expired' || 
      (endDate !== null && endDate < now);

    return {
      tenantStatus: row.tenantStatus || 'active',
      planId: row.planId || 'free-trial',
      planName: row.planName || 'Free Trial',
      maxAssets: row.maxAssets || 100,
      maxUsers: row.maxUsers || 5,
      endDate,
      isExpired,
    };
  } catch (error) {
    console.error('getSubscriptionInfo Error:', error);
    return null;
  }
}

/**
 * Checks usage counts against plan thresholds.
 */
export async function checkUsageLimit(
  tenantId: string, 
  limitType: 'assets' | 'users'
): Promise<{ allowed: boolean; used: number; max: number; error?: string }> {
  const subInfo = await getSubscriptionInfo(tenantId);
  if (!subInfo) {
    return { allowed: false, used: 0, max: 0, error: 'Subscription information not found.' };
  }

  if (subInfo.tenantStatus === 'suspended') {
    return { allowed: false, used: 0, max: 0, error: 'Organization account has been suspended. Please contact the Super Admin.' };
  }

  if (subInfo.isExpired) {
    return { allowed: false, used: 0, max: 0, error: 'Subscription has expired. Write access is restricted.' };
  }

  if (limitType === 'assets') {
    const assetsRes = await query(
      `SELECT COUNT(id) AS count FROM "Asset_Details" WHERE "tenantId" = $1`,
      [tenantId]
    );
    const used = parseInt(assetsRes.rows[0]?.count || '0', 10);
    const max = subInfo.maxAssets;
    
    return {
      allowed: used < max,
      used,
      max,
      error: used >= max ? `Asset limit reached. Used: ${used}/${max}. Please upgrade your plan.` : undefined
    };
  } else {
    const usersRes = await query(
      `SELECT COUNT("userId") AS count FROM "Users" WHERE "tenantId" = $1 AND status != 'disabled'`,
      [tenantId]
    );
    const used = parseInt(usersRes.rows[0]?.count || '0', 10);
    const max = subInfo.maxUsers;
    
    return {
      allowed: used < max,
      used,
      max,
      error: used >= max ? `User limit reached. Active users: ${used}/${max}. Please upgrade your plan.` : undefined
    };
  }
}

/**
 * Higher-order middleware function to protect API routes with subscription validation.
 * Allows safe read-only access (GET methods) even when subscriptions are expired,
 * but locks write operations (POST, PUT, PATCH, DELETE) when limits or dates expire.
 */
export const withSubscriptionLimit = (
  handler: AuthenticatedHandler,
  checkType?: 'assets' | 'users'
) => {
  return withAuth(async (req: AuthenticatedRequest, res: NextApiResponse) => {
    const { tenantId, role } = req.user;

    // Super Admin overrides all subscription locks
    if (role === 'Super Admin') {
      return handler(req, res);
    }

    if (!tenantId) {
      return res.status(400).json({ message: 'Tenant identifier missing in authentication payload.' });
    }

    const subInfo = await getSubscriptionInfo(tenantId);
    if (!subInfo) {
      return res.status(403).json({ message: 'No valid tenant subscription found.' });
    }

    // 1. Hard Block if Suspended (both Reads and Writes)
    if (subInfo.tenantStatus === 'suspended') {
      return res.status(403).json({
        code: 'ACCOUNT_SUSPENDED',
        message: 'Your organization access is suspended. Please contact the Super Admin.'
      });
    }

    // 2. Allow Read operations (GET, OPTIONS) to pass through with warning headers
    if (req.method === 'GET' || req.method === 'OPTIONS') {
      res.setHeader('X-Subscription-Plan', subInfo.planId);
      res.setHeader('X-Subscription-Status', subInfo.tenantStatus);
      res.setHeader('X-Subscription-Expired', String(subInfo.isExpired));
      return handler(req, res);
    }

    // 3. For any Write operations, check Expiration date
    if (subInfo.isExpired) {
      return res.status(403).json({
        code: 'SUBSCRIPTION_EXPIRED',
        message: 'Your subscription has expired. Write operations are disabled. Please request a plan renewal.',
        subscriptionExpired: true
      });
    }

    // 4. Optionally verify specific usage counts (Assets / Users)
    if (checkType) {
      const usage = await checkUsageLimit(tenantId, checkType);
      if (!usage.allowed) {
        return res.status(403).json({
          code: 'LIMIT_EXCEEDED',
          message: usage.error,
          limitType: checkType,
          used: usage.used,
          max: usage.max
        });
      }
    }

    return handler(req, res);
  });
};
