import type { NextApiResponse } from 'next';
import query from '@/lib/db';
import crypto from 'crypto';
import { withAuth, AuthenticatedRequest } from '@/lib/apiHandler';
import { withSubscriptionLimit, getSubscriptionInfo } from '@/lib/subscription';

/**
 * Securely hashes a password using Node's native crypto module.
 */
function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`; // Store salt and hash together
}

async function addUserHandler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST', 'OPTIONS']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const { 
    employeeId, fullName, email, password, 
    phoneNumber, address, photoURL, roleName 
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

    // 2. Hash Password using Native Crypto (No bcrypt)
    const passwordHash = hashPassword(password);

    // 3. Insert into "Users"
    const sql = `
      INSERT INTO "Users" (
        "employeeId", "fullName", "email", "passwordHash", 
        "phoneNumber", "address", "photoURL", "roleId", "tenantId"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING "userId";
    `;

    const values = [
      employeeId, 
      fullName, 
      email, 
      passwordHash, 
      phoneNumber || null, 
      address || null, 
      photoURL || null, 
      roleId,
      tenantId
    ];

    const result = await query(sql, values);

    return res.status(201).json({ 
      message: 'User created successfully', 
      userId: result.rows[0].userId.toString() // Handle BigInt return
    });

  } catch (error: any) {
    console.error('❌ Add User API Error:', error);
    if (error.code === '23505') {
      return res.status(409).json({ message: 'Email or Employee ID already exists.' });
    }
    return res.status(500).json({ message: 'An internal server error occurred.' });
  }
}

export default withSubscriptionLimit(addUserHandler, 'users');