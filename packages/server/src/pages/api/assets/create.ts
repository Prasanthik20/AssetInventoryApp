import type { NextApiRequest, NextApiResponse } from "next";
import query from "@/lib/db";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  /* ============================
     CORS
  ============================ */
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST")
    return res.status(405).json({ message: "Method not allowed" });

  try {
    const {
      assetName,
      category,
      modelNumber,
      serialNumber,
      purchaseDate,
      warrantyExpiry,
      price,
      location,
      status
    } = req.body;

    if (!assetName || !category) {
      return res
        .status(400)
        .json({ message: "Asset name and category are required" });
    }

    /* ============================
       GET CATEGORY ID
    ============================ */
    const categoryRes = await query(
      `SELECT "categoryId" FROM "Category" WHERE category = $1 LIMIT 1`,
      [category]
    );

    if (!categoryRes.rows.length) {
      return res.status(400).json({ message: "Invalid category" });
    }

    const categoryId = categoryRes.rows[0].categoryId;

    /* ============================
       GET STATUS ID
    ============================ */
    const statusRes = await query(
      `SELECT id FROM "Status" WHERE status = $1 LIMIT 1`,
      [status || "Unassigned"]
    );

    if (!statusRes.rows.length) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const statusId = statusRes.rows[0].id;

    /* ============================
       TRANSACTION START
    ============================ */
    await query("BEGIN", []);

    /* ============================
       INSERT INTO Asset_Details
    ============================ */
    const insertAsset = await query(
      `
      INSERT INTO "Asset_Details"
      (
        name,
        "categoryId",
        model_no,
        serial_no,
        purchase_date,
        warranty_expiry,
        price,
        location,
        status_id
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      RETURNING id
      `,
      [
        assetName,
        categoryId,
        modelNumber || null,
        serialNumber || null,
        purchaseDate ? new Date(purchaseDate) : null,
        warrantyExpiry ? new Date(warrantyExpiry) : null,
        price || null,
        location || null,
        statusId
      ]
    );

    const assetId = insertAsset.rows[0].id;
    const assetIdStr = assetId.toString();

    /* ============================
       UPDATE asset_Id = id
    ============================ */
    await query(
      `
      UPDATE "Asset_Details"
      SET "asset_Id" = $1
      WHERE id = $2
      `,
      [assetIdStr, assetId]
    );

    /* ============================
       INSERT INTO Category_Details
    ============================ */
    await query(
      `
      INSERT INTO "Category_Details"
      ("categoryId", name, "asset_Id")
      VALUES ($1, $2, $3)
      `,
      [categoryId, assetName, assetIdStr]
    );

    /* ============================
       COMMIT TRANSACTION
    ============================ */
    await query("COMMIT", []);

    /* ============================
       RETURN FINAL ASSET
    ============================ */
    const finalAsset = await query(
      `SELECT * FROM "Asset_Details" WHERE id = $1`,
      [assetId]
    );

    return res.status(201).json({
      message: "Asset created and linked to category successfully",
      asset: finalAsset.rows[0]
    });

  } catch (error: any) {
    await query("ROLLBACK", []);
    console.error("Create Asset Error:", error.message);
    return res.status(500).json({ message: error.message });
  }
}
