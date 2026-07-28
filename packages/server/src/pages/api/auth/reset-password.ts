import type { NextApiRequest, NextApiResponse } from "next";
import query from "@/lib/db";
import bcrypt from "bcryptjs";
import { setCorsHeaders } from '@/lib/corsHeaders';

export default async function resetPasswordHandler(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> {
  // Set CORS headers
  const origin = req.headers.origin as string;
  setCorsHeaders(res, origin);

  // Handle preflight OPTIONS requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST", "OPTIONS"]);
    res.status(405).end(`Method ${req.method} Not Allowed`);
    return;
  }

  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      res.status(400).json({ message: "Token and new password are required." });
      return;
    }

    // 🔎 Validate token
    const result = await query(
      `
      SELECT "userId"
      FROM "Users"
      WHERE "resetToken" = $1
        AND "resetTokenExpiry" > NOW()
      `,
      [token]
    );

    if (result.rows.length === 0) {
      res.status(400).json({ message: "Invalid or expired token." });
      return;
    }

    // 🔐 Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // 💾 Update password & clear token
    await query(
      `
      UPDATE "Users"
      SET "passwordHash" = $1,
          "resetToken" = NULL,
          "resetTokenExpiry" = NULL
      WHERE "resetToken" = $2
      `,
      [hashedPassword, token]
    );

    res.status(200).json({
      message: "Password reset successful."
    });

  } catch (error) {
    console.error("Reset Password Error:", error);
    res.status(500).json({ message: "Internal server error." });
  }
}