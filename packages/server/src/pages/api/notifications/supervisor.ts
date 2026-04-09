import type { NextApiRequest, NextApiResponse } from "next";
import query from "@/lib/db";
import { setCorsHeaders } from "@/lib/corsHeaders";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Set CORS headers
  const origin = req.headers.origin as string;
  setCorsHeaders(res, origin);

  try {
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method === "GET") return getSupervisorNotifications(req, res);
    if (req.method === "POST") return sendOverdueNotification(req, res);
    if (req.method === "PUT") return extendAssetAndResolve(req, res);
    

    return res.status(405).json({ message: "Method not allowed" });
  } catch (error: any) {
    console.error("Supervisor API Error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

/* ===========================
   GET Supervisor Notifications
=========================== */
async function getSupervisorNotifications(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const supervisorId = Number(req.query.id); // 🔥 MATCH FRONTEND

  if (!supervisorId) {
    return res.status(400).json({ message: "Supervisor ID required" });
  }

 const sql = `
  SELECT
    n.id                    AS "notificationId",
    n.reason,
    n.reply,
    n.status,
    n.created_at            AS "createdAt",
    n."assignmentId",       -- 🔥 Need this for the PUT extend function later
    n."senderId",
    n."receiverId",
    ad.id                   AS "assetId",
    ad.name                 AS "assetName",

    u."fullName"            AS "operatorName" -- The person who sent the reply

  FROM "Notifications" n
  LEFT JOIN "Asset_Details" ad ON ad.id = n."assetId"
  -- Join Users to 'senderId' because in a reply, the Operator is the sender
  LEFT JOIN "Users" u ON u."employeeId" = n."senderId" 

  WHERE n."receiverId" = $1   -- Supervisor is the Receiver of the reply
    AND n.status IN ('unread', 'replied', 'received')  -- Only show active replies
  ORDER BY n.created_at DESC
`;

  const { rows } = await query(sql, [supervisorId]);
  console.log(`Backend found ${rows.length} replies for ID ${supervisorId}`);
  return res.status(200).json(rows);
}

/* ===========================
   POST Send Overdue Notification
=========================== */
async function sendOverdueNotification(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { assetId, assignmentId, operatorId, receiverId, reason } = req.body;

 if (!assetId || !operatorId || !receiverId || !reason) {
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
  operatorId,
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
