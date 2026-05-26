import type { NextApiRequest, NextApiResponse } from "next";
import query from "@/lib/db";
import bcrypt from "bcrypt";
import { setCorsHeaders } from '@/lib/corsHeaders';

export default async function forgotPasswordHandler(
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
    res.status(405).json({ message: "Method Not Allowed" });
    return;
  }

  try {
    const { email, newPassword, confirmPassword } = req.body;

    if (!email || !newPassword || !confirmPassword) {
      res.status(400).json({ message: "All fields are required." });
      return;
    }

    if (newPassword !== confirmPassword) {
      res.status(400).json({ message: "Passwords do not match." });
      return;
    }

    // Check user exists
    const userResult = await query(
      `SELECT "userId" FROM "Users" WHERE LOWER("email") = LOWER($1)`,
      [email]
    );

    if (userResult.rows.length === 0) {
      res.status(404).json({ message: "User not found." });
      return;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
   await query(
  `UPDATE "Users"
   SET "passwordHash" = $1
   WHERE LOWER("email") = LOWER($2)`,
  [hashedPassword, email]
);

    res.status(200).json({
      message: "Password updated successfully.",
    });

  } catch (error) {
    console.error("Forgot Password Error:", error);
    res.status(500).json({ message: "Internal server error." });
  }
}