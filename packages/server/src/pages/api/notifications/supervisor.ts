import type { NextApiRequest, NextApiResponse } from 'next';
import query from '@/lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {

  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const supervisorId = req.query.id;

  if (!supervisorId) {
    return res.status(400).json({ message: "Supervisor ID required" });
  }

  try {
    const sql = `
      SELECT 
        n.id AS "notificationId",
        COALESCE(ad.name, 'Unknown Asset') AS "assetName",
        COALESCE(op."fullName", 'Unknown Sender') AS "operatorName",
        n.reason,
        n.reply,
        n.status,
        aa.expected_return_date AS "expectedReturnDate",
        aa.assigned_date AS "assignedDate"
      FROM "Notifications" n
      LEFT JOIN "Asset_Details" ad ON ad.id = n."assetId"
      LEFT JOIN "Users" op ON op."employeeId" = n."senderId"
      LEFT JOIN "Asset_Assignments" aa ON aa."assetId" = n."assetId"
     WHERE n."receiverId" = $1
  AND n.status IN ('Unread', 'Replied')
      ORDER BY n."created_at" DESC;
    `;

    const result = await query(sql, [supervisorId]);

    // ⭐ FIXED RESPONSE ⭐
    return res.status(200).json({
      notifications: result.rows
    });

  } catch (error) {
    console.log("Supervisor Notification API Error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}
