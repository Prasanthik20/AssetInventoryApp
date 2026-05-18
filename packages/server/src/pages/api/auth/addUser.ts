import type { NextApiResponse } from "next";
import query from "@/lib/db";
import bcrypt from "bcrypt";
import { withAuth, AuthenticatedRequest } from "@/lib/apiHandler";

async function addUserHandler(
  req: AuthenticatedRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST", "OPTIONS"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const { fullName, email, password, phoneNumber, address, roleName } =
    req.body;
  const { tenantId } = req.user;

  if (!fullName || !email || !password || !roleName) {
    return res.status(400).json({ message: "Missing required fields." });
  }

  try {
    // 1️⃣ Get roleId
    const roleResult = await query(
      'SELECT "roleId" FROM "Roles" WHERE "roleName" = $1 LIMIT 1',
      [roleName]
    );

    if (roleResult.rows.length === 0) {
      return res.status(400).json({ message: "Invalid role selected." });
    }

    const roleId = roleResult.rows[0].roleId;

    // 2️⃣ Hash password using bcrypt
    const passwordHash = await bcrypt.hash(password, 10); // 10 = salt rounds

    // 3️⃣ Insert user
    const sql = `
      INSERT INTO "Users" (
        "fullName", "email", "passwordHash",
        "phoneNumber", "address", "roleId", "tenantId"
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING "userId";
    `;

    const values = [
      fullName,
      email,
      passwordHash,
      phoneNumber || null,
      address || null,
      roleId,
      tenantId,
    ];

    const result = await query(sql, values);

    return res.status(201).json({
      message: "User created successfully",
      userId: result.rows[0].userId.toString(),
    });
  } catch (error: any) {
    console.error("❌ Add User API Error:", error);

    if (error.code === "23505") {
      return res
        .status(409)
        .json({ message: "Email already exists." });
    }

    return res
      .status(500)
      .json({ message: "An internal server error occurred." });
  }
}

export default withAuth(addUserHandler);