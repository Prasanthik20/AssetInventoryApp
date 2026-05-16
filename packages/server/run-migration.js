const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL.replace('?pgbouncer=true', ''),
  ssl: { rejectUnauthorized: false }
});

async function runMigration() {
  const client = await pool.connect();
  try {
    console.log('Starting migration...');
    await client.query('BEGIN');

    // 1. ALTER Category table
    console.log('Altering Category table...');
    await client.query(`
      ALTER TABLE "Category" 
      ADD COLUMN IF NOT EXISTS "parentCategoryId" BIGINT,
      ADD COLUMN IF NOT EXISTS "isCustom" BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS "isSystemCategory" BOOLEAN DEFAULT false;
    `);

    // 2. CREATE AssetCategoryFields table
    console.log('Creating AssetCategoryFields table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS "AssetCategoryFields" (
        "id" BIGSERIAL PRIMARY KEY,
        "tenantId" TEXT NOT NULL,
        "categoryId" BIGINT NOT NULL,
        "fieldName" TEXT NOT NULL,
        "fieldType" TEXT NOT NULL,
        "isRequired" BOOLEAN DEFAULT false,
        "validationRules" TEXT,
        CONSTRAINT "AssetCategoryFields_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "AssetCategoryFields_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("categoryId") ON DELETE CASCADE ON UPDATE CASCADE
      );
    `);

    // 3. CREATE AssetDynamicValues table
    console.log('Creating AssetDynamicValues table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS "AssetDynamicValues" (
        "id" BIGSERIAL PRIMARY KEY,
        "assetId" BIGINT NOT NULL,
        "fieldId" BIGINT NOT NULL,
        "value" TEXT,
        CONSTRAINT "AssetDynamicValues_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset_Details"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "AssetDynamicValues_fieldId_fkey" FOREIGN KEY ("fieldId") REFERENCES "AssetCategoryFields"("id") ON DELETE CASCADE ON UPDATE CASCADE
      );
    `);

    // 4. Migrate Data to NSCLLP Tenant
    console.log('Migrating data to NSCLLP...');
    const v_tenant_id = 'tenant-nscllp-001';

    // Insert Tenant if not exists
    const tenantRes = await client.query('SELECT 1 FROM "Tenants" WHERE id = $1', [v_tenant_id]);
    if (tenantRes.rows.length === 0) {
      await client.query(`
        INSERT INTO "Tenants" (id, name, "organizationType", "institutionId", "gstNumber", address, country, state, city, "postalCode", status, "createdAt", "updatedAt")
        VALUES ($1, 'Naveen Survey and Constructions', 'Construction', 'NSCLLP', '', '', 'India', '', '', '', 'active', NOW(), NOW())
      `, [v_tenant_id]);
    }

    // Insert Enterprise Plan if not exists
    const planRes = await client.query('SELECT 1 FROM "Plans" WHERE id = $1', ['enterprise']);
    if (planRes.rows.length === 0) {
      await client.query(`
        INSERT INTO "Plans" (id, name, "maxUsers", "maxAssets", price, currency, features, "createdAt")
        VALUES ('enterprise', 'Enterprise Plan', 999999, 999999, 0.00, 'INR', $1::jsonb, NOW())
      `, [JSON.stringify({ reports: "advanced", apiAccess: true, customCategories: true })]);
    }

    // Insert Subscription if not exists
    const subRes = await client.query('SELECT 1 FROM "Subscriptions" WHERE "tenantId" = $1', [v_tenant_id]);
    if (subRes.rows.length === 0) {
      const endDate = new Date();
      endDate.setFullYear(endDate.getFullYear() + 10);
      await client.query(`
        INSERT INTO "Subscriptions" (id, "tenantId", "planId", "startDate", "endDate", status, "createdAt", "updatedAt")
        VALUES ('sub-nscllp-enterprise', $1, 'enterprise', NOW(), $2, 'active', NOW(), NOW())
      `, [v_tenant_id, endDate]);
    }

    // Map existing data to NSCLLP
    console.log('Mapping existing users...');
    await client.query(`UPDATE "Users" SET "tenantId" = $1 WHERE "tenantId" IS NULL OR "tenantId" = ''`, [v_tenant_id]);

    console.log('Mapping existing categories...');
    await client.query(`UPDATE "Category" SET "tenantId" = $1, "isCustom" = false, "isSystemCategory" = true WHERE "tenantId" IS NULL OR "tenantId" = ''`, [v_tenant_id]);

    console.log('Mapping existing assets...');
    await client.query(`UPDATE "Asset_Details" SET "tenantId" = $1 WHERE "tenantId" IS NULL OR "tenantId" = ''`, [v_tenant_id]);

    console.log('Mapping existing statuses...');
    await client.query(`UPDATE "Status" SET "tenantId" = $1 WHERE "tenantId" IS NULL OR "tenantId" = ''`, [v_tenant_id]);

    console.log('Mapping existing assignments...');
    await client.query(`UPDATE "Asset_Assignments" SET "tenantId" = $1 WHERE "tenantId" IS NULL OR "tenantId" = ''`, [v_tenant_id]);

    console.log('Mapping existing notifications...');
    await client.query(`UPDATE "Notifications" SET "tenantId" = $1 WHERE "tenantId" IS NULL OR "tenantId" = ''`, [v_tenant_id]);

    await client.query('COMMIT');
    console.log('Migration successfully completed!');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', error);
  } finally {
    client.release();
    pool.end();
  }
}

runMigration();
