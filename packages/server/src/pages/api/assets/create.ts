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

    /* ============================
       BASIC VALIDATION
    ============================ */
    if (!assetName || !category) {
      return res
        .status(400)
        .json({ message: "Asset name and category are required" });
    }

    /* ============================
       GET CATEGORY ID
    ============================ */
    const categoryResult = await query(
      `SELECT "categoryId" FROM "Category" WHERE category = $1 LIMIT 1`,
      [category]
    );

    if (categoryResult.rows.length === 0) {
      return res.status(400).json({ message: "Invalid category" });
    }

    const categoryId = categoryResult.rows[0].categoryId;

    /* ============================
       GET STATUS ID
    ============================ */
    const statusResult = await query(
      `SELECT id FROM "Status" WHERE status = $1 LIMIT 1`,
      [status || "Unassigned"]
    );

    if (statusResult.rows.length === 0) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const statusId = statusResult.rows[0].id;

    /* ============================
       INSERT ASSET (FIXED)
    ============================ */
    const result = await query(
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
      VALUES
      ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      RETURNING *
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

    return res.status(201).json({
      message: "Asset created successfully",
      asset: result.rows[0]
    });

  } catch (error: any) {
    console.error("Create Asset API Error:", error.message);
    return res.status(500).json({ message: error.message });
  }
}
