import type { NextApiRequest, NextApiResponse } from "next";
import query from "@/lib/db";
import { setCorsHeaders } from "@/lib/corsHeaders";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
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

  const userIdRaw = req.query.id || req.query.userId || req.query.operatorId;

  if (!userIdRaw) {
    return res.status(400).json({ message: "User ID missing or invalid" });
  }

  const userIdStr = String(userIdRaw).trim();

  try {
    const sql = `
      SELECT
        n.id                    AS "notificationId",
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
      LEFT JOIN "Users" s ON CAST(s."employeeId" AS text) = CAST(n."senderId" AS text) AND (s."tenantId" = n."tenantId" OR n."tenantId" IS NULL)
      LEFT JOIN "Users" r ON CAST(r."employeeId" AS text) = CAST(n."receiverId" AS text) AND (r."tenantId" = n."tenantId" OR n."tenantId" IS NULL)

      WHERE (
        CAST(n."receiverId" AS text) = $1
      )
      AND (
        n."tenantId" = (SELECT "tenantId" FROM "Users" WHERE CAST("employeeId" AS text) = $1 LIMIT 1)
        OR n."tenantId" IS NULL
        OR (SELECT "tenantId" FROM "Users" WHERE CAST("employeeId" AS text) = $1 LIMIT 1) IS NULL
      )
        AND n.status IN ('unread', 'resolved', 'received', 'replied')
      ORDER BY n.created_at DESC;
    `;

    const { rows } = await query(sql, [userIdStr]);

    const notifications = rows.map((n) => ({
      id: n.notificationId,
      notificationId: n.notificationId,
      assetId: n.assetId,
      assetName: n.assetName || "Asset",
      senderId: n.senderId,
      senderName: n.senderName || "Manager",
      receiverId: n.receiverId,
      receiverName: n.receiverName || "User",
      reason: n.reason,
      reply: n.reply,
      status: n.status,
      createdAt: n.createdAt,
    }));

    return res.status(200).json({
      success: true,
      notifications,
    });
  } catch (error: any) {
    console.error("Fetch User Notifications Error:", error);
    return res.status(500).json({
      message: "Internal server error fetching user notifications.",
      error: error.message,
    });
  }
}
