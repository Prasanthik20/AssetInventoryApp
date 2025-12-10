import type { NextApiRequest, NextApiResponse } from "next";
import query from "@/lib/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") return res.status(200).end();

  // ✅ Handle GET (fetch overdue data)
  if (req.method === "GET") {
    try {
      const { supervisorId } = req.query;

      if (!supervisorId) {
        return res.status(400).json({ message: "supervisorId required" });
      }

      const sql = `
        SELECT 
          aa.id AS "assignmentId",
          ad.id AS "assetId",
          ad.name AS "assetName",
          op."fullName" AS "operatorName",
          aa.location,
          aa."projectName",
          aa.assigned_date,
          aa.expected_return_date
        FROM "Asset_Assignments" aa
        JOIN "Asset_Details" ad ON ad.id = aa."assetId"
        JOIN "Users" op ON op."employeeId" = aa."operator_employeeId"
        WHERE aa."supervisor_employeeId" = $1
        AND aa.expected_return_date < CURRENT_DATE
        ORDER BY aa.expected_return_date ASC;
      `;

      const result = await query(sql, [Number(supervisorId)]);
      return res.status(200).json({ overdue: result.rows });
    } catch (err) {
      console.error("Supervisor Overdue API Error:", err);
      return res.status(500).json({ message: "Internal Server Error" });
    }
  }

  // ✅ Handle POST (send notification)
  if (req.method === "POST") {
    try {
    const { assetId, assignmentId, senderId, receiverId, reason } = req.body;

    if (!assetId || !senderId || !receiverId || !reason) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    await query(
      `INSERT INTO "Notifications" 
        ("assetId", "assignmentId", "senderId", "receiverId", "reason", "status", "created_at")
       VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
      [assetId, assignmentId || null, senderId, receiverId, reason, "unread"]
    );

    return res.status(200).json({ success: true, message: "Notification created" });
    } catch (err) {
      console.error("Notification Error:", err);
      return res.status(500).json({ message: "Internal Server Error" });
    }
  }

  // ❌ If method is not GET or POST
  return res.status(405).json({ message: "Method Not Allowed" });
}