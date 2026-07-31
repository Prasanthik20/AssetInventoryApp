import type { NextApiRequest, NextApiResponse } from 'next';
import query from '@/lib/db';
import { setCorsHeaders } from '@/lib/corsHeaders';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const origin = req.headers.origin as string;
  setCorsHeaders(res, origin);

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  if (req.method !== "POST") return res.status(405).json({ message: "Method Not Allowed" });

  const { notificationId, daysToExtend: rawDays } = req.body;
  const daysToExtend = Math.max(1, parseInt(String(rawDays || 5)) || 5);

  if (!notificationId) {
    return res.status(400).json({ message: "notificationId is required" });
  }

  try {
    // 1️⃣ Get assignment and asset info from the notification
    const notifRes: any = await query(
      `SELECT "assignmentId", "assetId", "senderId", "receiverId", "tenantId"
       FROM "Notifications"
       WHERE id = $1`,
      [notificationId]
    );

    if (!notifRes.rows.length) return res.status(404).json({ message: "Notification not found" });

    const { assignmentId, assetId, senderId: operatorId, receiverId: supervisorId, tenantId } = notifRes.rows[0];

    // 2️⃣ Update expected return date in Asset_Assignments
    await query(
      `UPDATE "Asset_Assignments"
       SET expected_return_date = DATEADD(day, $1, CASE WHEN expected_return_date > CAST(GETDATE() AS DATE) THEN CAST(expected_return_date AS DATE) ELSE CAST(GETDATE() AS DATE) END)
       WHERE id = $2 OR (id = (SELECT TOP 1 id FROM "Asset_Assignments" WHERE "assetId" = $3 AND COALESCE(status, '') <> 'returned' ORDER BY id DESC))`,
      [daysToExtend, assignmentId, assetId]
    );

    // 3️⃣ Update status in Asset_Details (set to 'Assigned')
    const statusRes: any = await query(
      `SELECT TOP 1 id FROM "Status" WHERE LOWER(status) = 'assigned'`
    );

    if (statusRes.rows.length) {
      const assignedStatusId = statusRes.rows[0].id;
      await query(
        `UPDATE "Asset_Details"
         SET status_id = $1
         WHERE id = $2`,
        [assignedStatusId, assetId]
      );
    }

    // 4️⃣ Create notification for operator/employee confirming the extension
    const extensionMessage = `Asset return date extended by ${daysToExtend} day(s) by manager/supervisor.`;

    await query(
      `INSERT INTO "Notifications" 
        ("assignmentId", "assetId", "senderId", "receiverId", "reason", "reply", "status", "created_at", "tenantId")
        VALUES ($1, $2, $3, $4, $5, $6, 'unread', GETDATE(), $7)`,
      [assignmentId, assetId, supervisorId, operatorId, 'Extension Approved', extensionMessage, tenantId]
    );

    // 5️⃣ Mark original notification (and any duplicates for this assignment) as resolved
    await query(
      `UPDATE "Notifications" SET status = 'resolved' WHERE "assignmentId" = $1 AND reason LIKE '%Extension%' AND status != 'resolved'`,
      [assignmentId]
    );

    return res.status(200).json({
      message: `Return date extended by ${daysToExtend} day(s)`,
      extensionMessage
    });

  } catch (error: any) {
    console.error("Extend API Error:", error);
    return res.status(500).json({ message: error.message || "Failed to extend return date." });
  }
}