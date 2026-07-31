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

  const reqTenantId = req.query.tenantId ? String(req.query.tenantId).trim() : null;

  try {
    // 1. Fetch user's tenantId & employeeId strictly by employeeId
    const userRes = await query(
      `SELECT TOP 1 "tenantId", "employeeId"
       FROM "Users"
       WHERE "employeeId" = $1 OR CAST("employeeId" AS VARCHAR(50)) = $1`,
      [userIdStr]
    );

    const employeeId = userRes.rows[0]?.employeeId ? Number(userRes.rows[0].employeeId) : Number(userIdStr);
    const tenantId = reqTenantId || userRes.rows[0]?.tenantId || null;

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
      LEFT JOIN "Users" s ON (s."employeeId" = n."senderId" OR CAST(s."employeeId" AS VARCHAR(50)) = CAST(n."senderId" AS VARCHAR(50)))
      LEFT JOIN "Users" r ON (r."employeeId" = n."receiverId" OR CAST(r."employeeId" AS VARCHAR(50)) = CAST(n."receiverId" AS VARCHAR(50)))

      WHERE (
        n."receiverId" = $1 OR CAST(n."receiverId" AS VARCHAR(50)) = CAST($1 AS VARCHAR(50))
      )
        AND (n."tenantId" = $2 OR $2 IS NULL OR n."tenantId" IS NULL)
        AND n.status IN ('unread', 'resolved', 'received', 'replied', 'pending')
      ORDER BY n.created_at DESC;
    `;

    const { rows } = await query(sql, [employeeId, tenantId]);

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
