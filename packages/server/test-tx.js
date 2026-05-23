require('dotenv').config({ path: '.env' });
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function run() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const tenantId = 'test-tenant-123';
    await client.query(`
      INSERT INTO "Tenants" (id, name, "organizationType", "gstNumber", address, country, state, city, "postalCode", status, "createdAt", "updatedAt")
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'active', NOW(), NOW())
    `, [tenantId, 'Org', 'IT', 'GST', 'Addr', 'IN', 'AP', 'City', '123']);
    console.log('Tenant inserted');

    const trialPlanResult = await client.query('SELECT id FROM "Plans" WHERE id = $1', ['trial']);
    if (trialPlanResult.rows.length === 0) {
      const features = JSON.stringify({ reports: 'basic' });
      await client.query(`
        INSERT INTO "Plans" (id, name, "maxUsers", "maxAssets", price, currency, features, "createdAt")
        VALUES ('trial', 'Free Trial', 3, 25, 0, 'INR', $1, NOW())
      `, [features]);
    }
    console.log('Plan inserted/verified');

    const subscriptionId = 'test-sub-123';
    const endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await client.query(`
      INSERT INTO "Subscriptions" (id, "tenantId", "planId", "startDate", "endDate", status, "createdAt", "updatedAt")
      VALUES ($1, $2, 'trial', NOW(), $3, 'trialing', NOW(), NOW())
    `, [subscriptionId, tenantId, endDate.toISOString()]);
    console.log('Subscription inserted');

    const roleResult = await client.query('SELECT "roleId" FROM "Roles" WHERE "roleName" = $1', ['Tenant Admin']);
    let roleId;
    if (roleResult.rows.length === 0) {
      const newRole = await client.query('INSERT INTO "Roles" ("roleName") VALUES ($1) RETURNING "roleId"', ['Tenant Admin']);
      roleId = newRole.rows[0].roleId;
    } else {
      roleId = roleResult.rows[0].roleId;
    }
    console.log('Role verified:', roleId);

    await client.query(`
      INSERT INTO "Users" ("fullName", email, "passwordHash", "phoneNumber", designation, "roleId", "tenantId", "isPrimaryContact", status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, true, 'active')
      RETURNING "userId", email
    `, ['Test User', 'test@test.com', 'hash', '123', 'Mgr', roleId, tenantId]);
    console.log('User inserted');

    console.log('Success!');
    await client.query('ROLLBACK');
  } catch (err) {
    console.error('ERROR:', err);
    await client.query('ROLLBACK');
  } finally {
    client.release();
    pool.end();
  }
}
run();
