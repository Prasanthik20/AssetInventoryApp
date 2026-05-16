const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL.replace('?pgbouncer=true', ''),
  ssl: { rejectUnauthorized: false }
});

async function updatePlans() {
  const client = await pool.connect();
  try {
    console.log('Updating SaaS Plans...');
    await client.query('BEGIN');

    // Upsert Free Trial Plan
    await client.query(`
      INSERT INTO "Plans" (id, name, "maxUsers", "maxAssets", price, currency, features, "createdAt")
      VALUES ('free-trial', 'Free Trial', 5, 100, 0.00, 'INR', $1::jsonb, NOW())
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name, "maxUsers" = EXCLUDED."maxUsers", "maxAssets" = EXCLUDED."maxAssets",
        price = EXCLUDED.price, features = EXCLUDED.features
    `, [JSON.stringify({
        trialDays: 30, storage: '2GB', reports: 'basic', support: 'email',
        dashboard: 'basic', qrCode: false, apiAccess: false, customCategories: false
    })]);

    // Upsert Starter Plan
    await client.query(`
      INSERT INTO "Plans" (id, name, "maxUsers", "maxAssets", price, currency, features, "createdAt")
      VALUES ('starter', 'Starter', 25, 2500, 4999.00, 'INR', $1::jsonb, NOW())
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name, "maxUsers" = EXCLUDED."maxUsers", "maxAssets" = EXCLUDED."maxAssets",
        price = EXCLUDED.price, features = EXCLUDED.features
    `, [JSON.stringify({
        storage: '25GB', reports: 'standard', support: 'email',
        qrCode: true, emailNotifications: true, apiAccess: false, customCategories: false,
        yearlyPrice: 49999
    })]);

    // Upsert Professional Plan
    await client.query(`
      INSERT INTO "Plans" (id, name, "maxUsers", "maxAssets", price, currency, features, "createdAt")
      VALUES ('professional', 'Professional', 100, 25000, 14999.00, 'INR', $1::jsonb, NOW())
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name, "maxUsers" = EXCLUDED."maxUsers", "maxAssets" = EXCLUDED."maxAssets",
        price = EXCLUDED.price, features = EXCLUDED.features
    `, [JSON.stringify({
        storage: '100GB', reports: 'advanced', support: 'priority',
        qrCode: true, emailNotifications: true, apiAccess: true, customCategories: true,
        dynamicFields: true, auditLogs: true, roleManagement: true,
        yearlyPrice: 149999
    })]);

    // Upsert Enterprise Plan
    await client.query(`
      INSERT INTO "Plans" (id, name, "maxUsers", "maxAssets", price, currency, features, "createdAt")
      VALUES ('enterprise', 'Enterprise Plan', 999999, 999999, 0.00, 'INR', $1::jsonb, NOW())
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name, "maxUsers" = EXCLUDED."maxUsers", "maxAssets" = EXCLUDED."maxAssets",
        price = EXCLUDED.price, features = EXCLUDED.features
    `, [JSON.stringify({
        storage: 'Unlimited', reports: 'advanced', support: 'dedicated',
        qrCode: true, emailNotifications: true, apiAccess: true, customCategories: true,
        dynamicFields: true, auditLogs: true, roleManagement: true,
        sso: true, whiteLabeling: true, sla: true, multiBranch: true,
        customIntegrations: true, dedicatedDB: true, customPricing: true
    })]);

    await client.query('COMMIT');
    console.log('Plans updated successfully!');

    // Verify
    const result = await client.query('SELECT id, name, "maxUsers", "maxAssets", price FROM "Plans" ORDER BY price ASC');
    console.log('\nCurrent Plans:');
    result.rows.forEach(p => {
      const limit = p.maxUsers === 999999 ? 'Unlimited' : p.maxUsers;
      console.log(`  ${p.id}: ${p.name} - ₹${p.price}/mo | ${limit} users | ${p.maxAssets === 999999 ? 'Unlimited' : p.maxAssets} assets`);
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Failed to update plans:', err);
  } finally {
    client.release();
    pool.end();
  }
}

updatePlans();
