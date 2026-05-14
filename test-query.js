require('dotenv').config({ path: 'packages/server/.env' });
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function run() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const tenantId = 'test-uuid';
    await client.query(`
      INSERT INTO "Tenants" (id, name, "organizationType", "gstNumber", address, country, state, city, "postalCode", status, "createdAt", "updatedAt")
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'active', NOW(), NOW())
    `, [tenantId, 'Test Org', 'IT', '', 'Addr', 'IN', 'AP', 'Vijayawada', '520007']);
    console.log('Tenant created');
    await client.query('ROLLBACK');
  } catch (e) {
    console.error(e);
  } finally {
    client.release();
    pool.end();
  }
}
run();
