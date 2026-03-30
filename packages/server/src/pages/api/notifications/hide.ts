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

  if (req.method !== "PUT") {
    res.setHeader("Allow", ["PUT", "OPTIONS"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const id = Number(req.body?.id);
    if (!id) return res.status(400).json({ error: "Invalid notification id" });

    try {
      await query(
        `UPDATE "Notifications"
         SET "status" = 'seen'
         WHERE id = $1`,
        [id]
      );
    } catch (error: any) {
      const relationMissing =
        typeof error?.message === 'string' &&
        error.message.includes('relation "Notifications" does not exist');

      if (!relationMissing) {
        throw error;
      }

      await query(
        `UPDATE notifications
         SET status = 'seen'
         WHERE id = $1`,
        [id]
      );
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("❌ hide notification error:", error);
    return res.status(500).json({ error: "Failed to update" });
  }
}