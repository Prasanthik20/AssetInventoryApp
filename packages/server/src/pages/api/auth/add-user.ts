import type { NextApiResponse } from 'next';
import query from '@/lib/db';
import bcrypt from "bcryptjs";
import { withAuth, AuthenticatedRequest } from '@/lib/apiHandler';
import { withSubscriptionLimit, getSubscriptionInfo } from '@/lib/subscription';

async function addUserHandler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST', 'OPTIONS']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const { 
    employeeId, fullName, email, password, 
    phoneNumber, address, photoURL, roleName,
    reportingTo
  } = req.body;
  const { tenantId } = req.user;

  if (!employeeId || !fullName || !email || !password || !roleName) {
    return res.status(400).json({ message: 'Missing required fields.' });
  }

  if (!tenantId) {
    return res.status(400).json({ message: 'Tenant ID is missing.' });
  }

  try {
    // Check subscription plan limits for administrators
    const subInfo = await getSubscriptionInfo(tenantId);
    const planId = subInfo?.planId || 'free-trial';

    if (roleName.toLowerCase().includes('admin')) {
      const adminCountRes = await query(
        `SELECT COUNT(u."userId") AS count 
         FROM "Users" u
         INNER JOIN "Roles" r ON u."roleId" = r."roleId"
         WHERE u."tenantId" = $1 AND LOWER(r."roleName") LIKE '%admin%' AND u.status != 'disabled'`,
        [tenantId]
      );
      const activeAdmins = parseInt(adminCountRes.rows[0]?.count || '0', 10);

      let allowedAdmins = 1;
      if (planId === 'starter') allowedAdmins = 2;
      else if (planId === 'professional') allowedAdmins = 5;
      else if (planId === 'enterprise') allowedAdmins = 999999;

      if (activeAdmins >= allowedAdmins) {
        return res.status(400).json({
          message: `Your current plan (${subInfo?.planName || 'Free Trial'}) limits you to a maximum of ${allowedAdmins} Administrator account(s). Please upgrade your subscription plan to add more administrators.`
        });
      }
    }

    // 1. Get roleId from Role Name
    const roleResult = await query(
      'SELECT "roleId" FROM "Roles" WHERE "roleName" = $1 AND ("tenantId" = $2 OR "tenantId" IS NULL) LIMIT 1',
      [roleName, tenantId]
    );
    if (roleResult.rows.length === 0) {
      return res.status(400).json({ message: 'Invalid role selected.' });
    }
    const roleId = roleResult.rows[0].roleId;

    // 2. Check if email or employeeId already exists
    const existing = await query(
      'SELECT "userId" FROM "Users" WHERE LOWER("email") = LOWER($1) OR "employeeId" = $2',
      [email, employeeId]
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({ message: 'Email or Employee ID already exists.' });
    }

    // 3. Generate nextUserId
    const maxUserRes = await query(`SELECT COALESCE(MAX("userId"), 0) + 1 AS next_id FROM "Users"`, []);
    const nextUserId = BigInt(maxUserRes.rows[0]?.next_id || 1);

    // 4. Hash Password using bcrypt (compatible with login.ts)
    const passwordHash = await bcrypt.hash(password, 10);

    // 5. Insert into "Users"
    const sql = `
      INSERT INTO "Users" (
        "userId", "employeeId", "fullName", "email", "passwordHash", 
        "phoneNumber", "address", "photoURL", "roleId", "tenantId", "reportingTo"
      ) 
      OUTPUT INSERTED."userId"
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11);
    `;

    const values = [
      nextUserId,
      employeeId, 
      fullName, 
      email.toLowerCase(), 
      passwordHash, 
      phoneNumber || null, 
      address || null, 
      photoURL || null, 
      roleId,
      tenantId,
      reportingTo ? Number(reportingTo) : null
    ];

    const result = await query(sql, values);

    return res.status(201).json({ 
      message: 'User created successfully', 
      userId: result.rows[0]?.userId?.toString() ?? nextUserId.toString()
    });

  } catch (error: any) {
    console.error('❌ Add User API Error:', error);
    if (error.number === 2627 || error.code === '23505') {
      return res.status(409).json({ message: 'Email or Employee ID already exists.' });
    }
    return res.status(500).json({ message: 'An internal server error occurred.' });
  }
}

export default withSubscriptionLimit(addUserHandler, 'users');