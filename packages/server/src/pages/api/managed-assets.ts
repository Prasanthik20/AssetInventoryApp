import type { NextApiRequest, NextApiResponse } from 'next';
import query from '@/lib/db';
import { setCorsHeaders } from '@/lib/corsHeaders';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const origin = req.headers.origin as string;
  setCorsHeaders(res, origin);

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET', 'OPTIONS']);
    return res.status(405).json({ message: `Method ${req.method} not allowed` });
  }

  try {
    const managerEmployeeId = Number(req.query.id || req.query.managerId || req.query.supervisorId);
    if (!Number.isFinite(managerEmployeeId)) {
      return res.status(400).json({ message: 'Manager employee id is required' });
    }

    const result = await query(
      `SELECT
        a.id,
        a.name AS "assetName",
        a."asset_Id" AS "barcode",
        a."serial_no" AS "serialNumber",
        a.location,
        s.status AS "status",
        a."photoURL" AS "photoURL",
        a."barcodeURL" AS "barcodeURL",
        a."purchase_date" AS "purchaseDate",
        a."warranty_expiry" AS "warrantyExpiry",
        a.price,
        a.useful_life AS "usefulLife",
        a.salvage_value AS "salvageValue",
        a."categoryId" AS "categoryId",
        a."controller_key" AS "controllerKey",
        cat.category AS "category",
        assignee."fullName" AS "assignedTo",
        assigner."fullName" AS "assignedBy",
        aa.id AS "assignmentId",
        aa."projectName" AS "projectName",
        aa.assigned_date AS "assignedDate",
        aa.expected_return_date AS "expectedReturnDate",
        aa."operator_employeeId" AS "operatorId",
        aa."supervisor_employeeId" AS "senderId"
      FROM "Asset_Details" a
      LEFT JOIN "Category" cat ON a."categoryId" = cat."categoryId"
      LEFT JOIN "Status" s ON s.id = a.status_id
      LEFT JOIN "Users" assignee ON assignee."employeeId" = a.assigned_to AND (assignee."tenantId" = a."tenantId" OR a."tenantId" IS NULL)
      LEFT JOIN "Users" assigner ON assigner."employeeId" = a.assigned_by AND (assigner."tenantId" = a."tenantId" OR a."tenantId" IS NULL)
      OUTER APPLY (
        SELECT TOP 1 * FROM "Asset_Assignments"
        WHERE "assetId" = a.id
          AND COALESCE(status, '') <> 'returned'
          AND "returned_date" IS NULL
        ORDER BY id DESC
      ) aa
      WHERE (
        CAST(a.assigned_to AS text) = CAST($1 AS text)
        OR CAST(aa."operator_employeeId" AS text) = CAST($1 AS text)
        OR CAST(a.assigned_by AS text) = CAST($1 AS text)
        OR CAST(aa."supervisor_employeeId" AS text) = CAST($1 AS text)
      )
      AND (
        a."tenantId" = (SELECT "tenantId" FROM "Users" WHERE CAST("employeeId" AS text) = CAST($1 AS text) LIMIT 1)
        OR a."tenantId" IS NULL
      )
        AND LOWER(COALESCE(s.status, '')) IN ('assigned', 'overdue')
      ORDER BY a.id ASC`,
      [managerEmployeeId],
    );

    const assets = result.rows.map((row: any) => {
      const initialCost = parseFloat(row.price) || 0;
      const salvageValueNum = parseFloat(row.salvageValue) || 0;
      const usefulLifeNum = parseInt(row.usefulLife) || 5;

      let remainingValue = initialCost;
      let percentLifeRemaining = 100;
      let percentLifeElapsed = 0;
      let depreciationMessage = null;

      if (initialCost > 0 && usefulLifeNum > 0 && row.purchaseDate) {
        const purchaseDate = new Date(row.purchaseDate);
        const today = new Date();
        const ageYears = Math.max(0, (today.getTime() - purchaseDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000));

        const depreciationPerYear = (initialCost - salvageValueNum) / usefulLifeNum;
        const totalDepreciation = Math.max(0, Math.min(depreciationPerYear * ageYears, initialCost - salvageValueNum));
        remainingValue = initialCost - totalDepreciation;

        percentLifeElapsed = (ageYears / usefulLifeNum) * 100;
        percentLifeElapsed = Math.min(100, percentLifeElapsed);
        percentLifeRemaining = Math.max(0, 100 - percentLifeElapsed);

        if (percentLifeRemaining < 60) {
          depreciationMessage = `Depreciation alert: remaining life is ${percentLifeRemaining.toFixed(1)}%. Please scrap or upgrade this asset.`;
        }
      }

      return {
        id: row.id.toString(),
        assetId: Number(row.id),
        assetName: row.assetName,
        barcode: row.barcode,
        controllerKey: row.controllerKey || null,
        serialNumber: row.serialNumber,
        category: row.category || null,
        categoryId: row.categoryId ? Number(row.categoryId) : null,
        status: row.status,
        assignedTo: row.assignedTo,
        assignedBy: row.assignedBy,
        location: (!row.location || String(row.location).trim().toLowerCase() === 'unassigned' || String(row.location).trim().toLowerCase() === 'null') ? 'Office' : String(row.location).trim(),
        purchaseDate: row.purchaseDate,
        warrantyExpiry: row.warrantyExpiry,
        price: row.price,
        photoURL: row.photoURL || '',
        barcodeURL: row.barcodeURL || null,
        expectedReturnDate: row.expectedReturnDate || null,
        assignedDate: row.assignedDate || null,
        projectName: row.projectName || null,
        assignmentId: row.assignmentId ? row.assignmentId.toString() : null,
        operatorId: row.operatorId ? row.operatorId.toString() : null,
        senderId: row.senderId ? row.senderId.toString() : null,
        receiverId: row.operatorId ? row.operatorId.toString() : null,
        isOverdue: String(row.status || '').toLowerCase() === 'overdue',
        usefulLife: usefulLifeNum,
        salvageValue: row.salvageValue || null,
        remainingValue: parseFloat(remainingValue.toFixed(2)),
        depreciationMessage
      };
    });

    return res.status(200).json({ assets, count: assets.length });
  } catch (error) {
    console.error('Managed assets API error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
