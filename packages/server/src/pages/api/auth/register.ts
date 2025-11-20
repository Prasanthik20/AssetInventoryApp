import type { NextApiRequest, NextApiResponse } from 'next';
import query from '@/lib/db';
import corsHandler from '@/lib/cors';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  return corsHandler(req, res, async () => {
    if (req.method !== 'POST') {
      return res.status(405).end('Method Not Allowed');
    }

    const { employeeId, fullName, email, password, roleId } = req.body;

    if (!employeeId || !fullName || !email || !password || !roleId) {
      return res.status(400).json({ message: 'All required fields must be provided.' });
    }

    try {
      // ✅ Check if user already exists
      const checkUser = await query(
        'SELECT * FROM "Users" WHERE LOWER("email") = LOWER($1) OR "employeeId" = $2',
        [email, employeeId]
      );

      if (checkUser.rows.length > 0) {
        return res.status(409).json({ message: 'A user with this email or employee ID already exists.' });
      }

      // ✅ Insert user with plain password
      await query(
        `INSERT INTO "Users" ("employeeId", "fullName", "email", "passwordHash", "roleId")
         VALUES ($1, $2, $3, $4, $5)`,
        [employeeId, fullName, email.toLowerCase(), password, roleId]
      );

      return res.status(201).json({ message: 'User created successfully (plain password).' });
    } catch (error) {
      console.error('Registration API Error:', error);
      return res.status(500).json({ message: 'An internal server error occurred.' });
    }
  });
}