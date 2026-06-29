import type { NextApiRequest, NextApiResponse } from "next";
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

  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  const {
    assetId,
    assignmentId,
    operatorId,
    supervisorId,
    reason
  } = req.body;

  console.log("RECEIVED BODY:", req.body);

  if (!assetId || !operatorId || !supervisorId || !reason) {
    const missing = [];
  if (!assetId) missing.push("assetId");
  if (!operatorId) missing.push("operatorId");
  if (!supervisorId) missing.push("supervisorId");
  if (!reason) missing.push("reason");
    return res.status(400).json({ message: "Missing required fields" });
  }

  try {
    const tenantIdResult = await query(
      `SELECT "tenantId" FROM "Users" WHERE "employeeId" = $1 LIMIT 1`,
      [operatorId]
    );
    const tenantId = tenantIdResult.rows[0]?.tenantId || null;

    const result = await query(
      `
      INSERT INTO "Notifications"
      ("assetId", "assignmentId", "senderId", "receiverId", "reason", "status", "created_at", "tenantId")
      VALUES ($1, $2, $3, $4, $5, 'unread', NOW(), $6)
      RETURNING *
      `,
      [
        assetId,
        assignmentId ?? null,
        operatorId,     // sender = OPERATOR
        supervisorId,   // receiver = SUPERVISOR
        reason,
        tenantId
      ]
    );

    return res.status(200).json({
      message: "Overdue notification sent to supervisor",
      notification: result.rows[0]
    });

  } catch (error) {
    console.error("Overdue Notification Error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}
