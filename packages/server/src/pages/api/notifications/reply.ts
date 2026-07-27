import type { NextApiRequest, NextApiResponse } from "next";
import query from "@/lib/db";
import { setCorsHeaders } from "@/lib/corsHeaders";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Set CORS headers
  const origin = req.headers.origin as string;
  setCorsHeaders(res, origin);

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== "POST") {
    return res.status(405).json({ message: `Method ${req.method} not allowed` });
  }

  try {
    const { originalNotificationId, replyMessage, senderId , receiverId, proofPhotos } = req.body;

    if (!originalNotificationId || !replyMessage || !senderId || !receiverId) {
      return res.status(400).json({ message: "Missing required fields." });
    }

    const normalizedProofPhotos = Array.isArray(proofPhotos)
      ? proofPhotos
          .filter((item: unknown): item is string => typeof item === 'string' && item.trim().length > 0)
          .map((item) => item.trim())
      : [];

    if (normalizedProofPhotos.length > 0 && normalizedProofPhotos.length < 4) {
      return res.status(400).json({ message: "At least 4 proof images are required for assignment receipt confirmation." });
    }

    // Fetch original notification
    const original = await query(
      `SELECT * FROM "Notifications" WHERE id = $1`,
      [originalNotificationId]
    );

    if (original.rows.length === 0) {
      return res.status(404).json({ message: "Original notification not found" });
    }

    const { assetId, assignmentId, reason, tenantId } = original.rows[0];

    let storedReplyMessage = replyMessage;

    const returnedDateQuery = await query(
      `SELECT "returned_date" FROM "Asset_Assignments" WHERE id = $1 LIMIT 1`,
      [Number(assignmentId)]
    );
    const returnedDate = returnedDateQuery.rows[0]?.returned_date || new Date().toISOString();

    if (normalizedProofPhotos.length > 0 && assignmentId) {
      const proofPayload = {
        kind: 'asset_receipt_confirmation',
        message: replyMessage,
        proofCount: normalizedProofPhotos.length,
        proofPhotos: normalizedProofPhotos,
        tenantId: tenantId,
        returnedDate: returnedDate
      };

      storedReplyMessage = JSON.stringify(proofPayload);

      await query(
        `UPDATE "Asset_Assignments"
         SET
           notes = CONCAT(
             COALESCE(notes, ''),
             CASE WHEN COALESCE(notes, '') = '' THEN '' ELSE E'\n' END,
             '[RECEIPT_PROOF] ',
             $2::text
           ),
           "photoURL" = COALESCE($3::text, "photoURL"),
           "barcodeURL" = COALESCE($4::text, "barcodeURL")
         WHERE id = $1`,
        [
          Number(assignmentId),
          storedReplyMessage,
          normalizedProofPhotos[0] ?? null,
          normalizedProofPhotos[1] ?? null,
        ],
      );
    } else {
      const payload = {
        kind: 'reply_notification',
        message: replyMessage,
        tenantId: tenantId,
        returnedDate: returnedDate
      };
      storedReplyMessage = JSON.stringify(payload);
    }

    // Insert reply notification
    const insertQuery = await query(
    `INSERT INTO "Notifications" 
    ("senderId", "receiverId", "assetId", "assignmentId", "reason", "reply", "status", "tenantId") 
    VALUES ($1, $2, $3, $4, $5, $6, 'received', $7) RETURNING *`,
    [Number(senderId), Number(receiverId), assetId, assignmentId, reason, storedReplyMessage, tenantId]
  );

    // Mark both sides as received so sender and receiver see the same state
    await query(
      `UPDATE "Notifications" SET status = 'received' WHERE id IN ($1, $2)`,
      [originalNotificationId, insertQuery.rows[0].id]
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
