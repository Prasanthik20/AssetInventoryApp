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
    const userEmployeeId = parseInt(rawId);

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
        aa."supervisor_employeeId" AS "assignedBy",
        aa.status AS "assignmentStatus",
        ad.assigned_to AS "currentlyAssignedTo"
      FROM "Asset_Assignments" aa
      INNER JOIN "Asset_Details" ad ON ad.id = aa."assetId"
      WHERE (CAST(aa."operator_employeeId" AS text) = CAST($1 AS text) OR CAST(ad.assigned_to AS text) = CAST($1 AS text))
        AND (
          ad."tenantId" = (SELECT "tenantId" FROM "Users" WHERE CAST("employeeId" AS text) = CAST($1 AS text) LIMIT 1)
          OR ad."tenantId" IS NULL
        )
      ORDER BY aa.assigned_date DESC NULLS LAST, aa.id DESC;
    `;

    const assetsResult = await query(assetsQuery, [userEmployeeId]);

    /**
     * Determine Overdue Status (expectedReturnDate < today)
     */
    const today = new Date();

    const processedAssets = assetsResult.rows.map((asset: any) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      let isOverdue = false;
      const assignmentStatus = String(asset.assignmentStatus || '').toLowerCase();
      if (asset.expectedReturnDate) {
        const due = new Date(asset.expectedReturnDate);
        due.setHours(0, 0, 0, 0);
        isOverdue = assignmentStatus === 'assigned' && due < today;
      }

      const isCurrentlyAssigned = Number(asset.currentlyAssignedTo) === userEmployeeId;

      let normalizedStatus = 'Assigned';
      if (assignmentStatus === 'returned' || !isCurrentlyAssigned) {
        normalizedStatus = 'Returned';
      } else if (isOverdue) {
        normalizedStatus = 'Overdue';
      }

      return {
        assignmentId: Number(asset.assignmentId),
        assetId: Number(asset.assetId),
        assetName: asset.assetName,
        barcode: asset.barcode,
        barcodeURL: asset.barcodeURL,
        serialNo: asset.serialNo,
        location: asset.assetLocation,
        photoURL: asset.photoURL,
        assignedDate: asset.assignedDate,
        expectedReturnDate: asset.expectedReturnDate,
        returnedDate: asset.returnedDate,
        assignedBy: asset.assignedBy,
        isCurrentlyAssigned,
        isOverdue,
        status: normalizedStatus,
      };
    });

    /**
     * Get last known user location
     */
    const locationQuery = `
      SELECT location 
      FROM "Asset_Assignments"
      WHERE "operator_employeeId" = $1
      ORDER BY assigned_date DESC NULLS LAST
      LIMIT 1;
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

  } catch (error) {
    console.error('My Assets API Error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
}
