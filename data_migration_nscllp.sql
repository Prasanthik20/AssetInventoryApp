-- ==============================================================================
-- SAAS DATA MIGRATION SCRIPT
-- Objective: Migrate all legacy/unassigned data to the NSCLLP Tenant
-- Execution: Run inside a transaction to ensure rollback on failure
-- ==============================================================================

BEGIN;

-- 1. Create the NSCLLP Tenant if it doesn't exist
DO $$ 
DECLARE
    v_tenant_id TEXT := 'tenant-nscllp-001';
BEGIN
    IF NOT EXISTS (SELECT 1 FROM "Tenants" WHERE id = v_tenant_id) THEN
        INSERT INTO "Tenants" (id, name, "organizationType", "institutionId", "gstNumber", address, country, state, city, "postalCode", status, "createdAt", "updatedAt")
        VALUES (
            v_tenant_id, 
            'Naveen Survey and Constructions', 
            'Construction', 
            'NSCLLP', 
            '', 
            '', 
            'India', 
            '', 
            '', 
            '', 
            'active', 
            NOW(), 
            NOW()
        );
    END IF;

    -- 2. Create the Enterprise Subscription for NSCLLP
    IF NOT EXISTS (SELECT 1 FROM "Subscriptions" WHERE "tenantId" = v_tenant_id) THEN
        -- First ensure the Enterprise plan exists
        IF NOT EXISTS (SELECT 1 FROM "Plans" WHERE id = 'enterprise') THEN
            INSERT INTO "Plans" (id, name, "maxUsers", "maxAssets", price, currency, features, "createdAt")
            VALUES (
                'enterprise', 
                'Enterprise Plan', 
                999999, 
                999999, 
                0.00, 
                'INR', 
                '{"reports": "advanced", "apiAccess": true, "customCategories": true}'::jsonb, 
                NOW()
            );
        END IF;

        INSERT INTO "Subscriptions" (id, "tenantId", "planId", "startDate", "endDate", status, "createdAt", "updatedAt")
        VALUES (
            'sub-nscllp-enterprise',
            v_tenant_id,
            'enterprise',
            NOW(),
            NOW() + INTERVAL '10 years',
            'active',
            NOW(),
            NOW()
        );
    END IF;

    -- 3. Map Existing Legacy Users to NSCLLP
    -- Assume users without a tenantId are legacy users who belong to NSCLLP
    UPDATE "Users" 
    SET "tenantId" = v_tenant_id 
    WHERE "tenantId" IS NULL OR "tenantId" = '';

    -- 4. Map Existing Global Categories to NSCLLP
    UPDATE "Category" 
    SET "tenantId" = v_tenant_id,
        "isCustom" = false,
        "isSystemCategory" = true
    WHERE "tenantId" IS NULL OR "tenantId" = '';

    -- 5. Map Existing Assets to NSCLLP
    UPDATE "Asset_Details" 
    SET "tenantId" = v_tenant_id 
    WHERE "tenantId" IS NULL OR "tenantId" = '';

    -- 6. Map Asset Statuses to NSCLLP
    UPDATE "Status" 
    SET "tenantId" = v_tenant_id 
    WHERE "tenantId" IS NULL OR "tenantId" = '';

    -- 7. Map Asset Assignments to NSCLLP
    UPDATE "Asset_Assignments" 
    SET "tenantId" = v_tenant_id 
    WHERE "tenantId" IS NULL OR "tenantId" = '';

    -- 8. Map Notifications to NSCLLP
    UPDATE "Notifications" 
    SET "tenantId" = v_tenant_id 
    WHERE "tenantId" IS NULL OR "tenantId" = '';

END $$;

COMMIT;
