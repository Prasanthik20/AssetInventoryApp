import type { NextApiRequest, NextApiResponse } from 'next';
import query from '@/lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {

  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  const { notificationId, daysToExtend } = req.body;

  if (!daysToExtend) {
    return res.status(400).json({ message: "daysToExtend is required" });
  }

  try {
    // 1) Update expected return date
    await query(
      `
      UPDATE "Asset_Assignments"
      SET expected_return_date = expected_return_date + ($2 || ' days')::interval
      WHERE id = (
        SELECT "assignmentId" FROM "Notifications" WHERE id = $1
      );
      `,
      [notificationId, daysToExtend]
    );

    // 2) Clear operator reply
    await query(
      `
      UPDATE "Notifications"
      SET reply = NULL
      WHERE id = $1
      `,
      [notificationId]
    );

    return res.status(200).json({ message: "Return date extended successfully" });

  } catch (error: any) {
    console.log("Extend API Error:", error);
    return res.status(500).json({ message: error.message });
  }
}
