import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '@/lib/db';
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

  let client;
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

    client = await pool.connect();

    // 2. Check if user already exists globally
    const existingUserResult = await client.query('SELECT email FROM "Users" WHERE email = $1', [user.email.toLowerCase()]);
    if (existingUserResult.rows.length > 0) {
      client.release();
      return res.status(409).json({
        message: 'A user with this email already exists.'
      });
    }

    const hashedPassword = await bcrypt.hash(user.password, 10);

    // 3. Start Transaction
    await client.query('BEGIN');
      
    // A. Create Tenant
    const tenantId = crypto.randomUUID();
    await client.query(`
      INSERT INTO "Tenants" (id, name, "organizationType", "gstNumber", address, country, state, city, "postalCode", status, "createdAt", "updatedAt")
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'active', NOW(), NOW())
    `, [tenantId, organization.name, organization.type, organization.gst, organization.address, organization.country, organization.state, organization.city, organization.postalCode]);

    // B. Ensure 'trial' plan exists
    const trialPlanResult = await client.query('SELECT id FROM "Plans" WHERE id = $1', ['trial']);
    if (trialPlanResult.rows.length === 0) {
      const features = JSON.stringify({ reports: 'basic', support: 'email', storage: 'limited' });
      await client.query(`
        INSERT INTO "Plans" (id, name, "maxUsers", "maxAssets", price, currency, features, "createdAt")
        VALUES ('trial', 'Free Trial', 3, 25, 0, 'INR', $1::jsonb, NOW())
      `, [features]);
    }

    // C. Create Trial Subscription
    const subscriptionId = crypto.randomUUID();
    const endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await client.query(`
      INSERT INTO "Subscriptions" (id, "tenantId", "planId", "startDate", "endDate", status, "createdAt", "updatedAt")
      VALUES ($1, $2, 'trial', NOW(), $3, 'trialing', NOW(), NOW())
    `, [subscriptionId, tenantId, endDate.toISOString()]);

    // D. Ensure 'Tenant Admin' role exists
    const roleResult = await client.query('SELECT "roleId" FROM "Roles" WHERE "roleName" = $1', ['Tenant Admin']);
    let roleId;
    if (roleResult.rows.length === 0) {
      const newRole = await client.query('INSERT INTO "Roles" ("roleName") VALUES ($1) RETURNING "roleId"', ['Tenant Admin']);
      roleId = newRole.rows[0].roleId;
    } else {
      roleId = roleResult.rows[0].roleId;
    }

    // E. Create Admin User linked to Tenant
    const newUserResult = await client.query(`
      INSERT INTO "Users" ("fullName", email, "passwordHash", "phoneNumber", designation, "roleId", "tenantId", "isPrimaryContact", status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, true, 'active')
      RETURNING "userId", email
    `, [user.fullName, user.email.toLowerCase(), hashedPassword, user.mobileNumber, user.designation, roleId, tenantId]);

    await client.query('COMMIT');

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
    if (client) {
      await client.query('ROLLBACK');
    }
    console.error('Registration API Error:', error);
    return res.status(500).json({
      message: 'An internal server error occurred during organization registration.'
    });
  } finally {
    if (client) {
      client.release();
    }
  }
}
