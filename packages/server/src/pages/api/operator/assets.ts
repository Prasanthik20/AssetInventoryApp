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

  const { operatorId } = req.query;

  if (!operatorId || typeof operatorId !== 'string') {
    return res.status(400).json({ message: 'Operator ID is required.' });
  }

  try {
    const operatorEmployeeId = parseInt(operatorId);

    /**
     * 🔥 FIXED SQL QUERY
     */
    const assetsQuery = `
    SELECT DISTINCT ON (ad.id) 
    aa.id AS "assignmentId",
    ad.id AS "assetId",
    ad.name AS "assetName",
    ad.serial_no as "serialNo",
    ad."asset_Id" AS "barcode",
    COALESCE(ad."photoURL", aa."photoURL") AS "photoURL",
    COALESCE(ad."barcodeURL", aa."barcodeURL") AS "barcodeURL",
    ad.location AS "assetLocation",
    aa.expected_return_date AS "expectedReturnDate",
    ad.assigned_by AS "assignedBy",
    
    s.status AS "Status"
  FROM "Asset_Assignments" aa
  INNER JOIN "Asset_Details" ad ON ad.id = aa."assetId"
  INNER JOIN "Status" s ON s.id = ad.status_Id
  WHERE aa."operator_employeeId" = $1
    AND ad.assigned_to = $1   
  ORDER BY ad.id, aa.assigned_date DESC;
    `;

    const assetsResult = await query(assetsQuery, [operatorEmployeeId]);

    /**
     * 🔥 Determine Overdue Status (expectedReturnDate < today)
     */
    const today = new Date();

    const processedAssets = assetsResult.rows.map((asset: any) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0); // 🕛 Set to start of today

      let isOverdue = false;
      if (asset.expectedReturnDate) {
        const due = new Date(asset.expectedReturnDate);
        due.setHours(0, 0, 0, 0); // 🕛 Set to start of the due day
        isOverdue = due < today;
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
        expectedReturnDate: asset.expectedReturnDate,
        assignedBy: asset.assignedBy,
        isOverdue,
        status: isOverdue ? "Overdue" : "Assigned",
      };
    });

    /**
     * 🔥 Get last known operator location
     */
    const locationQuery = `
      SELECT location 
      FROM "Asset_Assignments"
      WHERE "operator_employeeId" = $1
      ORDER BY assigned_date DESC NULLS LAST
      LIMIT 1;
    `;

    const locationResult = await query(locationQuery, [operatorEmployeeId]);

    const currentLocation =
      locationResult.rows.length > 0 ? locationResult.rows[0].location : 'No Location';

    /**
     * 🔥 Final API Output
     */
    const responseData = {
      operatorEmployeeId,
      assignedCount: processedAssets.length,
      location: currentLocation,
      assets: processedAssets,
    };

    return res.status(200).json(responseData);

  } catch (error) {
    console.error('Operator Assets API Error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
}
