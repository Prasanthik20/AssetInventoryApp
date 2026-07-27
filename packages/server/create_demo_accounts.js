/**
 * create_demo_accounts.js
 *
 * Run this script ONCE against your production PostgreSQL database to create
 * permanent demo accounts for Google Play Store reviewers.
 *
 * Usage (from packages/server directory):
 *   node --env-file=.env create_demo_accounts.js
 *
 * Uses Node's built-in --env-file flag (Node v20+) — no dotenv package needed.
 */
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// ─────────────────────────────────────────────────────────────
// DEMO ACCOUNT CONFIGURATION
// Change DEMO_PASSWORD here if you want a different password.
// ─────────────────────────────────────────────────────────────
const DEMO_PASSWORD      = 'Demo@1234';
const DEMO_TENANT_ID     = 'demo-reviewer-tenant';
const DEMO_TENANT_NAME   = 'ASQ Demo Organization';
const DEMO_SUB_ID        = 'demo-reviewer-sub';
const DEMO_PLAN_ID       = 'enterprise-demo';

// Role names must match your "Roles" table exactly
const DEMO_ACCOUNTS = [
  {
    email:       'demo.admin@asqledger.com',
    fullName:    'Demo Admin',
    roleName:    'Tenant Admin',    // adjust to match your Roles table
    designation: 'Administrator',
  },
  {
    email:       'demo.supervisor@asqledger.com',
    fullName:    'Demo Supervisor',
    roleName:    'Supervisor',
    designation: 'Supervisor',
  },
  {
    email:       'demo.operator@asqledger.com',
    fullName:    'Demo Operator',
    roleName:    'Operator',
    designation: 'Field Operator',
  },
];

async function ensureRole(client, roleName) {
  const res = await client.query(
    `SELECT "roleId" FROM "Roles" WHERE "roleName" = $1 LIMIT 1`,
    [roleName]
  );
  if (res.rows.length > 0) return res.rows[0].roleId;
  const ins = await client.query(
    `INSERT INTO "Roles" ("roleName") VALUES ($1) RETURNING "roleId"`,
    [roleName]
  );
  return ins.rows[0].roleId;
}

