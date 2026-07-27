const { Pool } = require('pg');
require('dotenv').config({ path: 'd:/APPS/AssetInventoryApp/packages/server/.env' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function run() {
  try {
    console.log("Adding columns min_users and min_assets to plans table if not exist...");
    await pool.query(`
      ALTER TABLE "Plans" 
      ADD COLUMN IF NOT EXISTS min_users INT DEFAULT 1,
      ADD COLUMN IF NOT EXISTS min_assets INT DEFAULT 1;
    `);
    console.log("Columns verified/added.");

    console.log("Inserting updated plans catalog...");
    const plansSql = `
      INSERT INTO "Plans" (
        id, 
        name, 
        min_users, 
        "maxUsers", 
        min_assets, 
        "maxAssets", 
        price, 
        currency, 
        features,
        "createdAt"
      ) VALUES 
      (
        'free-trial', 
        'Free Trial', 
        1, 
        5, 
        1, 
        100, 
        0.00, 
        'INR', 
        '{"qrCode": false, "reports": "basic", "storage": "2GB", "support": "email", "apiAccess": false, "dashboard": "basic", "trialDays": 30, "customCategories": false}',
        '2026-05-14T02:36:33.002Z'
      ),
      (
        'starter', 
        'Starter', 
        6, 
        25, 
        101, 
        2500, 
        4999.00, 
        'INR', 
        '{"qrCode": true, "reports": "standard", "storage": "25GB", "support": "email", "apiAccess": false, "yearlyPrice": 59988, "customCategories": false, "emailNotifications": true}',
        '2026-05-14T02:36:33.002Z'
      ),
      (
        'professional', 
        'Professional', 
        26, 
        100, 
        2501, 
        25000, 
        14999.00, 
        'INR', 
        '{"qrCode": true, "reports": "advanced", "storage": "100GB", "support": "priority", "apiAccess": true, "auditLogs": true, "yearlyPrice": 179988, "dynamicFields": true, "roleManagement": true, "customCategories": true, "emailNotifications": true}',
        '2026-05-14T02:36:33.002Z'
      ),
      (
        'enterprise', 
        'Enterprise Plan', 
        101, 
        999999, 
        25001, 
        999999, 
        -1.00, 
        'INR', 
        '{"sla": true, "sso": true, "qrCode": true, "reports": "advanced", "storage": "Unlimited", "support": "dedicated", "apiAccess": true, "auditLogs": true, "dedicatedDB": true, "multiBranch": true, "customPricing": true, "dynamicFields": true, "whiteLabeling": true, "roleManagement": true, "customCategories": true, "customIntegrations": true, "emailNotifications": true}',
        '2026-05-14T02:18:07.300Z'
      ),
      (
        'enterprise-demo', 
        'Enterprise (Demo)', 
        1, 
        999, 
        1, 
        999999, 
        0.00, 
        'INR', 
        NULL,
        '2026-06-13T00:26:34.959Z'
      )

      ON CONFLICT (id) 
      DO UPDATE SET 
        name = EXCLUDED.name,
        min_users = EXCLUDED.min_users,
        "maxUsers" = EXCLUDED."maxUsers",
        min_assets = EXCLUDED.min_assets,
        "maxAssets" = EXCLUDED."maxAssets",
        price = EXCLUDED.price,
        currency = EXCLUDED.currency,
        features = EXCLUDED.features,
        "createdAt" = EXCLUDED."createdAt";
    `;

    await pool.query(plansSql);
    console.log("Plans updated successfully!");

    const verify = await pool.query('SELECT id, name, min_users, "maxUsers", min_assets, "maxAssets", price FROM "Plans"');
    console.log("=== Current Plans ===");
    console.log(verify.rows);
  } catch (err) {
    console.error("Migration/Update Error:", err);
  } finally {
    pool.end();
  }
}

run();
