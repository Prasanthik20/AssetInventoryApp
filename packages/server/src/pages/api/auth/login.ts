import type { NextApiRequest, NextApiResponse } from 'next';
import query from '@/lib/db';
import bcrypt from "bcryptjs";
import { setCorsHeaders } from '@/lib/corsHeaders';
import { signToken } from '@/lib/auth';

export default async function loginCoreHandler(
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
        u."tenantId" AS "tenantId",
        u."status",
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

    if (user.status === 'disabled') {
      res.status(403).json({ message: 'Your account has been disabled. Please contact your administrator.' });
      return;
    }

     // 🔐 SECURE PASSWORD CHECK
    const isMatch = await bcrypt.compare(password, user.passwordHash);

    if (!isMatch) {
      res.status(401).json({ message: 'Invalid credentials.' });
      return;
    }

    let subscriptionExpired = false;
    let subscriptionStatus = 'active';

    // 🕒 Check subscription status for non-Super Admins
    if (user.roleName !== 'Super Admin' && user.tenantId) {
      const tenantSql = 'SELECT status FROM "Tenants" WHERE id = $1 LIMIT 1';
      const tenantRes = await query(tenantSql, [user.tenantId]);
      const tenantStatus = tenantRes.rows[0]?.status;

      if (tenantStatus === 'suspended') {
        res.status(403).json({ 
          message: 'Your organization account has been suspended. Please contact the Super Admin.' 
        });
        return;
      }

      const subSql = `
        SELECT status, "endDate" 
        FROM "Subscriptions" 
        WHERE "tenantId" = $1 
        ORDER BY "createdAt" DESC 
        LIMIT 1
      `;
      const subResult = await query(subSql, [user.tenantId]);
      const sub = subResult.rows[0];

      if (sub) {
        subscriptionExpired = sub.status === 'expired' || (sub.endDate && new Date(sub.endDate) < new Date());
        subscriptionStatus = sub.status;
      }
    }

    // Sign JWT
    const token = signToken({
      userId: user.userId.toString(),
      email: user.email,
      tenantId: user.tenantId,
      role: user.roleName
    });

    delete user.passwordHash;

    res.status(200).json({
      message: 'Login successful!',
      token,
      user: {
        ...user,
        subscriptionExpired,
        subscriptionStatus
      },
    });
  } catch (error) {
    console.error('Login API Error:', error);
    res.status(500).json({ message: 'An internal server error occurred.' });
  }
}