async function main() {
  const client = await pool.connect();
  try {
    console.log('🔐 Hashing demo password...');
    const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

    await client.query('BEGIN');

    // ── 1. Demo Tenant ──────────────────────────────────────────────
    console.log('🏢 Upserting demo tenant...');
    await client.query(
      `INSERT INTO "Tenants" ("id", "name", "organizationType", "status", "updatedAt")
       VALUES ($1, $2, 'Corporate', 'active', NOW())
       ON CONFLICT ("id") DO UPDATE SET "status" = 'active', "updatedAt" = NOW()`,
      [DEMO_TENANT_ID, DEMO_TENANT_NAME]
    );

    // ── 2. Demo Plan (never expires) ────────────────────────────────
    console.log('📋 Upserting enterprise demo plan...');
    await client.query(
      `INSERT INTO "Plans" ("id", "name", "maxUsers", "maxAssets", "price", "currency")
       VALUES ($1, 'Enterprise (Demo)', 999, 999999, 0, 'INR')
       ON CONFLICT ("id") DO NOTHING`,
      [DEMO_PLAN_ID]
    );

    // ── 3. Active Subscription (no endDate = never expires) ─────────
    console.log('✅ Upserting active subscription...');
    await client.query(
      `INSERT INTO "Subscriptions" ("id", "tenantId", "planId", "status", "updatedAt")
       VALUES ($1, $2, $3, 'active', NOW())
       ON CONFLICT ("id") DO UPDATE SET "status" = 'active', "updatedAt" = NOW()`,
      [DEMO_SUB_ID, DEMO_TENANT_ID, DEMO_PLAN_ID]
    );

    // ── 4. Upsert Demo Users ─────────────────────────────────────────
    for (const account of DEMO_ACCOUNTS) {
      console.log(`👤 Upserting: ${account.email} (${account.roleName})`);
      const roleId = await ensureRole(client, account.roleName);
      await client.query(
        `INSERT INTO "Users" ("fullName", "email", "passwordHash", "roleId", "tenantId", "designation", "status")
         VALUES ($1, $2, $3, $4, $5, $6, 'active')
         ON CONFLICT ("email") DO UPDATE
           SET "passwordHash" = $3,
               "status"       = 'active',
               "roleId"       = $4,
               "tenantId"     = $5`,
        [account.fullName, account.email, passwordHash, roleId, DEMO_TENANT_ID, account.designation]
      );
    }

    // ── 5. Commit accounts first (accounts are the critical part) ───
    await client.query('COMMIT');

    console.log('\n✅ ─────────────────────────────────────────────────────────');
    console.log('   DEMO ACCOUNTS CREATED / UPDATED SUCCESSFULLY');
    console.log('─────────────────────────────────────────────────────────────');
    console.log(`\n   Password: ${DEMO_PASSWORD}`);
    console.log('\n   Accounts ready for Google Play review:');
    DEMO_ACCOUNTS.forEach(a => {
      console.log(`     📧 ${a.email}  →  ${a.designation}`);
    });
    console.log('\n   ⚠️  Enter these in Google Play Console:');
    console.log('      App Content → App access → Manage instructions\n');

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Failed:', err.message);
    client.release();
    pool.end();
    process.exit(1);
  }

  // ── 6. Seed demo assets in a SEPARATE transaction ──────────────
  // (Kept separate so a sequence conflict here never rolls back the accounts above)
  try {
    await client.query('BEGIN');

    const existingAssets = await client.query(
      `SELECT COUNT(*) FROM "Asset_Details" WHERE "tenantId" = $1`,
      [DEMO_TENANT_ID]
    );

    if (parseInt(existingAssets.rows[0].count, 10) === 0) {
      console.log('📦 Seeding demo assets...');

      // ── Fix sequence out-of-sync (common after direct SQL inserts) ──
      await client.query(`
        SELECT setval(
          pg_get_serial_sequence('"Asset_Details"', 'id'),
          COALESCE((SELECT MAX(id) FROM "Asset_Details"), 0) + 1,
          false
        )
      `);
      await client.query(`
        SELECT setval(
          pg_get_serial_sequence('"Status"', 'id'),
          COALESCE((SELECT MAX(id) FROM "Status"), 0) + 1,
          false
        )
      `);
      await client.query(`
        SELECT setval(
          pg_get_serial_sequence('"Category"', 'id'),
          COALESCE((SELECT MAX(id) FROM "Category"), 0) + 1,
          false
        )
      `);

      // Status
      const statusRes = await client.query(
        `INSERT INTO "Status" ("tenantId", "status") VALUES ($1, 'Available') RETURNING id`,
        [DEMO_TENANT_ID]
      );
      const statusId = statusRes.rows[0]?.id;

      // Category (use a high categoryId unlikely to conflict)
      const DEMO_CAT_ID = 99901;
      await client.query(
        `INSERT INTO "Category" ("categoryId", "tenantId", "category", "serial_no", "isSystemCategory")
         VALUES ($1, $2, 'IT Equipment', 'CAT-DEMO-001', false)
         ON CONFLICT ("categoryId") DO NOTHING`,
        [DEMO_CAT_ID, DEMO_TENANT_ID]
      );
      // Also sync Category.categoryId sequence if needed
      await client.query(`
        SELECT setval(
          pg_get_serial_sequence('"Category"', 'categoryId'),
          COALESCE((SELECT MAX("categoryId") FROM "Category"), 0) + 1,
          false
        )
      `).catch(() => {}); // ignore if no sequence for categoryId

      const demoAssets = [
        { name: 'Demo Laptop',           serial: 'DEMO-LT-001', model: 'ThinkPad X1 Carbon' },
        { name: 'Demo Monitor',          serial: 'DEMO-MN-002', model: 'Dell UltraSharp 27"' },
        { name: 'Demo Barcode Scanner',  serial: 'DEMO-BS-003', model: 'Zebra DS2208' },
        { name: 'Demo Tablet',           serial: 'DEMO-TB-004', model: 'Samsung Galaxy Tab S9' },
      ];

      for (const asset of demoAssets) {
        await client.query(
          `INSERT INTO "Asset_Details" ("categoryId", "tenantId", "name", "serial_no", "model_no", "status_id")
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT ("serial_no") DO NOTHING`,
          [DEMO_CAT_ID, DEMO_TENANT_ID, asset.name, asset.serial, asset.model, statusId]
        );
      }

      await client.query('COMMIT');
      console.log('✅ Demo assets seeded successfully.\n');
    } else {
      await client.query('ROLLBACK');
      console.log(`📦 Demo assets already exist (${existingAssets.rows[0].count} found). Skipping.\n`);
    }

  } catch (assetErr) {
    await client.query('ROLLBACK').catch(() => {});
    console.warn('⚠️  Asset seeding failed (accounts are fine):', assetErr.message);
    console.warn('   You can add demo assets manually from the Admin dashboard.\n');
  } finally {
    client.release();
    pool.end();
  }
}

main();
