import type { NextApiRequest, NextApiResponse } from 'next';
import query from '@/lib/db';
import { setCorsHeaders } from '@/lib/corsHeaders';
 
export const config = {
    api: {
        bodyParser: {
            sizeLimit: '2gb',
        },
    },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Set CORS headers
  const origin = req.headers.origin as string;
  setCorsHeaders(res, origin);

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { assetId } = req.query;

  if (!assetId || typeof assetId !== 'string') {
    return res.status(400).json({ message: 'Asset ID is required.' });
  }

  // Handle PUT - Update Asset
  if (req.method === 'PUT') {
    try {
      const {
        assetName,
        category,
        controllerKey,
        modelNumber,
        serialNumber,
        purchaseDate,
        warrantyExpiry,
        price,
        location,
        status,
        photoURL,
        barcodeURL
      } = req.body;

      await query("BEGIN", []);

      // Build dynamic update query
      const updates: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      const currentAssetRes = await query(
        `SELECT cat.category AS category
         FROM "Asset_Details" a
         LEFT JOIN "Category" cat ON a."categoryId" = cat."categoryId"
         WHERE a.id = $1
         LIMIT 1`,
        [parseInt(assetId)]
      );

      if (currentAssetRes.rows.length === 0) {
        await query("ROLLBACK", []);
        return res.status(404).json({ message: `Asset with ID ${assetId} not found.` });
      }

      let effectiveCategory = String(currentAssetRes.rows[0]?.category || '').trim().toLowerCase();

      if (assetName !== undefined) {
        updates.push(`name = $${paramIndex++}`);
        values.push(assetName);
      }

      if (category !== undefined) {
        const categoryRes = await query(
          `SELECT "categoryId" FROM "Category" WHERE category = $1 LIMIT 1`,
          [category]
        );
        if (categoryRes.rows.length > 0) {
          updates.push(`"categoryId" = $${paramIndex++}`);
          values.push(categoryRes.rows[0].categoryId);
          effectiveCategory = String(category || '').trim().toLowerCase();
        }
      }

      if (controllerKey !== undefined || category !== undefined) {
        const normalizedControllerKey =
          typeof controllerKey === 'string' ? controllerKey.trim() : String(controllerKey || '').trim();
        const controllerKeyValue = effectiveCategory.includes('controller')
          ? (normalizedControllerKey || null)
          : null;

        updates.push(`"controller_key" = $${paramIndex++}`);
        values.push(controllerKeyValue);
      }

      if (modelNumber !== undefined) {
        updates.push(`model_no = $${paramIndex++}`);
        values.push(modelNumber || null);
      }

      if (serialNumber !== undefined) {
        updates.push(`serial_no = $${paramIndex++}`);
        values.push(serialNumber);
      }

      if (purchaseDate !== undefined) {
        updates.push(`purchase_date = $${paramIndex++}`);
        values.push(purchaseDate || null);
      }

      if (warrantyExpiry !== undefined) {
        updates.push(`warranty_expiry = $${paramIndex++}`);
        values.push(warrantyExpiry || null);
      }

      if (price !== undefined) {
        updates.push(`price = $${paramIndex++}`);
        values.push(price || null);
      }

      if (location !== undefined) {
        updates.push(`location = $${paramIndex++}`);
        values.push(location || null);
      }

      if (status !== undefined) {
        const statusRes = await query(
          `SELECT id FROM "Status" WHERE status = $1 LIMIT 1`,
          [status]
        );
        if (statusRes.rows.length > 0) {
          updates.push(`status_id = $${paramIndex++}`);
          values.push(statusRes.rows[0].id);
        }
      }

      if (photoURL !== undefined) {
        updates.push(`"photoURL" = $${paramIndex++}`);
        values.push(photoURL || null);
      }

      if (barcodeURL !== undefined) {
        updates.push(`"barcodeURL" = $${paramIndex++}`);
        values.push(barcodeURL || null);
      }

      if (updates.length === 0) {
        await query("ROLLBACK", []);
        return res.status(400).json({ message: 'No fields to update.' });
      }

      // Add asset ID as last parameter
      values.push(parseInt(assetId));

      const updateQuery = `
        UPDATE "Asset_Details"
        SET ${updates.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING id
      `;

      const result = await query(updateQuery, values);

      if (result.rows.length === 0) {
        await query("ROLLBACK", []);
        return res.status(404).json({ message: `Asset with ID ${assetId} not found.` });
      }

      await query("COMMIT", []);

      return res.status(200).json({
        message: 'Asset updated successfully',
        assetId: result.rows[0].id.toString()
      });

    } catch (error: any) {
      await query("ROLLBACK", []);
      console.error('Update Asset Error:', error);
      return res.status(500).json({
        message: error.message || 'Internal server error.',
        detail: error.detail
      });
    }
  }

  // Handle GET - Retrieve Asset
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET', 'PUT']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  if (!assetId || typeof assetId !== 'string') {
    return res.status(400).json({ message: 'Asset ID is required.' });
  }

  try {
    const sqlQuery = `
      SELECT
        a.id AS "assetId",
        a.name AS "assetName",
        cat.category AS "category",
        a."controller_key" AS "controllerKey",
        s.status AS "dbStatus",
        a.model_no AS "modelNumber",
        a.serial_no AS "serialNumber",
        a."asset_Id" AS "barcode",
        a.location,
        a."photoURL",
        u."fullName" AS "assignedBy",
        a.assigned_to,
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
        ,(
          SELECT "projectName"
          FROM "Asset_Assignments"
          WHERE "assetId" = a.id
          ORDER BY id DESC
          LIMIT 1
        ) AS "projectName"
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

   // Check 1: Is the date in the past?
    const isPastDue = expectedReturn ? expectedReturn < today : false;
    
    // Check 2: Is it currently assigned to someone in the DB?
    const isActuallyAssigned = asset.dbStatus === "Assigned" && asset.assigned_to !== null;

    const formatted = {
      assetId: asset.assetId,
      assetName: asset.assetName,
      category: asset.category,
      controllerKey: asset.controllerKey,
      status: (isActuallyAssigned && isPastDue) ? "Overdue" : asset.dbStatus, // 🔥 Overdue logic
      modelNumber: asset.modelNumber,
      serialNumber: asset.serialNumber,
      barcode: asset.barcode,
      location: asset.location,
      photoURL: asset.photoURL || null,
      assignedBy: asset.assignedBy || 'N/A',
      warrantyExpiry: formatDate(asset.warrantyExpiry),
      purchaseDate: formatDate(asset.purchaseDate),
      assignedDate: formatDate(asset.assigned_date),
      expectedReturnDate: formatDate(asset.expected_return_date),
      projectName: asset.projectName || null,
      value: asset.price ? parseFloat(asset.price).toLocaleString() : 'N/A',
    };

    return res.status(200).json(formatted);

  } catch (error) {
    console.error('Get Asset Error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
}
