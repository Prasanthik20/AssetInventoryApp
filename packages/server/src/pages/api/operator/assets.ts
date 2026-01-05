import type { NextApiRequest, NextApiResponse } from 'next';
import query from '@/lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
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
      SELECT 
    aa.id AS "assignmentId",
    ad.id AS "assetId",
    ad.name AS "assetName",
    ad."asset_Id" AS "barcode",
    ad.location AS "assetLocation",
    aa.expected_return_date AS "expectedReturnDate"
  FROM "Asset_Assignments" aa
  INNER JOIN "Asset_Details" ad ON ad.id = aa."assetId"
  WHERE aa."operator_employeeId" = $1
    -- This ensures that if returnasset.ts set assigned_to to NULL, 
    -- the asset will stop showing on the dashboard.
    AND ad.assigned_to = $1 
  ORDER BY aa.assigned_date DESC;
    `;

    const assetsResult = await query(assetsQuery, [operatorEmployeeId]);

    /**
     * 🔥 Determine Overdue Status (expectedReturnDate < today)
     */
    const today = new Date();

    const processedAssets = assetsResult.rows.map((asset: any) => {
      const due = asset.expectedReturnDate
        ? new Date(asset.expectedReturnDate)
        : null;

      const isOverdue = due ? due < today : false;

      return {
        assignmentId: Number(asset.assignmentId), // 🔥 UNIQUE
        assetId: Number(asset.assetId),
        assetName: asset.assetName,
        barcode: asset.barcode,
        location: asset.assetLocation,
        expectedReturnDate: asset.expectedReturnDate,
        isOverdue,                        // ⭐ ADDED (frontend uses this)
        status: isOverdue ? "Overdue" : "Assigned", // ⭐ Added for FieldAssets
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
