const { Pool } = require('pg');
require('dotenv').config({ path: 'd:/PSIMS/AssetInventoryApp/packages/server/.env' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function run() {
  try {
    const res = await pool.query('SELECT * FROM "Notifications"');
    console.log("Total notifications:", res.rows.length);
    if (res.rows.length > 0) {
      console.log("First notification:", res.rows[0]);
    }
  } catch (err) {
    console.error("DB Error:", err);
  } finally {
    pool.end();
  }
}

run();
