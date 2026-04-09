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
    const supervisorEmployeeId = Number(req.query.id);
    if (!Number.isFinite(supervisorEmployeeId)) {
      return res.status(400).json({ message: 'Supervisor employee id is required' });
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
        assignee."fullName" AS "assignedTo",
        assigner."fullName" AS "assignedBy"
      FROM "Asset_Details" a
      LEFT JOIN "Status" s ON s.id = a.status_id
      LEFT JOIN "Users" assignee ON assignee."employeeId" = a.assigned_to
      LEFT JOIN "Users" assigner ON assigner."employeeId" = a.assigned_by
      WHERE a.assigned_to = $1
        AND LOWER(COALESCE(s.status, '')) IN ('assigned', 'overdue')
      ORDER BY a.id ASC`,
      [supervisorEmployeeId],
    );

    const assets = result.rows.map((row: any) => ({
      id: Number(row.id),
      assetId: Number(row.id),
      assetName: row.assetName,
      barcode: row.barcode,
      serialNumber: row.serialNumber,
      status: row.status,
      location: row.location,
      photoURL: row.photoURL,
      barcodeURL: row.barcodeURL,
      purchaseDate: row.purchaseDate,
      warrantyExpiry: row.warrantyExpiry,
      price: row.price,
      assignedTo: row.assignedTo,
      assignedBy: row.assignedBy,
      assignmentId: null,
      isOverdue: String(row.status || '').toLowerCase() === 'overdue',
    }));

    return res.status(200).json({ assets, count: assets.length });
  } catch (error) {
    console.error('Supervisor assets API error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}