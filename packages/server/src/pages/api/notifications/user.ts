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

  const userId = Number(req.query.id || req.query.userId || req.query.operatorId);

  if (!userId) {
    return res.status(400).json({ message: "User ID missing or invalid" });
  }

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
      LEFT JOIN "Users" s ON s."employeeId" = n."senderId"
      LEFT JOIN "Users" r ON r."employeeId" = n."receiverId"

      WHERE n."receiverId" = $1
        AND n.status IN ('unread', 'resolved', 'received')
      ORDER BY n.created_at DESC;
    `;

    const { rows } = await query(sql, [userId]);

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
