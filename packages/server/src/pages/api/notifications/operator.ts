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

  const operatorId = Number(req.query.id);

  if (!operatorId) {
    return res.status(400).json({ message: "Operator ID missing or invalid" });
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

    const { rows } = await query(sql, [operatorId]);

    const notifications = rows.map((n) => ({
      id: n.notificationId,
      notificationId: n.notificationId,

      message: n.reply ?? n.reason,
      reason: n.reason,
      reply: n.reply,

      status: n.status,
      createdAt: n.createdAt,

      asset: n.assetId
        ? {
            id: n.assetId,
            name: n.assetName,
          }
        : null,

      sender: {
        employeeId: n.senderId,
        name: n.senderName,
      },

      receiver: {
        employeeId: n.receiverId,
        name: n.receiverName,
      },
    }));

    return res.status(200).json({ notifications });
  } catch (error) {
    console.error("❌ Operator Notifications Error:", error);
    return res.status(500).json({
      message: "Internal server error",
      error: error instanceof Error ? error.message : error,
    });
  }
}
 