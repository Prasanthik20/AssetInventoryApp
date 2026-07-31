import type { NextApiResponse } from "next";
import query from "@/lib/db";
import bcrypt from "bcryptjs";
import { AuthenticatedRequest } from "@/lib/apiHandler";
import { withSubscriptionLimit, getSubscriptionInfo } from "@/lib/subscription";

async function addUserHandler(
  req: AuthenticatedRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST", "OPTIONS"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const { fullName, email, password, phoneNumber, address, roleName } = req.body;
  const { tenantId } = req.user;

  if (!fullName || !email || !password || !roleName) {
    return res.status(400).json({ message: "Missing required fields (fullName, email, password, roleName)." });
  }

  if (!tenantId) {
    return res.status(400).json({ message: "Tenant ID is missing." });
  }

  try {
    // 1️⃣ Check for existing user email
    const existingUser = await query(
      `SELECT "userId" FROM "Users" WHERE LOWER("email") = LOWER($1) LIMIT 1`,
      [email.trim()]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({ message: "A user with this email address already exists." });
    }

    // 2️⃣ Check subscription plan limits for administrators
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

    // 3️⃣ Get roleId (case-insensitive)
    const roleResult = await query(
      `SELECT "roleId" FROM "Roles" 
       WHERE LOWER("roleName") = LOWER($1) AND ("tenantId" = $2 OR "tenantId" IS NULL) 
       ORDER BY "tenantId" DESC LIMIT 1`,
      [roleName.trim(), tenantId]
    );

    if (roleResult.rows.length === 0) {
      return res.status(400).json({ message: `Invalid role '${roleName}' selected.` });
    }

    const roleId = roleResult.rows[0].roleId;

    // 4️⃣ Generate unique userId & employeeId
    const maxUserRes = await query(`SELECT COALESCE(MAX("userId"), 0) + 1 AS next_id FROM "Users"`, []);
    const nextUserId = BigInt(maxUserRes.rows[0]?.next_id || 1);

    const maxEmpRes = await query(`SELECT COALESCE(MAX("employeeId"), 0) + 1 AS next_id FROM "Users"`, []);
    const nextEmpId = BigInt(maxEmpRes.rows[0]?.next_id || 1);

    // 5️⃣ Hash password using bcryptjs
    const passwordHash = await bcrypt.hash(password, 10);

    // 6️⃣ Insert user
    const sql = `
      INSERT INTO "Users" (
        "userId", "employeeId", "fullName", "email", "passwordHash",
        "phoneNumber", "address", "roleId", "tenantId", "status"
      )
      OUTPUT INSERTED."userId"
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'active');
    `;

    const values = [
      nextUserId,
      nextEmpId,
      fullName.trim(),
      email.trim().toLowerCase(),
      passwordHash,
      phoneNumber ? phoneNumber.trim() : null,
      address ? address.trim() : null,
      roleId,
      tenantId,
    ];

    const result = await query(sql, values);
    const newUserId = result.rows[0]?.userId || result.rows[0]?.id || '1';

    return res.status(201).json({
      message: "User created successfully",
      userId: String(newUserId),
    });
  } catch (error: any) {
    console.error("❌ Add User API Error:", error);

    const errStr = String(error.message || error);
    if (
      error.code === "23505" || 
      error.number === 2627 || 
      error.number === 2601 || 
      errStr.includes("Violation of UNIQUE") || 
      errStr.includes("duplicate key")
    ) {
      return res.status(409).json({ message: "A user with this email address already exists." });
    }

    return res.status(500).json({
      message: error.message || "An internal server error occurred while creating the user."
    });
  }
}

export default withSubscriptionLimit(addUserHandler, 'users');