import type { NextApiRequest, NextApiResponse } from 'next';
import query from '@/lib/db';
import bcrypt from "bcryptjs";
import { setCorsHeaders } from '@/lib/corsHeaders';
import crypto from 'crypto';

/**
 * @api {post} /api/auth/register-tenant Register a new Organization and Admin User
 */
export default async function registerTenantHandler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const origin = req.headers.origin as string;
  setCorsHeaders(res, origin);

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.setHeader("Allow", ['POST']);
    res.status(405).json({ message: `Method ${req.method} Not Allowed` });
    return;
  }

  try {
    const { 
      organization, // { name, type, gst, address, country, state, city, postalCode }
      user          // { fullName, email, password, mobileNumber, designation }
    } = req.body;

    // 1. Basic Validation
    if (!organization?.name || !user?.email || !user?.password || !user?.fullName) {
      return res.status(400).json({
        message: 'Organization name, full name, email, and password are required.'
      });
    }

    // 2. Check if user already exists globally
    const existingUserResult = await query('SELECT email FROM "Users" WHERE email = $1', [user.email.toLowerCase()]);
    if (existingUserResult.rows.length > 0) {
      return res.status(409).json({
        message: 'A user with this email already exists.'
      });
    }

    const hashedPassword = await bcrypt.hash(user.password, 10);

    // 3. Start Transaction
    await query('BEGIN');
      
    // A. Create Tenant
    const tenantId = crypto.randomUUID();
    await query(`
      INSERT INTO "Tenants" (id, name, "organizationType", "gstNumber", address, country, state, city, "postalCode", status, "createdAt", "updatedAt")
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'active', NOW(), NOW())
    `, [tenantId, organization.name, organization.type, organization.gst, organization.address, organization.country, organization.state, organization.city, organization.postalCode]);

    // B. Ensure 'free-trial' plan exists
    const trialPlanResult = await query('SELECT id FROM "Plans" WHERE id = $1', ['free-trial']);
    if (trialPlanResult.rows.length === 0) {
      const features = JSON.stringify({
        trialDays: 30, storage: '2GB', reports: 'basic', support: 'email',
        dashboard: 'basic', qrCode: false, apiAccess: false, customCategories: false
      });
      await query(`
        INSERT INTO "Plans" (id, name, "maxUsers", "maxAssets", price, currency, features, "createdAt")
        VALUES ('free-trial', 'Free Trial', 5, 100, 0.00, 'INR', $1, NOW())
      `, [features]);
    }

    // C. Create Trial Subscription
    const subscriptionId = crypto.randomUUID();
    const endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await query(`
      INSERT INTO "Subscriptions" (id, "tenantId", "planId", "startDate", "endDate", status, "createdAt", "updatedAt")
      VALUES ($1, $2, 'free-trial', NOW(), $3, 'trialing', NOW(), NOW())
    `, [subscriptionId, tenantId, endDate.toISOString()]);

    // D. Ensure 'Tenant Admin' role exists
    const roleResult = await query('SELECT "roleId" FROM "Roles" WHERE "roleName" = $1', ['Tenant Admin']);
    let roleId;
    if (roleResult.rows.length === 0) {
      const newRole = await query('INSERT INTO "Roles" ("roleName") VALUES ($1) RETURNING "roleId"', ['Tenant Admin']);
      roleId = newRole.rows[0].roleId;
    } else {
      roleId = roleResult.rows[0].roleId;
    }

    // E. Create Admin User linked to Tenant
    const maxUserRes = await query(`SELECT COALESCE(MAX("userId"), 0) + 1 AS next_id FROM "Users"`, []);
    const nextUserId = BigInt(maxUserRes.rows[0]?.next_id || 1);

    const maxEmpRes = await query(`SELECT COALESCE(MAX("employeeId"), 0) + 1 AS next_id FROM "Users"`, []);
    const nextEmpId = BigInt(maxEmpRes.rows[0]?.next_id || 1);

    const newUserResult = await query(`
      INSERT INTO "Users" ("userId", "employeeId", "fullName", email, "passwordHash", "phoneNumber", designation, "roleId", "tenantId", "isPrimaryContact", status)
      OUTPUT INSERTED."userId", INSERTED.email
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 1, 'active')
    `, [nextUserId, nextEmpId, user.fullName, user.email.toLowerCase(), hashedPassword, user.mobileNumber, user.designation, roleId, tenantId]);

    await query('COMMIT');

    res.status(201).json({
      message: 'Registration successful!',
      data: {
        tenantId: tenantId,
        organizationName: organization.name,
        userId: newUserResult.rows[0].userId.toString(),
        email: newUserResult.rows[0].email
      }
    });

  } catch (error) {
    await query('ROLLBACK');
    console.error('Registration API Error:', error);
    return res.status(500).json({
      message: 'An internal server error occurred during organization registration.'
    });
  }
}

