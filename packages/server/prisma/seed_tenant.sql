-- 1. Create a Default Tenant
INSERT INTO "Tenants" ("id", "name", "organizationType", "status", "updatedAt")
VALUES ('default-tenant', 'Default Organization', 'Service Provider', 'active', NOW())
ON CONFLICT (id) DO NOTHING;

-- 2. Create a Trial Plan
INSERT INTO "Plans" ("id", "name", "maxUsers", "maxAssets", "price", "currency")
VALUES ('trial', 'Free Trial', 3, 25, 0, 'INR')
ON CONFLICT (id) DO NOTHING;

-- 3. Create a Subscription for the Default Tenant
INSERT INTO "Subscriptions" ("id", "tenantId", "planId", "status", "updatedAt")
VALUES ('default-sub', 'default-tenant', 'trial', 'active', NOW())
ON CONFLICT (id) DO NOTHING;

-- 4. Update existing records to the Default Tenant
UPDATE "Users" SET "tenantId" = 'default-tenant' WHERE "tenantId" IS NULL;
UPDATE "Asset_Details" SET "tenantId" = 'default-tenant' WHERE "tenantId" IS NULL;
UPDATE "Category" SET "tenantId" = 'default-tenant' WHERE "tenantId" IS NULL;
UPDATE "Status" SET "tenantId" = 'default-tenant' WHERE "tenantId" IS NULL;
UPDATE "Asset_Assignments" SET "tenantId" = 'default-tenant' WHERE "tenantId" IS NULL;
UPDATE "Notifications" SET "tenantId" = 'default-tenant' WHERE "tenantId" IS NULL;
