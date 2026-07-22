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

  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET', 'OPTIONS']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    // Next.js dynamic routes override query parameters of the same name.
    // If the frontend calls `/api/notifications/admin?id=14`, req.query.id is 'admin'.
    // We must extract the actual `id` parameter from req.url.
    const urlObj = new URL(req.url || '', `http://localhost`);
    const queryId = urlObj.searchParams.get('id');
    const pathSegment = req.query.id as string;

    const isRoleInPath = ['admin', 'supervisor', 'operator', 'tenant admin', 'tenantadmin'].includes(pathSegment?.toLowerCase());
    const role = (req.query.role as string) || (isRoleInPath ? pathSegment.toLowerCase() : null);
    const receiverEmployeeId = queryId || (!isRoleInPath ? pathSegment : null);

    if (!receiverEmployeeId) {
      return res.status(400).json({ message: "Valid numeric receiver ID is required." });
    }

    const employeeIdInt = parseInt(receiverEmployeeId, 10);
    if (isNaN(employeeIdInt)) {
      return res.status(400).json({ message: "Valid numeric receiver ID is required." });
    }

    let sqlQuery = "";
    let extraCondition = "";
    let queryParams: any[] = [];

    // OPERATOR MODE → only show notifications without reply (pending)
    if (role === "operator") {
      extraCondition = `AND n.reply IS NULL`;
    }

    // SUPERVISOR MODE → show all notifications
    // no extra condition
console.log(role)
    if (role === "admin" || role === "tenant admin" || role === "tenantadmin") {
      // Admin global feed: show all notifications
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
        ORDER BY n.created_at DESC;
      `;
      queryParams = [];
    } else {
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
      queryParams = [employeeIdInt];
    }

    const result = await query(sqlQuery, queryParams);
console.log(result)
    const formattedNotifications = result.rows.map(row => ({
      id: row.notificationId, // mapping id to make sure it matches frontend `item.id` usage
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
