import type { NextApiRequest, NextApiResponse } from 'next';
import query from '@/lib/db';

export default async function registerCoreHandler(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> {

  // ✅ CORS HEADERS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  // ✅ Handle Preflight Request
  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  // ❌ Allow only POST
  if (req.method !== 'POST') {
    res.setHeader("Allow", ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
    return;
  }

  try {
    const { employeeId, fullName, email, password, roleId } = req.body;

    if (!employeeId || !fullName || !email || !password || !roleId) {
      res.status(400).json({
        message: 'All required fields must be provided.'
      });
      return;
    }

    // ✅ Check if user already exists
    const checkUser = await query(
      `SELECT * FROM "Users"
       WHERE LOWER("email") = LOWER($1)
       OR "employeeId" = $2`,
      [email, employeeId]
    );

    if (checkUser.rows.length > 0) {
      res.status(409).json({
        message: 'A user with this email or employee ID already exists.'
      });
      return;
    }

    // ✅ Insert new user (plain password as requested)
    await query(
      `INSERT INTO "Users"
       ("employeeId", "fullName", "email", "passwordHash", "roleId")
       VALUES ($1, $2, $3, $4, $5)`,
      [employeeId, fullName, email.toLowerCase(), password, roleId]
    );

    res.status(201).json({
      message: 'User created successfully.'
    });

  } catch (error) {
    console.error('Registration API Error:', error);
    res.status(500).json({
      message: 'An internal server error occurred.'
    });
  }
}
