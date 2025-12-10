import type { NextApiRequest, NextApiResponse } from 'next';
import query from '@/lib/db'; // 👈 Import your raw query function

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // --- Manual CORS Headers ---
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle the preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  // --- End of CORS Handling ---

  // This endpoint should only handle POST requests
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    // Get the data from the request body
    const { assetId, senderId, receiverId, reason } = req.body;

    // Validate that all required fields are present
    if (!assetId || !senderId || !receiverId || !reason) {
      return res.status(400).json({ message: "Missing required fields: assetId, senderId, receiverId, and reason are required." });
    }

    // Define the SQL query to insert a new notification
    const sqlQuery = `
      INSERT INTO "Notifications" ("assetId", "senderId", "receiverId", "reason")
      VALUES ($1, $2, $3, $4)
      RETURNING *;
    `;

    // Define the parameters to be safely inserted into the query
    const params = [
      Number(assetId),
      Number(senderId),
      Number(receiverId),
      reason
    ];

    // Execute the query
    const result = await query(sqlQuery, params);
    
    const newNotification = result.rows[0];

    // Send a successful response
    return res.status(201).json({
      message: "Notification sent successfully",
      notification: newNotification,
    });

  } catch (err) {
    console.error("POST /notifications error:", err);
    return res.status(500).json({ message: "An internal server error occurred." });
  }
}