import type { NextApiRequest, NextApiResponse } from 'next';
import query from '@/lib/db';
import crypto from 'crypto';

/**
 * Securely hashes a password using Node's native crypto module.
 */
function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`; // Store salt and hash together
}

export default async function addUserHandler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const { 
    employeeId, fullName, email, password, 
    phoneNumber, address, photoURL, roleName 
  } = req.body;

  if (!employeeId || !fullName || !email || !password || !roleName) {
    return res.status(400).json({ message: 'Missing required fields.' });
  }

  try {
    // 1. Get roleId from Role Name
    const roleResult = await query('SELECT "roleId" FROM "Roles" WHERE "roleName" = $1 LIMIT 1', [roleName]);
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
        "phoneNumber", "address", "photoURL", "roleId"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
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
      roleId
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