import type { NextApiRequest, NextApiResponse } from 'next';
import query from "@/lib/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ message: "Method not allowed" });

  try {
    const {
      assetName, category, modelNumber, serialNumber,
      purchaseDate, warrantyExpiry, price, location, status
    } = req.body;

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

    await query("BEGIN", []);

    // 3. Insert into Asset_Details (Note lowercase field names to match Prisma @map or defaults)
    const insertAsset = await query(
      `
      INSERT INTO "Asset_Details" 
      (name, "categoryId", model_no, serial_no, purchase_date, warranty_expiry, price, location, status_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id
      `,
      [
        assetName,
        categoryId,
        modelNumber || null,
        serialNumber || null,
        purchaseDate || null, 
        warrantyExpiry || null,
        price || null,
        location || null,
        statusId
      ]
    );

    const assetId = insertAsset.rows[0].id;
    const assetIdStr = assetId.toString(); // Convert BigInt to String for the asset_Id field

    // 4. Update the generated asset_Id field
    await query(
      `UPDATE "Asset_Details" SET "asset_Id" = $1 WHERE id = $2`,
      [assetIdStr, assetId]
    );

    // 5. Insert into Category_Details (Matches your unique asset_Id relation)
    await query(
      `INSERT INTO "Category_Details" ("categoryId", name, "asset_Id") VALUES ($1, $2, $3)`,
      [categoryId, assetName, assetIdStr]
    );

    await query("COMMIT", []);

    return res.status(201).json({
      message: "Asset created successfully",
      assetId: assetIdStr
    });

  } catch (error: any) {
    await query("ROLLBACK", []);
    console.error("FULL DATABASE ERROR:", error);
    return res.status(500).json({ 
      message: error.message,
      detail: error.detail || "Check console for full error logs"
    });
  }
}