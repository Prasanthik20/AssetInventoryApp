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
    console.log("=== STEP 1: Verify Column 'reportingTo' ===");
    const colRes = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'Users' AND column_name = 'reportingTo';
    `);
    console.table(colRes.rows);

    console.log("=== STEP 2: Fetch Users & Manager Links for Test Org ===");
    const usersRes = await pool.query(`
      SELECT 
        u."employeeId", u."fullName", u.email, u.designation, u."reportingTo",
        mgr."fullName" AS "managerName"
      FROM "Users" u
      LEFT JOIN "Users" mgr ON mgr."employeeId" = u."reportingTo"
      WHERE u."tenantId" = $1
      ORDER BY u."employeeId" ASC
    `, [tenantId]);
    console.table(usersRes.rows);

    console.log("=== VERIFICATION COMPLETED CLEANLY ===");

  } catch (err) {
    console.error("Test Error:", err);
  } finally {
    pool.end();
  }
}

run();
