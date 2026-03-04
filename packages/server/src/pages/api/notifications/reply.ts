import type { NextApiRequest, NextApiResponse } from "next";
import query from "@/lib/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {

  if (req.method !== "POST") {
    return res.status(405).json({ message: `Method ${req.method} not allowed` });
  }

  try {
    const { originalNotificationId, replyMessage, senderId , receiverId } = req.body;

    if (!originalNotificationId || !replyMessage || !senderId || !receiverId) {
      return res.status(400).json({ message: "Missing required fields." });
    }

    // Fetch original notification
    const original = await query(
      `SELECT * FROM "Notifications" WHERE id = $1`,
      [originalNotificationId]
    );

    if (original.rows.length === 0) {
      return res.status(404).json({ message: "Original notification not found" });
    }

    const { assetId, assignmentId, reason } = original.rows[0];

    // Insert reply notification
    const insertQuery = await query(
    `INSERT INTO "Notifications" 
    ("senderId", "receiverId", "assetId", "assignmentId", "reason", "reply", "status") 
    VALUES ($1, $2, $3, $4, $5, $6, 'replied') RETURNING *`,
    [senderId, receiverId, assetId, assignmentId, reason, replyMessage]
  );

    // Mark original notification as replied
    await query(
      `UPDATE "Notifications" SET status = 'replied' WHERE id = $1`,
      [originalNotificationId]
    );

    return res.status(200).json({
      message: "Reply sent successfully",
      notification: insertQuery.rows[0],
    });
  } catch (err: any) {
    console.error("Reply Error:", err);
    return res.status(500).json({
      message: "Internal Server Error",
      error: err.message,
    });
  }
}
