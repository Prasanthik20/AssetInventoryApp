import type { NextApiRequest, NextApiResponse } from "next";
import query from "@/lib/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ message: `Method ${req.method} not allowed` });
  }

  try {
    const { originalNotificationId, assetId, assignmentId, operatorId, supervisorId, replyMessage } = req.body;

    if (!assetId || !operatorId || !supervisorId || !replyMessage) {
      return res.status(400).json({ message: "Missing required fields." });
    }

    const sqlQuery = `
      INSERT INTO "Notifications" ("assetId", "assignmentId","senderId", "receiverId", "reason")
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *;
    `;

    const params = [
      Number(assetId),
      Number(assignmentId,),
      Number(operatorId),   // operator becomes sender
      Number(supervisorId), // supervisor becomes receiver
      replyMessage
    ];

    const result = await query(sqlQuery, params);

    return res.status(201).json({
      message: "Reply sent successfully",
      reply: result.rows[0],
    });

  } catch (err) {
    console.error("POST /notifications/reply error:", err);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}
