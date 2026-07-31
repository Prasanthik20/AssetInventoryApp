import type { NextApiRequest, NextApiResponse } from 'next';
import query from '@/lib/db';
import { setCorsHeaders } from '@/lib/corsHeaders';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Set CORS headers
  const origin = req.headers.origin as string;
  setCorsHeaders(res, origin);

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const rawId = req.query.id || req.query.userId || req.query.employeeId || req.query.operatorId;

  if (!rawId || typeof rawId !== 'string') {
    return res.status(400).json({ message: 'User/Employee ID is required.' });
  }

  try {
    const empIdNum = parseInt(rawId) || 0;
    const empIdStr = String(rawId).trim();

    const userRes = await query(
      `SELECT TOP 1 "tenantId", "employeeId" 
       FROM "Users" 
       WHERE "employeeId" = $1 OR CAST("employeeId" AS VARCHAR(50)) = $2 OR "userId" = $1`, 
      [empIdNum, empIdStr]
    );

    const userTenantId = userRes.rows[0]?.tenantId || null;
    const targetEmployeeId = userRes.rows[0]?.employeeId ? Number(userRes.rows[0].employeeId) : empIdNum;
    const userEmployeeId = targetEmployeeId;

    /**
     * Return assignment timeline for the user/employee.
     * Includes active and returned assignments so UI can render history.
     */
    const assetsQuery = `
      SELECT
        aa.id AS "assignmentId",
        ad.id AS "assetId",
        ad.name AS "assetName",
        ad.serial_no as "serialNo",
        ad."asset_Id" AS "barcode",
        COALESCE(aa."photoURL", ad."photoURL") AS "photoURL",
        COALESCE(aa."barcodeURL", ad."barcodeURL") AS "barcodeURL",
        COALESCE(aa.location, ad.location) AS "assetLocation",
        aa.assigned_date AS "assignedDate",
        aa.expected_return_date AS "expectedReturnDate",
        aa.returned_date AS "returnedDate",
        aa."supervisor_employeeId" AS "assignedById",
        COALESCE(u_assigner."fullName", CAST(aa."supervisor_employeeId" AS VARCHAR(50))) AS "assignedBy",
        aa.status AS "assignmentStatus",
        ad.assigned_to AS "currentlyAssignedTo",
        COALESCE(u_assignee."fullName", CAST(ad.assigned_to AS VARCHAR(50))) AS "assignedToName"
      FROM "Asset_Details" ad
      LEFT JOIN "Asset_Assignments" aa ON ad.id = aa."assetId"
      LEFT JOIN "Users" u_assigner ON CAST(aa."supervisor_employeeId" AS VARCHAR(50)) = CAST(u_assigner."employeeId" AS VARCHAR(50))
      LEFT JOIN "Users" u_assignee ON CAST(ad.assigned_to AS VARCHAR(50)) = CAST(u_assignee."employeeId" AS VARCHAR(50))
      WHERE (
        ad.assigned_to = $1 
        OR CAST(ad.assigned_to AS VARCHAR(50)) = $2
        OR aa."operator_employeeId" = $1 
        OR CAST(aa."operator_employeeId" AS VARCHAR(50)) = $2
      )
        AND ($3 IS NULL OR ad."tenantId" IS NULL OR ad."tenantId" = $3 OR LOWER(ad."tenantId") = LOWER($3))
      ORDER BY COALESCE(aa.assigned_date, ad.purchase_date) DESC, ad.id DESC;
    `;

    const assetsResult = await query(assetsQuery, [targetEmployeeId, empIdStr, userTenantId]);

    /**
     * Determine Overdue Status (expectedReturnDate < today)
     */
    const today = new Date();

    const processedAssets = assetsResult.rows.map((asset: any) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      let isOverdue = false;
      const assignmentStatus = String(asset.assignmentStatus || 'assigned').toLowerCase();
      if (asset.expectedReturnDate) {
        const due = new Date(asset.expectedReturnDate);
        due.setHours(0, 0, 0, 0);
        isOverdue = assignmentStatus === 'assigned' && due < today;
      }

      const isCurrentlyAssigned = 
        asset.currentlyAssignedTo !== null &&
        asset.currentlyAssignedTo !== undefined &&
        (Number(asset.currentlyAssignedTo) === targetEmployeeId || String(asset.currentlyAssignedTo).trim() === empIdStr);

      let normalizedStatus = 'Assigned';
      if (assignmentStatus === 'returned' || (!isCurrentlyAssigned && asset.currentlyAssignedTo === null)) {
        normalizedStatus = 'Returned';
      } else if (isOverdue) {
        normalizedStatus = 'Overdue';
      }

      return {
        assignmentId: Number(asset.assignmentId || asset.assignmentid || 0),
        assetId: Number(asset.assetId || asset.assetid || 0),
        assetName: asset.assetName || asset.assetname,
        barcode: asset.barcode,
        barcodeURL: asset.barcodeURL || asset.barcodeurl,
        serialNo: asset.serialNo || asset.serialno,
        location: (!asset.assetLocation || String(asset.assetLocation).trim().toLowerCase() === 'unassigned' || String(asset.assetLocation).trim().toLowerCase() === 'null') ? 'Office' : String(asset.assetLocation).trim(),
        photoURL: asset.photoURL,
        assignedDate: asset.assignedDate,
        expectedReturnDate: asset.expectedReturnDate,
        returnedDate: asset.returnedDate,
        assignedById: asset.assignedById,
        assignedBy: asset.assignedBy,
        assignedTo: asset.assignedToName || asset.currentlyAssignedTo,
        isCurrentlyAssigned,
        isOverdue,
        status: normalizedStatus,
      };
    });

    /**
     * Get last known user location
     */
    const locationQuery = `
      SELECT TOP 1 location 
      FROM "Asset_Assignments"
      WHERE "operator_employeeId" = $1
      ORDER BY assigned_date DESC;
    `;

    const locationResult = await query(locationQuery, [userEmployeeId]);

    const currentLocation =
      locationResult.rows.length > 0 ? locationResult.rows[0].location : 'No Location';

    const activeCount = processedAssets.filter((asset: any) => {
      const status = String(asset?.status || '').toLowerCase();
      return status === 'assigned' || status === 'overdue';
    }).length;

    const returnedCount = processedAssets.filter(
      (asset: any) => String(asset?.status || '').toLowerCase() === 'returned',
    ).length;

    const responseData = {
      userEmployeeId,
      assignedCount: activeCount,
      returnedCount,
      location: currentLocation,
      assets: processedAssets,
    };

    return res.status(200).json(responseData);

  } catch (error: any) {
    console.error('My Assets API Error:', error);
    return res.status(500).json({ message: error?.message || 'Internal server error.', details: String(error?.stack || error) });
  }
}
