import type { NextApiRequest, NextApiResponse } from 'next';
import query from '@/lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const { id: receiverEmployeeId, role } = req.query;

    if (!receiverEmployeeId || typeof receiverEmployeeId !== "string") {
      return res.status(400).json({ message: "Valid numeric receiver ID is required." });
    }
    let sqlQuery = "";
    let extraCondition = "";

    // OPERATOR MODE → only show notifications without reply (pending)
    if (role === "operator") {
      extraCondition = `AND n.reply IS NULL`;
    }

    // SUPERVISOR MODE → show all notifications
    // no extra condition
    if(role == "admin") {
      sqlQuery = `
        SELECT * FROM "Notifications" ORDER BY created_at DESC`;
    }

     sqlQuery = `
      SELECT
        n.id AS "notificationId",
        n."assignmentId",
        n.reason,
        n.reply,
        n.status AS "notificationStatus",
        n.created_at AS "createdAt",

        a.id AS "assetId",
        a.name AS "assetName",

        s."employeeId" AS "senderEmployeeId",
        s."fullName" AS "senderName"
      FROM "Notifications" n
      LEFT JOIN "Asset_Details" a ON n."assetId" = a.id
      LEFT JOIN "Users" s ON n."senderId" = s."employeeId"
      WHERE n."receiverId" = $1
      ${extraCondition}
      ORDER BY n.created_at DESC;
    `;

    const result = await query(sqlQuery, [parseInt(receiverEmployeeId)]);

    const formattedNotifications = result.rows.map(row => ({
      notificationId: row.notificationId,
      assignmentId: row.assignmentId,
      reason: row.reason,
      reply: row.reply,
      status: row.notificationStatus,
      createdAt: row.createdAt,
      asset: {
        id: row.assetId,
        name: row.assetName
      },
      sender: {
        employeeId: row.senderEmployeeId,
        name: row.senderName
      }
    }));

    return res.status(200).json({
      count: formattedNotifications.length,
      notifications: formattedNotifications
    });

  } catch (err) {
    console.error("GET /notifications/[id] error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
}
