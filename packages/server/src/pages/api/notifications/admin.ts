import type { NextApiRequest, NextApiResponse } from "next";
import query from "@/lib/db";
import { setCorsHeaders } from "@/lib/corsHeaders";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Set CORS headers
  const origin = req.headers.origin as string;
  setCorsHeaders(res, origin);

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET", "OPTIONS"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const sql = `
      SELECT
        n.id                    AS "notificationId",
        n."assignmentId"       AS "assignmentId",
        n.reason,
        n.reply,
        n.status,
        n.created_at            AS "createdAt",

        ad.id                   AS "assetId",
        ad.name                 AS "assetName",

        s."employeeId"          AS "senderId",
        s."fullName"            AS "senderName",

        r."employeeId"          AS "receiverId",
        r."fullName"            AS "receiverName"

      FROM "Notifications" n
      LEFT JOIN "Asset_Details" ad ON ad.id = n."assetId"
      LEFT JOIN "Users" s ON s."employeeId" = n."senderId"
      LEFT JOIN "Users" r ON r."employeeId" = n."receiverId"
      ORDER BY n.created_at DESC;
    `;

    let rows: any[] = [];

    try {
      const result = await query(sql);
      rows = result.rows;
    } catch (error: any) {
      const relationMissing =
        typeof error?.message === 'string' &&
        error.message.includes('relation "Notifications" does not exist');

      if (!relationMissing) {
        throw error;
      }

      // Fallback for deployments where notifications table is lowercase.
      const fallbackSql = `
        SELECT
          n.id                  AS "notificationId",
          n.reason,
          n.reply,
          n.status,
          n.created_at          AS "createdAt"
        FROM notifications n
        ORDER BY n.created_at DESC;
      `;

      const fallbackResult = await query(fallbackSql);
      rows = fallbackResult.rows;
    }

    const notifications = rows.map((n) => ({
      id: n.notificationId,
      assignmentId: n.assignmentId,
      message: n.reply ?? n.reason,
      reason: n.reason,
      reply: n.reply,
      status: n.status,
      createdAt: n.createdAt,
      asset: n.assetId ? { id: n.assetId, name: n.assetName } : null,
      sender:
        n.senderId || n.senderName
          ? { employeeId: n.senderId, name: n.senderName }
          : null,
      receiver:
        n.receiverId || n.receiverName
          ? { employeeId: n.receiverId, name: n.receiverName }
          : null,
    }));

    return res.status(200).json({ notifications });
  } catch (error) {
    console.error("❌ Admin Notifications Error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}