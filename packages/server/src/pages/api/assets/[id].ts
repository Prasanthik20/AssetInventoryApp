import type { NextApiResponse } from 'next';
import query from '@/lib/db';
import { setCorsHeaders } from '@/lib/corsHeaders';
import { withAuth, AuthenticatedRequest } from "@/lib/apiHandler";

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  // Set CORS headers
  const origin = req.headers.origin as string;
  setCorsHeaders(res, origin);

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Next.js dynamic route param is 'id' because the file is [id].ts
  const { id } = req.query;
  const { tenantId } = req.user;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ message: 'Asset ID is required.' });
  }

  const assetId = id; // For readability and matching legacy logic

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
        barcodeURL,
        dynamicFields // Expected as array of { fieldId: number, value: string }
      } = req.body;

      await query("BEGIN", []);

      // 1. Verify ownership
      const ownershipRes = await query(
        `SELECT id FROM "Asset_Details" WHERE id = $1 AND "tenantId" = $2 LIMIT 1`,
        [parseInt(assetId), tenantId]
      );
      if (ownershipRes.rows.length === 0) {
        await query("ROLLBACK", []);
        return res.status(404).json({ message: "Asset not found or access denied." });
      }

      // Build dynamic update query
      const updates: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      const currentAssetRes = await query(
        `SELECT cat.category AS category
         FROM "Asset_Details" a
         LEFT JOIN "Category" cat ON a."categoryId" = cat."categoryId"
         WHERE a.id = $1 AND a."tenantId" = $2
         LIMIT 1`,
        [parseInt(assetId), tenantId]
      );

      let effectiveCategory = String(currentAssetRes.rows[0]?.category || '').trim().toLowerCase();

      if (assetName !== undefined) {
        updates.push(`name = $${paramIndex++}`);
        values.push(assetName);
      }

      if (category !== undefined) {
        const categoryRes = await query(
          `SELECT "categoryId" FROM "Category" WHERE category = $1 AND ("tenantId" = $2 OR "tenantId" IS NULL) LIMIT 1`,
          [category, tenantId]
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
          `SELECT id FROM "Status" WHERE status = $1 AND ("tenantId" = $2 OR "tenantId" IS NULL) LIMIT 1`,
          [status, tenantId]
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

      if (updates.length > 0) {
        values.push(parseInt(assetId));
        values.push(tenantId);
        const updateQuery = `
          UPDATE "Asset_Details"
          SET ${updates.join(', ')}
          WHERE id = $${paramIndex++} AND "tenantId" = $${paramIndex}
          RETURNING id
        `;
        await query(updateQuery, values);
      }

      // Update Dynamic Fields (EAV)
      if (dynamicFields && Array.isArray(dynamicFields)) {
        for (const field of dynamicFields) {
          if (field.fieldId) {
            // Check if field exists for this category/tenant
            const fieldExistsRes = await query(
              `SELECT id FROM "AssetCategoryFields" WHERE id = $1 AND "tenantId" = $2 LIMIT 1`,
              [field.fieldId, tenantId]
            );
            
            if (fieldExistsRes.rows.length > 0) {
              await query(`DELETE FROM "AssetDynamicValues" WHERE "assetId" = $1 AND "fieldId" = $2`, [parseInt(assetId), field.fieldId]);
              await query(`INSERT INTO "AssetDynamicValues" ("assetId", "fieldId", value) VALUES ($1, $2, $3)`, [parseInt(assetId), field.fieldId, String(field.value)]);
            }
          }
        }
      }

      await query("COMMIT", []);

      return res.status(200).json({
        message: 'Asset updated successfully',
        assetId: assetId
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

  try {
    const sqlQuery = `
      SELECT
        a.id AS "assetId",
        a.name AS "assetName",
        cat.category AS "category",
        a."categoryId" AS "categoryId",
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
          WHERE "assetId" = a.id AND "tenantId" = $2
          ORDER BY id DESC
          LIMIT 1
        ) AS assigned_date,
        (
          SELECT "expected_return_date"
          FROM "Asset_Assignments"
          WHERE "assetId" = a.id AND "tenantId" = $2
          ORDER BY id DESC
          LIMIT 1
        ) AS expected_return_date
        ,(
          SELECT "projectName"
          FROM "Asset_Assignments"
          WHERE "assetId" = a.id AND "tenantId" = $2
          ORDER BY id DESC
          LIMIT 1
        ) AS "projectName"
      FROM "Asset_Details" a
      LEFT JOIN "Category" cat ON a."categoryId" = cat."categoryId"
      LEFT JOIN "Status" s ON a.status_id = s.id
      LEFT JOIN "Users" u ON a.assigned_by = u."employeeId"
      WHERE a.id = $1 AND a."tenantId" = $2;
    `;

    const result = await query(sqlQuery, [parseInt(assetId), tenantId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: `Asset with ID ${assetId} not found.` });
    }

    const asset = result.rows[0];

    // Fetch Dynamic Values
    const dynamicValuesRes = await query(
      `SELECT adv."fieldId", adv.value, acf."fieldName", acf."fieldType"
       FROM "AssetDynamicValues" adv
       JOIN "AssetCategoryFields" acf ON adv."fieldId" = acf.id
       WHERE adv."assetId" = $1`,
      [parseInt(assetId)]
    );

    const formatDate = (d: string | null) =>
      d ? new Date(d).toISOString().split('T')[0] : null;

    // 🔥 Calculate Overdue Status
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const expectedReturn = asset.expected_return_date
      ? new Date(asset.expected_return_date)
      : null;

    const isPastDue = expectedReturn ? expectedReturn < today : false;
    const isActuallyAssigned = asset.dbStatus === "Assigned" && asset.assigned_to !== null;

    const formatted = {
      assetId: asset.assetId,
      assetName: asset.assetName,
      category: asset.category,
      categoryId: asset.categoryId,
      controllerKey: asset.controllerKey,
      status: (isActuallyAssigned && isPastDue) ? "Overdue" : asset.dbStatus,
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
      price: asset.price || null,
      value: asset.price ? parseFloat(asset.price).toLocaleString() : 'N/A',
      dynamicValues: dynamicValuesRes.rows
    };

    return res.status(200).json(formatted);

  } catch (error) {
    console.error('Get Asset Error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
}

export default withAuth(handler);
