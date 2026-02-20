import type { NextApiRequest, NextApiResponse } from 'next';
import query from '@/lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // ==========================
    // ✅ GET → Fetch Notifications
    // ==========================
    if (req.method === 'GET') {

      const { id: receiverEmployeeId, role: rawRole } = req.query;
      const role = typeof rawRole === 'string' ? rawRole.toLowerCase() : '';

      let sqlQuery = '';
      let params: any[] = [];

      // 🔹 ADMIN → Get all
      if (!receiverEmployeeId && !role) {
        sqlQuery = `
          SELECT
            n.id::text AS "notifId",
            n.reason,
            n.reply,
            n.status,
            n."created_at" AS "createdAt",
            a.name AS "assetName",
            s."fullName" AS "senderName",
            r."roleName" AS "senderRole"
          FROM "Notifications" n
          LEFT JOIN "Asset_Details" a ON n."assetId" = a.id
          LEFT JOIN "Users" s ON n."senderId" = s."employeeId"
          LEFT JOIN "Roles" r ON s."roleId" = r."roleId"
          ORDER BY n."created_at" DESC;
        `;
      }

      // 🔹 OPERATOR / SUPERVISOR
      else {
        if (!receiverEmployeeId || receiverEmployeeId === '0') {
          return res.status(200).json([]);
        }

        const extraCondition =
          role === "operator" ? `AND n.reply IS NULL` : "";

        sqlQuery = `
          SELECT
            n.id::text AS "notifId",
            n.reason,
            n.reply,
            n.status,
            n."created_at" AS "createdAt",
            a.name AS "assetName",
            s."fullName" AS "senderName",
            r."roleName" AS "senderRole"
          FROM "Notifications" n
          LEFT JOIN "Asset_Details" a ON n."assetId" = a.id
          LEFT JOIN "Users" s ON n."senderId" = s."employeeId"
          LEFT JOIN "Roles" r ON s."roleId" = r."roleId"
          WHERE n."receiverId" = $1
          ${extraCondition}
          ORDER BY n."created_at" DESC;
        `;

        params = [parseInt(receiverEmployeeId as string)];
      }

      const result = await query(sqlQuery, params);

      return res.status(200).json(result.rows);
    }

    // ==========================
    // ✅ POST → Create Notification
    // ==========================
    if (req.method === 'POST') {

      const { assetId, senderId, receiverId, reason } = req.body;

      if (!assetId || !senderId || !receiverId || !reason) {
        return res.status(400).json({
          message: "Missing required fields"
        });
      }

      const sqlQuery = `
        INSERT INTO "Notifications"
        ("assetId", "senderId", "receiverId", "reason")
        VALUES ($1, $2, $3, $4)
        RETURNING *;
      `;

      const params = [
        Number(assetId),
        Number(senderId),
        Number(receiverId),
        reason
      ];

      const result = await query(sqlQuery, params);

      return res.status(201).json({
        message: "Notification sent successfully",
        notification: result.rows[0],
      });
    }

    return res.status(405).json({ message: "Method not allowed" });

  } catch (err: any) {
    console.error("Notifications API Error:", err);
    return res.status(500).json({
      message: "Internal server error",
      error: err.message
    });
  }
}
