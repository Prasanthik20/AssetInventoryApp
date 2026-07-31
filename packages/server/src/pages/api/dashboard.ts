import type { NextApiResponse } from "next";
import query from "@/lib/db";
import { setCorsHeaders } from "@/lib/corsHeaders";
import { withAuth, AuthenticatedRequest } from "@/lib/apiHandler";
import { withSubscriptionLimit } from "@/lib/subscription";

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
    // 1. Fetch Subscription Info
    const subSql = `
      SELECT TOP 1 s.*, p.name as "planName", p."maxUsers", p."maxAssets"
      FROM "Subscriptions" s
      JOIN "Plans" p ON s."planId" = p.id
      WHERE s."tenantId" = $1 OR $1 IS NULL
      ORDER BY s."createdAt" DESC;
    `;
    const subResult = await query(subSql, [tenantId]);
    const subscription = subResult.rows[0];

    // 2. Comprehensive Metrics
    const statsSql = `
      SELECT
        COUNT(a.id) AS "totalAssets",
        COUNT(CASE WHEN LOWER(s.status) = 'unassigned' OR (s.id IS NULL AND a.assigned_to IS NULL) THEN a.id END) AS "unassignedAssets",
        COUNT(CASE WHEN LOWER(s.status) = 'assigned' OR (s.id IS NULL AND a.assigned_to IS NOT NULL) THEN a.id END) AS "assignedAssets",
        COUNT(CASE WHEN LOWER(s.status) = 'overdue' THEN a.id END) AS "overdueAssets",
        COUNT(CASE WHEN LOWER(s.status) IN ('under maintenance', 'maintenance') THEN a.id END) AS "underMaintenanceAssets",
        COUNT(CASE WHEN LOWER(s.status) = 'unassigned' OR (s.id IS NULL AND a.assigned_to IS NULL) THEN a.id END) AS "officeAssets",
        COUNT(CASE WHEN LOWER(s.status) IN ('assigned', 'overdue') OR (s.id IS NULL AND a.assigned_to IS NOT NULL) THEN a.id END) AS "fieldAssets",
        (
          SELECT COUNT(*) 
          FROM "Users" u 
          LEFT JOIN "Roles" r ON u."roleId" = r."roleId" 
          WHERE (u."tenantId" = $1 OR $1 IS NULL) 
            AND (r."roleName" IS NULL OR LOWER(r."roleName") NOT IN ('super admin', 'superadmin'))
        ) AS "totalUsers",
        (SELECT COUNT(*) FROM "Category" WHERE ("tenantId" = $1 OR $1 IS NULL OR "isSystemCategory" = 1)) AS "totalCategories"
      FROM "Asset_Details" a
      LEFT JOIN "Status" s ON a.status_id = s.id
      WHERE a."tenantId" = $1 OR $1 IS NULL;
    `;

    const statsResult = await query(statsSql, [tenantId]);
    const stats = statsResult.rows[0] || {};

    // 3. Location Stats for Field Assets
    const locationSql = `
      SELECT TOP 10 COALESCE(location, 'Default Site') AS location, COUNT(*) as count
      FROM "Asset_Details" a
      LEFT JOIN "Status" s ON a.status_id = s.id
      WHERE (a."tenantId" = $1 OR $1 IS NULL OR a."tenantId" IS NULL) 
        AND (LOWER(s.status) IN ('assigned', 'overdue') OR a.assigned_to IS NOT NULL)
      GROUP BY location
      ORDER BY count DESC;
    `;
    const locationResult = await query(locationSql, [tenantId]);

    // 4. Depreciating Assets Summary via SQL Aggregation
    const depSql = `
      SELECT 
        SUM(COALESCE(TRY_CAST(a.price AS FLOAT), 0)) AS "totalAssetValue",
        SUM(
          CASE 
            WHEN TRY_CAST(a.price AS FLOAT) > 0 AND COALESCE(a.useful_life, 5) > 0 AND a.purchase_date IS NOT NULL THEN
              CASE 
                WHEN ((TRY_CAST(a.price AS FLOAT) - COALESCE(TRY_CAST(a.salvage_value AS FLOAT), 0)) / COALESCE(a.useful_life, 5) * (DATEDIFF(day, a.purchase_date, GETDATE()) / 365.25)) > (TRY_CAST(a.price AS FLOAT) - COALESCE(TRY_CAST(a.salvage_value AS FLOAT), 0))
                  THEN (TRY_CAST(a.price AS FLOAT) - COALESCE(TRY_CAST(a.salvage_value AS FLOAT), 0))
                WHEN ((TRY_CAST(a.price AS FLOAT) - COALESCE(TRY_CAST(a.salvage_value AS FLOAT), 0)) / COALESCE(a.useful_life, 5) * (DATEDIFF(day, a.purchase_date, GETDATE()) / 365.25)) < 0
                  THEN 0
                ELSE ((TRY_CAST(a.price AS FLOAT) - COALESCE(TRY_CAST(a.salvage_value AS FLOAT), 0)) / COALESCE(a.useful_life, 5) * (DATEDIFF(day, a.purchase_date, GETDATE()) / 365.25))
              END
            ELSE 0
          END
        ) AS "totalDepreciatedValue",
        COUNT(
          CASE 
            WHEN TRY_CAST(a.price AS FLOAT) > 0 AND COALESCE(a.useful_life, 5) > 0 AND a.purchase_date IS NOT NULL AND a.purchase_date < GETDATE() THEN a.id
          END
        ) AS "depreciatedAssetsCount"
      FROM "Asset_Details" a
      WHERE a."tenantId" = $1 OR $1 IS NULL OR a."tenantId" IS NULL;
    `;
    const depResult = await query(depSql, [tenantId]);
    const depRow = depResult.rows[0] || {};

    const totalAssetValue = parseFloat(depRow.totalAssetValue) || 0;
    const totalDepreciatedValue = parseFloat(depRow.totalDepreciatedValue) || 0;
    const netBookValue = Math.max(0, totalAssetValue - totalDepreciatedValue);

    // 5. Fetch and compute list of depreciating assets with < 60% life remaining
    const depAssetsSql = `
      SELECT 
        a.id,
        a.name AS "assetName",
        a."asset_Id" AS "barcode",
        a.serial_no AS "serialNo",
        a.price,
        a.useful_life AS "usefulLife",
        a.salvage_value AS "salvageValue",
        a.purchase_date AS "purchaseDate",
        cat.category AS "category",
        s.status AS "status"
      FROM "Asset_Details" a
      LEFT JOIN "Category" cat ON a."categoryId" = cat."categoryId"
      LEFT JOIN "Status" s ON a.status_id = s.id
      WHERE (a."tenantId" = $1 OR $1 IS NULL OR a."tenantId" IS NULL);
    `;
    const depAssetsResult = await query(depAssetsSql, [tenantId]);

    const depreciatingAssetsList: any[] = [];

    depAssetsResult.rows.forEach((row: any) => {
      const initialCost = parseFloat(row.price) || 0;
      const salvageValueNum = parseFloat(row.salvageValue) || 0;
      const usefulLifeNum = parseInt(row.usefulLife) || 5;

      if (initialCost > 0 && usefulLifeNum > 0 && row.purchaseDate) {
        const purchaseDate = new Date(row.purchaseDate);
        const today = new Date();
        const ageYears = Math.max(0, (today.getTime() - purchaseDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
        const depreciationPerYear = (initialCost - salvageValueNum) / usefulLifeNum;
        const totalDepreciation = Math.max(0, Math.min(depreciationPerYear * ageYears, initialCost - salvageValueNum));
        const remainingValue = Math.max(0, initialCost - totalDepreciation);
        const percentLifeElapsed = Math.min(100, (ageYears / usefulLifeNum) * 100);
        const percentLifeRemaining = Math.max(0, 100 - percentLifeElapsed);

        if (percentLifeRemaining < 60) {
          depreciatingAssetsList.push({
            id: row.id.toString(),
            name: row.assetName,
            assetName: row.assetName,
            barcode: row.barcode,
            serialNo: row.serialNo || row.barcode,
            category: row.category,
            status: row.status,
            purchaseDate: row.purchaseDate,
            price: row.price,
            usefulLife: usefulLifeNum,
            salvageValue: row.salvageValue,
            remainingValue: parseFloat(remainingValue.toFixed(2)),
            percentLifeRemaining: parseFloat(percentLifeRemaining.toFixed(1)),
            depreciationMessage: `Depreciation alert: remaining life is ${percentLifeRemaining.toFixed(1)}%. Please scrap or upgrade this asset.`
          });
        }
      }
    });

    const metricsObj = {
      totalAssets: parseInt(stats.totalAssets) || 0,
      unassignedAssets: parseInt(stats.unassignedAssets) || 0,
      assignedAssets: parseInt(stats.assignedAssets) || 0,
      overdueAssets: parseInt(stats.overdueAssets) || 0,
      underMaintenanceAssets: parseInt(stats.underMaintenanceAssets) || 0,
      officeAssets: parseInt(stats.officeAssets) || 0,
      fieldAssets: parseInt(stats.fieldAssets) || 0,
      totalUsers: parseInt(stats.totalUsers) || 0,
      totalCategories: parseInt(stats.totalCategories) || 0,
      depreciatingAssetsCount: depreciatingAssetsList.length,
      depreciatedAssetsCount: depreciatingAssetsList.length,
      totalAssetValue: parseFloat(totalAssetValue.toFixed(2)),
      totalDepreciatedValue: parseFloat(totalDepreciatedValue.toFixed(2)),
      netBookValue: parseFloat(netBookValue.toFixed(2)),
    };

    const locationStats = locationResult.rows.map((r: any) => ({
      location: r.location || 'Unknown',
      count: parseInt(r.count) || 0
    }));

    return res.status(200).json({
      ...metricsObj,
      metrics: metricsObj,
      depreciatingAssets: depreciatingAssetsList,
      subscription: subscription ? {
        planName: subscription.planName,
        status: subscription.status,
        maxUsers: subscription.maxUsers,
        maxAssets: subscription.maxAssets,
        startDate: subscription.startDate,
        endDate: subscription.endDate,
      } : null,
      fieldLocationStats: locationStats,
      fieldLocationBreakdown: locationStats
    });

  } catch (error: any) {
    console.error("Dashboard API Error:", error);
    return res.status(500).json({ message: "Internal server error.", details: String(error) });
  }
}

export default withSubscriptionLimit(withAuth(handler));
