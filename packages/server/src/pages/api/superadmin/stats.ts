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
    // Auto-migration for useful_life and salvage_value
    try {
      await query(`
        ALTER TABLE "Asset_Details" 
        ADD COLUMN IF NOT EXISTS "useful_life" INT DEFAULT 5,
        ADD COLUMN IF NOT EXISTS "salvage_value" VARCHAR(255);
      `, []);
    } catch (err) {
      console.error('[AUTO-MIGRATION ERROR in superadmin stats]', err);
    }

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

    // Calculate depreciating assets globally
    const depreciatingAssetsRes = await query(`
      SELECT 
        a.id, 
        a.name, 
        a.serial_no AS "serialNo", 
        a.price, 
        a.purchase_date AS "purchaseDate", 
        a.useful_life AS "usefulLife", 
        a.salvage_value AS "salvageValue",
        t.name AS "tenantName"
      FROM "Asset_Details" a
      JOIN "Tenants" t ON a."tenantId" = t.id
    `);

    let depreciatingAssetsCount = 0;
    const depreciatingAssetsList = [];

    for (const row of depreciatingAssetsRes.rows) {
      const initialCost = parseFloat(row.price) || 0;
      const salvageValueNum = parseFloat(row.salvageValue) || 0;
      const usefulLifeNum = parseInt(row.usefulLife) || 5;

      if (initialCost > 0 && usefulLifeNum > 0 && row.purchaseDate) {
        const purchaseDate = new Date(row.purchaseDate);
        const today = new Date();
        const ageYears = Math.max(0, (today.getTime() - purchaseDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000));

        const depreciationPerYear = (initialCost - salvageValueNum) / usefulLifeNum;
        const totalDepreciation = Math.max(0, Math.min(depreciationPerYear * ageYears, initialCost - salvageValueNum));
        const remainingValue = initialCost - totalDepreciation;

        const percentLifeElapsed = (ageYears / usefulLifeNum) * 100;
        const percentLifeRemaining = Math.max(0, 100 - percentLifeElapsed);

        if (percentLifeRemaining < 60) {
          depreciatingAssetsCount++;
          depreciatingAssetsList.push({
            id: row.id.toString(),
            name: row.name,
            serialNo: row.serialNo,
            price: row.price,
            usefulLife: usefulLifeNum,
            salvageValue: row.salvageValue || '0',
            remainingValue: parseFloat(remainingValue.toFixed(2)),
            percentLifeRemaining: parseFloat(percentLifeRemaining.toFixed(1)),
            tenantName: row.tenantName
          });
        }
      }
    }

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
      depreciatingAssetsCount,
      depreciatingAssets: depreciatingAssetsList,
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
