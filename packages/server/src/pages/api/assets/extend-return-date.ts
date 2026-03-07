import type { NextApiRequest, NextApiResponse } from 'next';
import query from '@/lib/db';
import { setCorsHeaders } from '@/lib/corsHeaders';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Set CORS headers
  const origin = req.headers.origin as string;
  setCorsHeaders(res, origin);

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  if (req.method !== "POST") return res.status(405).json({ message: "Method Not Allowed" });

  const { notificationId, daysToExtend } = req.body;
  if (!notificationId || !daysToExtend) {
    return res.status(400).json({ message: "notificationId and daysToExtend are required" });
  }

  try {
    // 1️⃣ Get assignment and asset info from the notification
    const notifRes: any = await query(
      `SELECT "assignmentId", "assetId", "senderId", "receiverId"
       FROM "Notifications"
       WHERE id = $1`,
      [notificationId]
    );

    if (!notifRes.rows.length) return res.status(404).json({ message: "Notification not found" });

    const { assignmentId, assetId, senderId: operatorId, receiverId: supervisorId } = notifRes.rows[0];

    // 2️⃣ Update expected return date in Asset_Assignments
    await query(
      `UPDATE "Asset_Assignments"
       SET expected_return_date = expected_return_date + ($1 * INTERVAL '1 day')
       WHERE id = $2`,
      [daysToExtend, assignmentId]
    );

    // 3️⃣ Update status in Asset_Details (set to 'Assigned')
    // First, get the Status ID for 'Assigned'
    const statusRes: any = await query(
      `SELECT id FROM "Status" WHERE status = 'Assigned' LIMIT 1`
    );

    if (!statusRes.rows.length) return res.status(500).json({ message: "'Assigned' status not found in Status table" });

    const assignedStatusId = statusRes.rows[0].id;

    await query(
      `UPDATE "Asset_Details"
       SET status_id = $1
       WHERE id = $2`,
      [assignedStatusId, assetId]
    );

    // 4️⃣ Create notification for operator
    const extensionMessage = `Asset return date extended by ${daysToExtend} day(s) by supervisor.`;
    await query(
  `INSERT INTO "Notifications" 
    ("assignmentId", "assetId", "senderId", "receiverId", "reason", "reply", "status", "created_at")
    VALUES ($1, $2, $3, $4, $5, $6, 'unread', NOW())`,
  [assignmentId, assetId, supervisorId, operatorId, 'Extension Approved', extensionMessage]
);

    // 5️⃣ Optional: mark original notification as resolved
    await query(
  `UPDATE "Notifications" SET status = 'resolved' WHERE id = $1`,
  [notificationId]
);

    return res.status(200).json({
      message: `Return date extended by ${daysToExtend} day(s)`,
      extensionMessage
    });

  } catch (error: any) {
    console.error("Extend API Error:", error);
    return res.status(500).json({ message: error.message });
  }
}