import type { NextApiResponse } from 'next';
import query from '@/lib/db';
import { withAuth, AuthenticatedRequest } from '@/lib/apiHandler';
import { getSubscriptionInfo } from '@/lib/subscription';

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ message: `Method ${req.method} Not Allowed` });
  }

  const { tenantId } = req.user;
  if (!tenantId) {
    return res.status(400).json({ message: 'Tenant identifier is missing.' });
  }

  try {
    // 1. Fetch Subscription details
    const subInfo = await getSubscriptionInfo(tenantId);
    if (!subInfo) {
      return res.status(404).json({ message: 'Subscription details not found for this tenant.' });
    }

    // 2. Count current assets
    const assetsRes = await query(
      `SELECT COUNT(id) AS count FROM "Asset_Details" WHERE "tenantId" = $1`,
      [tenantId]
    );
    const assetsUsed = parseInt(assetsRes.rows[0]?.count || '0', 10);

    // 3. Count current active users
    const usersRes = await query(
      `SELECT COUNT("userId") AS count FROM "Users" WHERE "tenantId" = $1 AND status != 'disabled'`,
      [tenantId]
    );
    const usersUsed = parseInt(usersRes.rows[0]?.count || '0', 10);

    // 4. Calculate days remaining
    let daysRemaining = 0;
    if (subInfo.endDate) {
      const diffTime = new Date(subInfo.endDate).getTime() - new Date().getTime();
      daysRemaining = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
    }

    return res.status(200).json({
      tenantId,
      subscription: {
        planId: subInfo.planId,
        planName: subInfo.planName,
        status: subInfo.tenantStatus,
        endDate: subInfo.endDate,
        daysRemaining,
        isExpired: subInfo.isExpired
      },
      limits: {
        assets: {
          used: assetsUsed,
          max: subInfo.maxAssets,
          percentage: subInfo.maxAssets > 0 ? Math.min(100, Math.round((assetsUsed / subInfo.maxAssets) * 100)) : 0
        },
        users: {
          used: usersUsed,
          max: subInfo.maxUsers,
          percentage: subInfo.maxUsers > 0 ? Math.min(100, Math.round((usersUsed / subInfo.maxUsers) * 100)) : 0
        }
      }
    });

  } catch (error) {
    console.error('Subscription Status API Error:', error);
    return res.status(500).json({ message: 'An internal server error occurred.' });
  }
}

export default withAuth(handler);
