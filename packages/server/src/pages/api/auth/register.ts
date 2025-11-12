import type { NextApiRequest, NextApiResponse } from 'next';
import bcrypt from 'bcrypt';
import query from '@/lib/db'; // ← your db.ts that uses pg Pool
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
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      // Check if user already exists
      const checkUser = await query(
        'SELECT * FROM "Users" WHERE "Email" = $1 OR "EmployeeID" = $2',
        [email.toLowerCase(), employeeId]
      );

      if (checkUser.rows.length > 0) {
        return res.status(409).json({ message: 'A user with this email or employee ID already exists.' });
      }

      // Insert user
      await query(
        `INSERT INTO "Users" ("EmployeeID", "FullName", "Email", "PasswordHash", "RoleID")
         VALUES ($1, $2, $3, $4, $5)`,
        [employeeId, fullName, email.toLowerCase(), hashedPassword, roleId]
      );

      return res.status(201).json({ message: 'User created successfully.' });
    } catch (error: any) {
      console.error('Registration API Error:', error);
      return res.status(500).json({ message: 'An internal server error occurred.' });
    }
  });
}