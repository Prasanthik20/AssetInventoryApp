import type { NextApiRequest, NextApiResponse } from "next";
import query from "@/lib/db";
import { setCorsHeaders } from "@/lib/corsHeaders";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const origin = req.headers.origin as string;
  setCorsHeaders(res, origin);

  try {
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method === "GET") return getManagerNotifications(req, res);
    if (req.method === "POST") return sendOverdueNotification(req, res);
    if (req.method === "PUT") return extendAssetAndResolve(req, res);

    return res.status(405).json({ message: "Method not allowed" });
  } catch (error: any) {
    console.error("Manager API Error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

/* ===========================
   GET Manager Notifications
=========================== */
async function getManagerNotifications(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const managerId = Number(req.query.id || req.query.managerId || req.query.supervisorId);

  if (!managerId) {
    return res.status(400).json({ message: "Manager ID required" });
  }

  const sql = `
    SELECT
      n.id                    AS "notificationId",
      n.reason,
      n.reply,
      n.status,
      n.created_at            AS "createdAt",
      n."assignmentId",
      n."senderId",
      n."receiverId",
      ad.id                   AS "assetId",
      ad.name                 AS "assetName",
      u."fullName"            AS "operatorName"

    FROM "Notifications" n
    LEFT JOIN "Asset_Details" ad ON ad.id = n."assetId"
    LEFT JOIN "Users" u ON u."employeeId" = n."senderId" 

    WHERE n."receiverId" = $1
      AND n.status IN ('unread', 'replied', 'received')
    ORDER BY n.created_at DESC
  `;

  const { rows } = await query(sql, [managerId]);
  return res.status(200).json(rows);
}

/* ===========================
   POST Send Overdue Notification
=========================== */
async function sendOverdueNotification(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { assetId, assignmentId, operatorId, userId, receiverId, reason } = req.body;

  const senderEmployeeId = userId || operatorId;
  if (!assetId || !senderEmployeeId || !receiverId || !reason) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  const sql = `
    INSERT INTO "Notifications"
      ("assetId", "assignmentId", "senderId", "receiverId", "reason", "status")
    VALUES ($1, $2, $3, $4, $5, 'unread')
    RETURNING *;
  `;

  const { rows } = await query(sql, [
    assetId,
    assignmentId || null,
    senderEmployeeId,
    receiverId,
    reason,
  ]);

  return res.status(201).json(rows[0]);
}

/* ===========================
   PUT Extend Asset & Resolve
=========================== */
async function extendAssetAndResolve(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { notificationId, assignmentId, newReturnDate } = req.body;

  if (!notificationId || !assignmentId || !newReturnDate) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  await query(
    `UPDATE "Asset_Assignments"
     SET expected_return_date = $1
     WHERE id = $2`,
    [newReturnDate, assignmentId]
  );

  await query(
    `UPDATE "Notifications"
     SET status = 'resolved'
     WHERE id = $1`,
    [notificationId]
  );

  return res.status(200).json({ message: "Resolved successfully" });
}
