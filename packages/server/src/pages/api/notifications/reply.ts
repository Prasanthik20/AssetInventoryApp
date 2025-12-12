import type { NextApiRequest, NextApiResponse } from "next";
import query from "@/lib/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {

  if (req.method !== "POST") {
    return res.status(405).json({ message: `Method ${req.method} not allowed` });
  }

  try {
    const { originalNotificationId, replyMessage, operatorId, supervisorId } = req.body;

    if (!originalNotificationId || !replyMessage || !operatorId || !supervisorId) {
      return res.status(400).json({ message: "Missing required fields." });
    }

    // Fetch original notification (to copy assetId, assignmentId, reason, etc.)
    const original = await query(
      `SELECT * FROM "Notifications" WHERE id = $1`,
      [originalNotificationId]
    );

    if (original.rows.length === 0) {
      return res.status(404).json({ message: "Original notification not found" });
    }

    const data = original.rows[0];

    // Create NEW notification entry for supervisor
    const sql = `
      INSERT INTO "Notifications"
      ("senderId","receiverId","assetId","assignmentId","reason","reply","status")
      VALUES ($1,$2,$3,$4,$5,$6,'replied')
      RETURNING *;
    `;

    const result = await query(sql, [
      operatorId,          // operator is sender
      supervisorId,        // supervisor receives
      data.assetId,
      data.assignmentId,
      data.reason,         // original reason
      replyMessage
    ]);

    return res.status(200).json({
      message: "Reply sent successfully",
      notification: result.rows[0],
    });

  } catch (err) {
    console.error("Reply Error:", err);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}
