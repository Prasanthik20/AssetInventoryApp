import type { NextApiResponse } from 'next';
import query from "@/lib/db";
import { setCorsHeaders } from "@/lib/corsHeaders";
import { withAuth, AuthenticatedRequest } from "@/lib/apiHandler";
import { withSubscriptionLimit } from "@/lib/subscription";

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  // Set CORS headers
  const origin = req.headers.origin as string;
  setCorsHeaders(res, origin);

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  if (req.method !== "POST") return res.status(405).json({ message: "Method not allowed" });

  const { tenantId } = req.user;

  try {
    const payload = req.body?.data && typeof req.body.data === "object"
      ? req.body.data
      : req.body;

    const {
      id, assetId: payloadAssetId,
      assetName, category, modelNumber, serialNumber,
      purchaseDate, warrantyExpiry, price, location, status, photoURL,
      controllerKey,
      barcodeURL, barcode,
      assignedBy, assignedTo, expectedReturnDate,
      assignmentId, operatorId, senderId, receiverId,
      dynamicFields // Expected as an array of { fieldId: number, value: string }
    } = payload;

    if (!assetName?.toString().trim()) {
      return res.status(400).json({ message: "Asset name is required" });
    }

    if (!serialNumber?.toString().trim()) {
      return res.status(400).json({ message: "Serial number is required" });
    }

    // Convert assignedBy and assignedTo to numbers (employee IDs)
    const assignedByNum = assignedBy ? parseInt(String(assignedBy), 10) : null;
    const assignedToNum = assignedTo ? parseInt(String(assignedTo), 10) : null;
    const operatorIdNum = operatorId ? parseInt(String(operatorId), 10) : null;
    const senderIdNum = senderId ? parseInt(String(senderId), 10) : null;
    const receiverIdNum = receiverId ? parseInt(String(receiverId), 10) : null;

    // 1. Get Category ID
    const categoryRes = await query(
      `SELECT "categoryId" FROM "Category" WHERE category = $1 AND ("tenantId" = $2 OR "tenantId" IS NULL) LIMIT 1`,
      [category, tenantId]
    );
    if (!categoryRes.rows.length) return res.status(400).json({ message: "Invalid category" });
    const categoryId = categoryRes.rows[0].categoryId;
    const normalizedCategory = String(category || '').trim().toLowerCase();
    const normalizedControllerKey =
      typeof controllerKey === 'string' ? controllerKey.trim() : String(controllerKey || '').trim();
    const controllerKeyValue = normalizedCategory.includes('controller')
      ? (normalizedControllerKey || null)
      : null;

    // 2. Get Status ID
    const statusVal = (status || "Unassigned").trim();
    let statusRes = await query(
      `SELECT id FROM "Status" WHERE (status = $1 OR status ILIKE $1) AND ("tenantId" = $2 OR "tenantId" IS NULL) LIMIT 1`,
      [statusVal, tenantId]
    );
    if (!statusRes.rows.length) {
      statusRes = await query(
        `SELECT id FROM "Status" WHERE status = $1 OR status ILIKE $1 LIMIT 1`,
        [statusVal]
      );
    }
    if (!statusRes.rows.length) return res.status(400).json({ message: "Invalid status" });
    const statusId = statusRes.rows[0].id;

    // 3. Create endpoint should fail if serial number already exists.
    const serialNumberRes = await query(
      `SELECT id FROM "Asset_Details" WHERE "serial_no" = $1 AND "tenantId" = $2 LIMIT 1`,
      [serialNumber, tenantId]
    );
    if (serialNumberRes.rows.length > 0) {
      return res.status(409).json({
        message: "Serial number already exists",
      });
    }

    // 4. INSERT new asset
    await query("BEGIN", []);

    // Lock id generation for this transaction
    await query(`SELECT pg_advisory_xact_lock(hashtext('asset_details_id_lock'))`, []);

    const nextIdRes = await query(
      `SELECT COALESCE(MAX(id), 0) + 1 AS next_id FROM "Asset_Details"`,
      []
    );
    const nextId = nextIdRes.rows[0]?.next_id;

    const insertAsset = await query(
      `INSERT INTO "Asset_Details" (id, name, "categoryId", "controller_key", "model_no", "serial_no", "purchase_date", "warranty_expiry", price, location, "status_id", "photoURL", "barcodeURL", assigned_by, assigned_to, "tenantId")
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING id`,
      [
        nextId,
        assetName,
        categoryId,
        controllerKeyValue,
        modelNumber || null,
        serialNumber,
        purchaseDate || null,
        warrantyExpiry || null,
        price || null,
        location || null,
        statusId,
        photoURL || null,
        barcodeURL || barcode || null,
        assignedByNum,
        assignedToNum,
        tenantId
      ]
    );

    const assetId = insertAsset.rows[0].id;
    const assetIdStr = assetId.toString();

    // 4. Update the generated asset_Id field
    await query(
      `UPDATE "Asset_Details" SET "asset_Id" = $1 WHERE id = $2`,
      [assetIdStr, assetId]
    );

    // 5. Insert Dynamic Values (EAV)
    if (dynamicFields && Array.isArray(dynamicFields)) {
      for (const field of dynamicFields) {
        if (field.fieldId && field.value !== undefined) {
          await query(
            `INSERT INTO "AssetDynamicValues" ("assetId", "fieldId", value) VALUES ($1, $2, $3)`,
            [assetId, field.fieldId, String(field.value)]
          );
        }
      }
    }

    // 6. Insert into Category_Details
    const nextCategoryDetailsIdRes = await query(
      `SELECT COALESCE(MAX(id), 0) + 1 AS next_id FROM "Category_Details"`,
      []
    );
    const nextCategoryDetailsId = nextCategoryDetailsIdRes.rows[0]?.next_id;

    await query(
      `INSERT INTO "Category_Details" (id, "categoryId", name, "asset_Id") VALUES ($1, $2, $3, $4)`,
      [nextCategoryDetailsId, categoryId, assetName, assetIdStr]
    );

    // 7. Optionally create assignment
    if (operatorIdNum && senderIdNum && receiverIdNum) {
      await query(
        `INSERT INTO "Asset_Assignments" 
        ("assetId", "operator_employeeId", "supervisor_employeeId", "expected_return_date", "tenantId")
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT DO NOTHING`,
        [assetId, operatorIdNum, senderIdNum || receiverIdNum, expectedReturnDate || null, tenantId]
      );
    }

    await query("COMMIT", []);

    return res.status(201).json({
      message: "Asset created successfully",
      asset: {
        id: assetId,
        assetId: assetIdStr,
        assetName,
        serialNumber,
        category,
        controllerKey: controllerKeyValue,
        status,
        assignedBy: assignedByNum,
        assignedTo: assignedToNum,
        photoURL: photoURL || null,
        barcodeURL: barcodeURL || barcode || null
      }
    });

  } catch (error: any) {
    try {
      await query("ROLLBACK", []);
    } catch {
      // Ignore
    }

    console.error("FULL DATABASE ERROR:", error);
    return res.status(500).json({ 
      message: error.message,
      detail: error.detail || "Check console for full error logs"
    });
  }
}

export default withSubscriptionLimit(handler, 'assets');