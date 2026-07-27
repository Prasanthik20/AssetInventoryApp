import type { NextApiResponse } from "next";
import query from "@/lib/db";
import { setCorsHeaders } from "@/lib/corsHeaders";
import { withAuth, AuthenticatedRequest } from "@/lib/apiHandler";

async function handler(
  req: AuthenticatedRequest,
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

  const { tenantId } = req.user;

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
      WHERE n."tenantId" = $1
      ORDER BY n.created_at DESC;
    `;

    const result = await query(sql, [tenantId]);
    const rows = result.rows;

    const notifications = rows.map((n) => ({
      id: n.notificationId ? n.notificationId.toString() : null,
      assignmentId: n.assignmentId ? n.assignmentId.toString() : null,
      message: n.reply ?? n.reason,
      reason: n.reason,
      reply: n.reply,
      status: n.status,
      createdAt: n.createdAt,
      asset: n.assetId ? { id: n.assetId.toString(), name: n.assetName } : null,
      sender:
        n.senderId || n.senderName
          ? { employeeId: n.senderId.toString(), name: n.senderName }
          : null,
      receiver:
        n.receiverId || n.receiverName
          ? { employeeId: n.receiverId.toString(), name: n.receiverName }
          : null,
    }));

    return res.status(200).json({ notifications });
  } catch (error) {
    console.error("❌ Admin Notifications Error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

export default withAuth(handler);