import type { NextApiRequest, NextApiResponse } from 'next';
import query from '@/lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const { assetId } = req.query;

  if (!assetId || typeof assetId !== 'string') {
    return res.status(400).json({ message: 'Asset ID is required.' });
  }

  try {
    const sqlQuery = `
      SELECT
        a.id,
        a.name AS "assetName",
        cat.category AS "category",
        s.status AS "status",
        a.model_no AS "modelNumber",
        a.serial_no AS "serialNumber",
        a."asset_Id" AS "barcode",
        a.location,
        u."fullName" AS "assignedBy",
        a.warranty_expiry AS "warrantyExpiry",
        a.purchase_date AS "purchaseDate",
        a.price,
        (
          SELECT "assigned_date"
          FROM "Asset_Assignments"
          WHERE "assetId" = a.id
          ORDER BY id DESC
          LIMIT 1
        ) AS assigned_date,
        (
          SELECT "expected_return_date"
          FROM "Asset_Assignments"
          WHERE "assetId" = a.id
          ORDER BY id DESC
          LIMIT 1
        ) AS expected_return_date
      FROM "Asset_Details" a
      LEFT JOIN "Category" cat ON a."categoryId" = cat."categoryId"
      LEFT JOIN "Status" s ON a.status_id = s.id
      LEFT JOIN "Users" u ON a.assigned_by = u."employeeId"
      WHERE a.id = $1;
    `;

    const result = await query(sqlQuery, [parseInt(assetId)]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: `Asset with ID ${assetId} not found.` });
    }

    const asset = result.rows[0];

    const formatDate = (d: string | null) =>
      d ? new Date(d).toISOString().split('T')[0] : null;

    // 🔥 Calculate Overdue Status
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const expectedReturn = asset.expected_return_date
      ? new Date(asset.expected_return_date)
      : null;

    const isOverdue = expectedReturn ? expectedReturn < today : false;

    const formatted = {
      id: asset.id,
      assetName: asset.assetName,
      category: asset.category,
      status: isOverdue ? "Overdue" : asset.status, // 🔥 Overdue logic
      modelNumber: asset.modelNumber,
      serialNumber: asset.serialNumber,
      barcode: asset.barcode,
      location: asset.location,
      assignedBy: asset.assignedBy || 'N/A',
      warrantyExpiry: formatDate(asset.warrantyExpiry),
      purchaseDate: formatDate(asset.purchaseDate),
      assignedDate: formatDate(asset.assigned_date),
      expectedReturnDate: formatDate(asset.expected_return_date),
      value: asset.price ? parseFloat(asset.price).toLocaleString() : 'N/A',
    };

    return res.status(200).json(formatted);

  } catch (error) {
    console.error('Get Asset Error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
}
