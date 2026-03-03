import type { NextApiRequest, NextApiResponse } from "next";
import query from "@/lib/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // ✅ CORS headers
  res.setHeader("Access-Control-Allow-Origin", "http://localhost:8081");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  // ✅ Handle preflight (VERY IMPORTANT)
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "PUT") {
    res.setHeader("Allow", ["PUT", "OPTIONS"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const id = Number(req.body?.id);
    if (!id) return res.status(400).json({ error: "Invalid notification id" });

    await query(
      `UPDATE "Notifications"
       SET "isSeenByAdmin" = true
       WHERE id = $1`,
      [id]
    );

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("❌ hide notification error:", error);
    return res.status(500).json({ error: "Failed to update" });
  }
}