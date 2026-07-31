const { Pool } = require('pg');
const path = require('path');
const fs = require('fs');

const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  const envConfig = fs.readFileSync(envPath, 'utf8');
  envConfig.split('\n').forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2) {
      const key = parts[0].trim();
      const value = parts.slice(1).join('=').trim().replace(/^['"]|['"]$/g, '');
      process.env[key] = value;
    }
  });
}

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;

const pool = new Pool({
  connectionString: connectionString,
  ssl: { rejectUnauthorized: false },
});

async function run() {
  const tenantId = '762a6a5f-0089-469b-b745-03077d2de864';
  try {
    console.log("=== TENANT INFO ===");
    const tenantRes = await pool.query(`SELECT id, name, status FROM "Tenants" WHERE id = $1`, [tenantId]);
    console.table(tenantRes.rows);

    console.log("=== ASSETS STATUS COUNT ===");
    const assetsRes = await pool.query(`
      SELECT s.status, COUNT(a.id) as count 
      FROM "Asset_Details" a 
      LEFT JOIN "Status" s ON a.status_id = s.id 
      WHERE a."tenantId" = $1 
      GROUP BY s.status`, [tenantId]);
    console.table(assetsRes.rows);

    console.log("=== TOTAL ASSETS ===");
    const totalAssetsRes = await pool.query(`SELECT COUNT(*) FROM "Asset_Details" WHERE "tenantId" = $1`, [tenantId]);
    console.log("Total Assets:", totalAssetsRes.rows[0].count);

    console.log("=== USERS & ROLES ===");
    const usersRes = await pool.query(`
      SELECT u."userId", u."employeeId", u."fullName", u.email, u.designation, r."roleName"
      FROM "Users" u
      LEFT JOIN "Roles" r ON u."roleId" = r."roleId"
      WHERE u."tenantId" = $1`, [tenantId]);
    console.table(usersRes.rows);

    console.log("=== ACTIVE WORKFLOWS ===");
    const wfRes = await pool.query(`
      SELECT id, name, "actionType", "isActive"
      FROM "Approval_Workflows"
      WHERE "tenantId" = $1`, [tenantId]);
    console.table(wfRes.rows);

    console.log("=== ACTIVE ASSIGNMENTS ===");
    const assignRes = await pool.query(`
      SELECT id, "assetId", "operator_employeeId", status
      FROM "Asset_Assignments"
      WHERE "tenantId" = $1`, [tenantId]);
    console.table(assignRes.rows);

  } catch (err) {
    console.error("Error:", err);
  } finally {
    pool.end();
  }
}

run();
