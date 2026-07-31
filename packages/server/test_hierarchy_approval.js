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

const connectionString = process.env.DATABASE_URL || process.env.DIRECT_URL;

const pool = new Pool({
  connectionString: connectionString,
  ssl: { rejectUnauthorized: false },
});

async function run() {
  const tenantId = '762a6a5f-0089-469b-b745-03077d2de864';
  try {
    console.log("Setting up reporting hierarchy links for Test Org...");
    // Yamini (30) reports to Prasanthi (16)
    await pool.query(`UPDATE "Users" SET "reportingTo" = 16 WHERE "employeeId" = 30 AND "tenantId" = $1`, [tenantId]);
    // Prasanthi (16) reports to Santhamani (14)
    await pool.query(`UPDATE "Users" SET "reportingTo" = 14 WHERE "employeeId" = 16 AND "tenantId" = $1`, [tenantId]);

    console.log("=== UPDATED HIERARCHY TREE ===");
    const usersRes = await pool.query(`
      SELECT 
        u."employeeId", u."fullName", u.email, u."reportingTo",
        mgr."fullName" AS "managerName"
      FROM "Users" u
      LEFT JOIN "Users" mgr ON mgr."employeeId" = u."reportingTo"
      WHERE u."tenantId" = $1
      ORDER BY u."employeeId" ASC
    `, [tenantId]);
    console.table(usersRes.rows);

  } catch (err) {
    console.error("Error:", err);
  } finally {
    pool.end();
  }
}

run();
