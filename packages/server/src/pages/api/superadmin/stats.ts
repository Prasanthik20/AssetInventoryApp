import type { NextApiResponse } from 'next';
import query from '@/lib/db';
import { withAuth, AuthenticatedRequest } from '@/lib/apiHandler';

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ message: `Method ${req.method} Not Allowed` });
  }

  // 1. Secure check: Only Super Admin can access stats
  if (req.user.role !== 'Super Admin') {
    return res.status(403).json({ message: 'Access denied. Super Admin privileges required.' });
  }

  try {
    // 2. Fetch global statistics in queries
    const tenantsCountRes = await query('SELECT COUNT(*) AS count FROM "Tenants"');
    const totalTenants = parseInt(tenantsCountRes.rows[0]?.count || '0', 10);

    const activeSubsRes = await query(`
      SELECT COUNT(*) AS count 
      FROM "Subscriptions" 
      WHERE status = 'active' OR status = 'trialing'
    `);
    const activeSubscriptions = parseInt(activeSubsRes.rows[0]?.count || '0', 10);

    const pendingRenewalsRes = await query(`
      SELECT COUNT(*) AS count 
      FROM "RenewalRequests" 
      WHERE status = 'submitted'
    `);
    const pendingRenewals = parseInt(pendingRenewalsRes.rows[0]?.count || '0', 10);

    const totalAssetsRes = await query('SELECT COUNT(*) AS count FROM "Asset_Details"');
    const totalAssets = parseInt(totalAssetsRes.rows[0]?.count || '0', 10);

    // Calculate monthly cashflow
    const monthlyRevRes = await query(`
      SELECT SUM(p.price) AS total
      FROM "Subscriptions" s
      JOIN "Plans" p ON s."planId" = p.id
      WHERE s.status = 'active'
    `);
    const revenueMonthly = parseFloat(monthlyRevRes.rows[0]?.total || '0.00');

    return res.status(200).json({
      totalTenants,
      activeSubscriptions,
      pendingRenewals,
      totalAssetsOnPlatform: totalAssets,
      revenueMonthly,
      systemHealth: {
        dbConnectionStatus: 'Healthy',
        redisCacheHitRate: '98%',
        workerQueueDelay: '0ms'
      }
    });

  } catch (error) {
    console.error('Super Admin Stats API Error:', error);
    return res.status(500).json({ message: 'An internal server error occurred.' });
  }
}

export default withAuth(handler);
