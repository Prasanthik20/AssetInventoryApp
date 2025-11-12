import type { NextApiRequest, NextApiResponse } from 'next';
import query from '@/lib/db'; // ✅ use query instead of pool
import bcrypt from 'bcrypt';
import corsHandler from '@/lib/cors';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  return corsHandler(req, res, async () => {
    if (req.method !== 'POST') {
      res.setHeader('Allow', ['POST']);
      return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required.' });
      }

      // ✅ use query() instead of pool.query()
      const result = await query(
        `
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
        `,
        [email]
      );

      if (result.rows.length === 0) {
        return res.status(401).json({ message: 'Invalid credentials.' });
      }

      const user = result.rows[0];
      const isMatch = await bcrypt.compare(password, user.passwordHash);

      if (!isMatch) {
        return res.status(401).json({ message: 'Invalid credentials.' });
      }

      delete user.passwordHash;

      return res.status(200).json({
        message: 'Login successful!',
        user,
      });
    } catch (error) {
      console.error('Login API Error:', error);
      return res.status(500).json({ message: 'An internal server error occurred.' });
    }
  });
}