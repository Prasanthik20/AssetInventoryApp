import type { NextApiRequest, NextApiResponse } from 'next';
import query from "@/lib/db";
import { setCorsHeaders } from "@/lib/corsHeaders";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Set CORS headers
  const origin = req.headers.origin as string;
  setCorsHeaders(res, origin);

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  if (req.method !== "POST") return res.status(405).json({ message: "Method not allowed" });

  try {
    // Support both payload shapes:
    // 1) flat body { assetName, ... }
    // 2) nested body { data: { assetName, ... } }
    const payload = req.body?.data && typeof req.body.data === "object"
      ? req.body.data
      : req.body;

    const {
      id, assetId: payloadAssetId,
      assetName, category, modelNumber, serialNumber,
      purchaseDate, warrantyExpiry, price, location, status, photoURL,
      barcodeURL, barcode,
      assignedBy, assignedTo, expectedReturnDate,
      assignmentId, operatorId, senderId, receiverId
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

    // 1. Get Category ID (Matches Prisma categoryId)
    const categoryRes = await query(
      `SELECT "categoryId" FROM "Category" WHERE category = $1 LIMIT 1`,
      [category]
    );
    if (!categoryRes.rows.length) return res.status(400).json({ message: "Invalid category" });
    const categoryId = categoryRes.rows[0].categoryId;

    // 2. Get Status ID (Matches Prisma Status table)
    const statusRes = await query(
      `SELECT id FROM "Status" WHERE status = $1 LIMIT 1`,
      [status || "Unassigned"]
    );
    if (!statusRes.rows.length) return res.status(400).json({ message: "Invalid status" });
    const statusId = statusRes.rows[0].id;

    // 3. Check if asset already exists (by id, assetId, or serialNumber)
    const existingAssetId = id || payloadAssetId;
    let existingAsset = null;
    
    if (existingAssetId) {
      const existingRes = await query(
        `SELECT id FROM "Asset_Details" WHERE id = $1 OR "asset_Id" = $2 LIMIT 1`,
        [existingAssetId, String(existingAssetId)]
      );
      existingAsset = existingRes.rows[0];
    } else {
      const existingRes = await query(
        `SELECT id FROM "Asset_Details" WHERE "serialNumber" = $1 LIMIT 1`,
        [serialNumber]
      );
      existingAsset = existingRes.rows[0];
    }

    // If asset exists, update; otherwise, insert
    if (existingAsset) {
      const assetId = existingAsset.id;
      const assetIdStr = assetId.toString();

      // UPDATE Asset_Details
      await query("BEGIN", []);
      
      await query(
        `UPDATE "Asset_Details" 
        SET name = $1, "categoryId" = $2, "modelNumber" = $3, "serialNumber" = $4, 
            "purchaseDate" = $5, "warrantyExpiry" = $6, price = $7, location = $8, 
            "statusId" = $9, "photoURL" = $10, "barcodeURL" = $11, 
            assigned_by = $12, assigned_to = $13
        WHERE id = $14`,
        [
          assetName, categoryId, modelNumber || null, serialNumber,
          purchaseDate || null, warrantyExpiry || null, price || null, location || null,
          statusId, photoURL || null, barcodeURL || barcode || null,
          assignedByNum, assignedToNum, assetId
        ]
      );

      // Update or create assignment if details provided
      if (operatorIdNum && senderIdNum && receiverIdNum) {
        await query(
          `INSERT INTO "Asset_Assignments" 
          ("assetId", "operator_employeeId", "supervisor_employeeId", "expected_return_date")
          VALUES ($1, $2, $3, $4)
          ON CONFLICT ("assetId") DO UPDATE 
          SET "operator_employeeId" = $2, "supervisor_employeeId" = $3, "expected_return_date" = $4`,
          [assetId, operatorIdNum, senderIdNum || receiverIdNum, expectedReturnDate || null]
        );
      }

      await query("COMMIT", []);

      return res.status(200).json({
        message: "Asset updated successfully",
        asset: {
          id: assetId,
          assetId: assetIdStr,
          assetName,
          serialNumber,
          category,
          status,
          assignedBy: assignedByNum,
          assignedTo: assignedToNum,
          photoURL: photoURL || null,
          barcodeURL: barcodeURL || barcode || null
        }
      });
    }

    // Asset doesn't exist, so INSERT new asset
    await query("BEGIN", []);

    // Lock id generation for this transaction to avoid duplicate primary keys
    // when the underlying sequence is out of sync.
    await query(`SELECT pg_advisory_xact_lock(hashtext('asset_details_id_lock'))`, []);

    const nextIdRes = await query(
      `SELECT COALESCE(MAX(id), 0) + 1 AS next_id FROM "Asset_Details"`,
      []
    );
    const nextId = nextIdRes.rows[0]?.next_id;

    // 3. Insert into Asset_Details with all fields including assigned_by, assigned_to
    const insertAsset = await query(
      `INSERT INTO "Asset_Details" (id, name, "categoryId", "modelNumber", "serialNumber", "purchaseDate", "warrantyExpiry", price, location, "statusId", "photoURL", "barcodeURL", assigned_by, assigned_to)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING id`,
      [
        nextId,
        assetName,
        categoryId,
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
        assignedToNum
      ]
    );

    const assetId = insertAsset.rows[0].id;
    const assetIdStr = assetId.toString(); // Convert BigInt to String for the asset_Id field

    // 4. Update the generated asset_Id field
    await query(
      `UPDATE "Asset_Details" SET "asset_Id" = $1 WHERE id = $2`,
      [assetIdStr, assetId]
    );

    // Best-effort: align sequence for other endpoints that rely on default id.
    await query(
      `WITH seq AS (
        SELECT pg_get_serial_sequence('"Asset_Details"', 'id') AS seq_name
      )
      SELECT setval(seq_name, $1::bigint, true)
      FROM seq
      WHERE seq_name IS NOT NULL`,
      [assetId]
    );

    // 5. Insert into Category_Details (Matches your unique asset_Id relation)
    await query(`SELECT pg_advisory_xact_lock(hashtext('category_details_id_lock'))`, []);

    const nextCategoryDetailsIdRes = await query(
      `SELECT COALESCE(MAX(id), 0) + 1 AS next_id FROM "Category_Details"`,
      []
    );
    const nextCategoryDetailsId = nextCategoryDetailsIdRes.rows[0]?.next_id;

    await query(
      `INSERT INTO "Category_Details" (id, "categoryId", name, "asset_Id") VALUES ($1, $2, $3, $4)`,
      [nextCategoryDetailsId, categoryId, assetName, assetIdStr]
    );

    // Best-effort: align Category_Details sequence for any other writes that rely on default id.
    await query(
      `WITH seq AS (
        SELECT pg_get_serial_sequence('"Category_Details"', 'id') AS seq_name
      )
      SELECT setval(seq_name, $1::bigint, true)
      FROM seq
      WHERE seq_name IS NOT NULL`,
      [nextCategoryDetailsId]
    );

    // 6. Optionally create assignment if assignment details are provided
    if (operatorIdNum && senderIdNum && receiverIdNum) {
      await query(
        `INSERT INTO "Asset_Assignments" 
        ("assetId", "operator_employeeId", "supervisor_employeeId", "expected_return_date")
        VALUES ($1, $2, $3, $4)
        ON CONFLICT DO NOTHING`,
        [assetId, operatorIdNum, senderIdNum || receiverIdNum, expectedReturnDate || null]
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
      // Ignore rollback errors when no transaction is active.
    }

    const pgCode = error?.code;
    const constraint = error?.constraint || "";

    if (pgCode === "23505") {
      if (constraint.includes("serial_no") || constraint.includes("Asset_Details_serial_no")) {
        return res.status(409).json({ message: "Serial number already exists" });
      }
      if (constraint.includes("Asset_Details_pkey")) {
        return res.status(409).json({ message: "Asset ID conflict. Please retry." });
      }
      if (constraint.includes("Category_Details_pkey")) {
        return res.status(409).json({ message: "Category detail ID conflict. Please retry." });
      }
      return res.status(409).json({ message: "Duplicate value violates a unique constraint" });
    }

    if (pgCode === "23502") {
      return res.status(400).json({ message: "Missing required asset field(s)" });
    }

    console.error("FULL DATABASE ERROR:", error);
    return res.status(500).json({ 
      message: error.message,
      detail: error.detail || "Check console for full error logs"
    });
  }
}