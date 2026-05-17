import type { NextApiRequest, NextApiResponse } from 'next';
import query from '@/lib/db';
import bcrypt from "bcryptjs";
import { setCorsHeaders } from '@/lib/corsHeaders';

export default async function loginCoreHandler(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> {

  // ❌ Block non-POST requests
  if (req.method !== 'POST') {
    res.setHeader("Allow", ['POST', 'OPTIONS']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
    return;
  }

  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ message: 'Email and password are required.' });
      return;
    }

    const sql = `
      SELECT 
        u."userId",
        u."employeeId",
        u."fullName",
        u."email",
        u."passwordHash",
        u."photoURL",
        r."roleName"
      FROM 
        "Users" u
      INNER JOIN 
        "Roles" r ON u."roleId" = r."roleId"
      WHERE 
        LOWER(u."email") = LOWER($1);
    `;

    const result = await query(sql, [email]);

    if (result.rows.length === 0) {
      res.status(401).json({ message: 'Invalid credentials.' });
      return;
    }

    const user = result.rows[0];

     // 🔐 SECURE PASSWORD CHECK
    const isMatch = await bcrypt.compare(password, user.passwordHash);

    if (!isMatch) {
      res.status(401).json({ message: 'Invalid credentials.' });
      return;
    }

    delete user.passwordHash;

    res.status(200).json({
      message: 'Login successful!',
      user,
    });
  } catch (error) {
    console.error('Login API Error:', error);
    res.status(500).json({ message: 'An internal server error occurred.' });
  }
}