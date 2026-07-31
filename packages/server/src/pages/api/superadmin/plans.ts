import type { NextApiResponse } from 'next';
import query from '@/lib/db';
import { withAuth, AuthenticatedRequest } from '@/lib/apiHandler';

let isDbMigrated = false;

async function ensureDatabaseSchema() {
  if (isDbMigrated) return;
  try {
    // 1. Alter table to add min_users and min_assets if not exist
    await query(`
      IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Plans' AND COLUMN_NAME = 'min_users')
      BEGIN
          ALTER TABLE "Plans" ADD "min_users" INT DEFAULT 1;
      END

      IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Plans' AND COLUMN_NAME = 'min_assets')
      BEGIN
          ALTER TABLE "Plans" ADD "min_assets" INT DEFAULT 1;
      END
    `);

    // 2. Insert/update plans with the specified default dataset using MERGE
    const plansSql = `
      MERGE INTO "Plans" AS target
      USING (VALUES 
        ('free-trial', 'Free Trial', 1, 5, 1, 100, 0.00, 'INR', '{"qrCode": false, "reports": "basic", "storage": "2GB", "support": "email", "apiAccess": false, "dashboard": "basic", "trialDays": 30, "customCategories": false}', '2026-05-14T02:36:33.002Z'),
        ('starter', 'Starter', 6, 25, 101, 2500, 4999.00, 'INR', '{"qrCode": true, "reports": "standard", "storage": "25GB", "support": "email", "apiAccess": false, "yearlyPrice": 59988, "customCategories": false, "emailNotifications": true}', '2026-05-14T02:36:33.002Z'),
        ('professional', 'Professional', 26, 100, 2501, 25000, 14999.00, 'INR', '{"qrCode": true, "reports": "advanced", "storage": "100GB", "support": "priority", "apiAccess": true, "auditLogs": true, "yearlyPrice": 179988, "dynamicFields": true, "roleManagement": true, "customCategories": true, "emailNotifications": true}', '2026-05-14T02:36:33.002Z'),
        ('enterprise', 'Enterprise Plan', 101, 999999, 25001, 999999, -1.00, 'INR', '{"sla": true, "sso": true, "qrCode": true, "reports": "advanced", "storage": "Unlimited", "support": "dedicated", "apiAccess": true, "auditLogs": true, "dedicatedDB": true, "multiBranch": true, "customPricing": true, "dynamicFields": true, "whiteLabeling": true, "roleManagement": true, "customCategories": true, "customIntegrations": true, "emailNotifications": true}', '2026-05-14T02:18:07.300Z'),
        ('enterprise-demo', 'Enterprise (Demo)', 1, 999, 1, 999999, 0.00, 'INR', NULL, '2026-06-13T00:26:34.959Z')
      ) AS source (id, name, min_users, maxUsers, min_assets, maxAssets, price, currency, features, createdAt)
      ON target.id = source.id
      WHEN MATCHED THEN
        UPDATE SET 
          name = source.name,
          min_users = source.min_users,
          "maxUsers" = source.maxUsers,
          min_assets = source.min_assets,
          "maxAssets" = source.maxAssets,
          price = source.price,
          currency = source.currency,
          features = source.features
      WHEN NOT MATCHED THEN
        INSERT (id, name, min_users, "maxUsers", min_assets, "maxAssets", price, currency, features, "createdAt")
        VALUES (source.id, source.name, source.min_users, source.maxUsers, source.min_assets, source.maxAssets, source.price, source.currency, source.features, source.createdAt);
    `;
    await query(plansSql);
    isDbMigrated = true;
    console.log('SQL Server plans schema auto-migration and seeding succeeded.');
  } catch (err) {
    console.error('ensureDatabaseSchema plans migration error:', err);
  }
}

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  // Trigger self-migration check before request operations
  await ensureDatabaseSchema();

  // 1. Secure check:
  // - GET (list plans): Available to Super Admin, Tenant Admin, and Admin roles.
  // - POST (write/modify plans): ONLY available to Super Admin.
  if (req.method === 'GET') {
    const allowedRoles = ['Super Admin', 'Tenant Admin', 'Admin'];
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied. Privileged role required to view plans.' });
    }
  } else {
    if (req.user.role !== 'Super Admin') {
      return res.status(403).json({ message: 'Access denied. Super Admin privileges required.' });
    }
  }

  // ==========================================
  // GET: Fetch all plans in the system
  // ==========================================
  if (req.method === 'GET') {
    try {
      const plansRes = await query('SELECT * FROM "Plans" ORDER BY price ASC');
      return res.status(200).json({ count: plansRes.rows.length, plans: plansRes.rows });
    } catch (error) {
      console.error('Fetch Plans Error:', error);
      return res.status(500).json({ message: 'An internal server error occurred.' });
    }
  }

  // ==========================================
  // POST: Add or Update (Upsert) a plan package
  // ==========================================
  if (req.method === 'POST') {
    const { id, name, minUsers, maxUsers, minAssets, maxAssets, price, currency, features } = req.body;

    if (!id || !name || maxUsers === undefined || maxAssets === undefined || price === undefined) {
      return res.status(400).json({
        message: 'Plan Identifier (id), name, maximum users, maximum assets, and price are required.'
      });
    }

    try {
      const sql = `
        MERGE INTO "Plans" AS target
        USING (SELECT $1 AS id) AS source
        ON target.id = source.id
        WHEN MATCHED THEN
          UPDATE SET
            name = $2,
            min_users = $3,
            "maxUsers" = $4,
            min_assets = $5,
            "maxAssets" = $6,
            price = $7,
            currency = $8,
            features = $9
        WHEN NOT MATCHED THEN
          INSERT (id, name, min_users, "maxUsers", min_assets, "maxAssets", price, currency, features, "createdAt")
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, GETDATE())
        OUTPUT INSERTED.*;
      `;

      const values = [
        id.toLowerCase().trim().replace(/\s+/g, '-'), // enforce URL-safe ID format
        name.trim(),
        parseInt(minUsers !== undefined ? minUsers : 1, 10),
        parseInt(maxUsers, 10),
        parseInt(minAssets !== undefined ? minAssets : 1, 10),
        parseInt(maxAssets, 10),
        parseFloat(price),
        currency || 'INR',
        JSON.stringify(features || {})
      ];

      const result = await query(sql, values);

      return res.status(200).json({
        success: true,
        message: `Plan "${name}" has been successfully added/updated in the catalog.`,
        plan: result.rows[0]
      });

    } catch (error) {
      console.error('Super Admin Save Plan Error:', error);
      return res.status(500).json({ message: 'An internal server error occurred during plan saving.' });
    }
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).json({ message: `Method ${req.method} Not Allowed` });
}

export default withAuth(handler);
