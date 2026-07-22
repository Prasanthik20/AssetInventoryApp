import type { NextApiResponse } from 'next';
import query, { pool } from '@/lib/db';
import { withAuth, AuthenticatedRequest } from '@/lib/apiHandler';

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  // 1. Secure check: Only Super Admin can access the tenants listing
  if (req.user.role !== 'Super Admin') {
    return res.status(403).json({ message: 'Access denied. Super Admin privileges required.' });
  }

  // ==========================================
  // GET: Fetch all tenants
  // ==========================================
  if (req.method === 'GET') {
    try {
      const sql = `
        SELECT 
          t.id, 
          t.name, 
          t.status, 
          t."organizationType",
          t."createdAt",
          COALESCE(sub.name, 'No active plan') AS "planName",
          COALESCE(sub.plan_id, 'free-trial') AS "planId",
          sub."startDate",
          sub."endDate",
          admin."fullName" AS "adminName",
          admin.email AS "adminEmail",
          admin."phoneNumber" AS "adminPhone",
          admin.address AS "adminAddress",
          (SELECT COUNT(*)::int FROM "Asset_Details" WHERE "tenantId" = t.id) AS "assetsCount"
        FROM 
          "Tenants" t
        LEFT JOIN LATERAL (
          SELECT p.name, p.id AS plan_id, s."startDate", s."endDate"
          FROM "Subscriptions" s
          JOIN "Plans" p ON s."planId" = p.id
          WHERE s."tenantId" = t.id
          ORDER BY s."updatedAt" DESC
          LIMIT 1
        ) sub ON TRUE
        LEFT JOIN LATERAL (
          SELECT u."fullName", u.email, u."phoneNumber", u.address
          FROM "Users" u
          LEFT JOIN "Roles" r ON u."roleId" = r."roleId"
          WHERE u."tenantId" = t.id AND (
            u."isPrimaryContact" = TRUE OR
            (r."roleName" IS NOT NULL AND (
              LOWER(r."roleName") IN ('admin', 'super admin', 'superadmin', 'tenant admin', 'tenantadmin')
              OR EXISTS (
                SELECT 1 FROM "Role_Permissions" rp
                JOIN "Permissions" p ON rp."permissionId" = p.id
                WHERE rp."roleId" = u."roleId" AND p.code IN ('MANAGE_USERS', 'MANAGE_WORKFLOWS')
              )
            ))
          )
          ORDER BY u."userId" ASC
          LIMIT 1
        ) admin ON TRUE
        ORDER BY 
          t."createdAt" DESC;
      `;
      const result = await query(sql);
      console.log(result.rows)
      return res.status(200).json({ count: result.rows.length, tenants: result.rows });
    } catch (error) {
      console.error('Super Admin Fetch Tenants Error:', error);
      return res.status(500).json({ message: 'An internal server error occurred.' });
    }
  }

  // ==========================================
  // PUT: Update a tenant status and subscription plan
  // ==========================================
  if (req.method === 'PUT') {
    const { tenantId, status, planId } = req.body;

    if (!tenantId || !status || !planId) {
      return res.status(400).json({ message: 'Tenant ID, status, and target plan ID are required.' });
    }

    let client;

    try {
      client = await pool.connect();
      await client.query('BEGIN');

      // A. Update Tenant Status
      await client.query(
        `UPDATE "Tenants" SET status = $1, "updatedAt" = NOW() WHERE id = $2`,
        [status, tenantId]
      );

      // B. Update/Upsert Subscription
      const subCheck = await client.query(
        `SELECT id FROM "Subscriptions" WHERE "tenantId" = $1 ORDER BY "createdAt" DESC LIMIT 1`,
        [tenantId]
      );

      const subStatus = status === 'active' ? 'active' : status === 'expired' ? 'expired' : 'canceled';

      if (subCheck.rows.length > 0) {
        // Update plan and status of the current subscription
        await client.query(
          `UPDATE "Subscriptions" 
           SET "planId" = $1, status = $2, "updatedAt" = NOW() 
           WHERE id = $3`,
          [planId, subStatus, subCheck.rows[0].id]
        );
      } else {
        // Insert a new subscription
        const crypto = require('crypto');
        const newSubId = crypto.randomUUID();
        const endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days default
        await client.query(
          `INSERT INTO "Subscriptions" (id, "tenantId", "planId", "startDate", "endDate", status, "createdAt", "updatedAt")
           VALUES ($1, $2, $3, NOW(), $4, $5, NOW(), NOW())`,
          [newSubId, tenantId, planId, endDate.toISOString(), subStatus]
        );
      }

      await client.query('COMMIT');
      return res.status(200).json({
        success: true,
        message: 'Tenant profile, status, and subscription updated successfully!'
      });

    } catch (error) {
      if (client) {
        await client.query('ROLLBACK');
      }
      console.error('Super Admin Update Tenant Error:', error);
      return res.status(500).json({ message: 'An internal server error occurred during transaction processing.' });
    } finally {
      if (client) {
        client.release();
      }
    }
  }

  res.setHeader('Allow', ['GET', 'PUT']);
  return res.status(405).json({ message: `Method ${req.method} Not Allowed` });
}

export default withAuth(handler);
