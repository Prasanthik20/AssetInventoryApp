const { Pool } = require('pg');
require('dotenv').config({ path: 'd:/APPS/AssetInventoryApp/packages/server/.env' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function run() {
  try {
    const usersRes = await pool.query('SELECT "userId", "employeeId", "fullName", "email", "roleId" FROM "Users"');
    console.log("=== Users ===");
    console.log(usersRes.rows);

    const rolesRes = await pool.query('SELECT * FROM "Roles"');
    console.log("=== Roles ===");
    console.log(rolesRes.rows);
  } catch (err) {
    console.error("DB Error:", err);
  } finally {
    pool.end();
  }
}

run();
