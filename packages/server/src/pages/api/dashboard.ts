import type { NextApiResponse } from "next";
import query from "@/lib/db";
import { setCorsHeaders } from "@/lib/corsHeaders";
import { withAuth, AuthenticatedRequest } from "@/lib/apiHandler";

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  const origin = req.headers.origin as string;
  setCorsHeaders(res, origin);

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { tenantId } = req.user;

  if (!tenantId) {
    return res.status(403).json({ message: 'Tenant context missing.' });
  }

  try {
    // 1. Fetch Subscription Info via Raw SQL (more reliable than Prisma when client is out of sync)
    const subSql = `
      SELECT s.*, p.name as "planName", p."maxUsers", p."maxAssets"
      FROM "Subscriptions" s
      JOIN "Plans" p ON s."planId" = p.id
      WHERE s."tenantId" = $1
      ORDER BY s."createdAt" DESC
      LIMIT 1;
    `;
    const subResult = await query(subSql, [tenantId]);
    const subscription = subResult.rows[0];

    // 2. Comprehensive Metrics in a single query
    const statsSql = `
      SELECT
        COUNT(a.id) AS "totalAssets",
        COUNT(a.id) FILTER (WHERE s.status = 'Unassigned') AS "unassignedAssets",
        COUNT(a.id) FILTER (WHERE s.status = 'Assigned') AS "assignedAssets",
        COUNT(a.id) FILTER (WHERE s.status = 'Overdue') AS "overdueAssets",
        COUNT(a.id) FILTER (WHERE s.status IN ('Under Maintenance', 'Maintenance', 'under maintenance')) AS "underMaintenanceAssets",
        COUNT(a.id) FILTER (WHERE s.status = 'Unassigned') AS "officeAssets",
        COUNT(a.id) FILTER (WHERE s.status IN ('Assigned', 'Overdue')) AS "fieldAssets",
        (SELECT COUNT(*) FROM "Users" WHERE "tenantId" = $1) AS "totalUsers",
        (SELECT COUNT(*) FROM "Category" WHERE "tenantId" = $1 OR "isSystemCategory" = true) AS "totalCategories"
      FROM "Asset_Details" a
      LEFT JOIN "Status" s ON a.status_id = s.id
      WHERE a."tenantId" = $1;
    `;

    const statsResult = await query(statsSql, [tenantId]);
    const stats = statsResult.rows[0];

    // 3. Location Stats for Field Assets
    const locationSql = `
      SELECT location, COUNT(*)::int as count
      FROM "Asset_Details"
      WHERE "tenantId" = $1 
        AND status_id IN (SELECT id FROM "Status" WHERE status IN ('Assigned', 'Overdue'))
      GROUP BY location
      ORDER BY count DESC
      LIMIT 10;
    `;
    const locationResult = await query(locationSql, [tenantId]);

    // Convert string counts from PostgreSQL to numbers
    const totalAssetsCount = Number(stats.totalAssets || 0);
    const totalUsersCount = Number(stats.totalUsers || 0);

    const metrics = {
      totalAssets: totalAssetsCount,
      totalUsers: totalUsersCount,
      totalCategories: Number(stats.totalCategories || 0),
      unassignedAssets: Number(stats.unassignedAssets || 0),
      assignedAssets: Number(stats.assignedAssets || 0),
      overdueAssets: Number(stats.overdueAssets || 0),
      underMaintenanceAssets: Number(stats.underMaintenanceAssets || 0),
      officeAssets: Number(stats.officeAssets || 0),
      fieldAssets: Number(stats.fieldAssets || 0),
    };

    let subscriptionUsage = null;
    if (subscription) {
       const userUsagePct = subscription.maxUsers > 0 ? (totalUsersCount / subscription.maxUsers) * 100 : 0;
       const assetUsagePct = subscription.maxAssets > 0 ? (totalAssetsCount / subscription.maxAssets) * 100 : 0;
       subscriptionUsage = {
        plan: subscription.planName,
        status: subscription.status,
        endDate: subscription.endDate,
        maxUsers: subscription.maxUsers,
        maxAssets: subscription.maxAssets,
        userUsagePercent: Math.min(100, Math.round(userUsagePct)),
        assetUsagePercent: Math.min(100, Math.round(assetUsagePct)),
       };
    }

    return res.status(200).json({
      ...metrics,
      fieldLocationStats: locationResult.rows,
      subscription: subscriptionUsage
    });

  } catch (error) {
    console.error("Dashboard API Error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export default withAuth(handler);
