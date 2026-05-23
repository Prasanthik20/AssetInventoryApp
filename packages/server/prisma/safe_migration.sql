-- 1. Create new tables
CREATE TABLE IF NOT EXISTS "Tenants" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "organizationType" TEXT,
    "institutionId" TEXT,
    "gstNumber" TEXT,
    "address" TEXT,
    "country" TEXT,
    "state" TEXT,
    "city" TEXT,
    "postalCode" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Tenants_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Plans" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "maxUsers" INTEGER NOT NULL,
    "maxAssets" INTEGER NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "features" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Plans_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Subscriptions" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'trialing',
    "paymentProvider" TEXT,
    "providerSubscriptionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Subscriptions_pkey" PRIMARY KEY ("id")
);

-- 2. Add columns to Users (using IF NOT EXISTS logic via subqueries or just error handling)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Users' AND column_name='tenantId') THEN
        ALTER TABLE "Users" ADD COLUMN "tenantId" TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Users' AND column_name='isPrimaryContact') THEN
        ALTER TABLE "Users" ADD COLUMN "isPrimaryContact" BOOLEAN DEFAULT false;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Users' AND column_name='designation') THEN
        ALTER TABLE "Users" ADD COLUMN "designation" TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Users' AND column_name='status') THEN
        ALTER TABLE "Users" ADD COLUMN "status" TEXT DEFAULT 'active';
    END IF;
END $$;

-- 3. Add tenantId to other tables
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Asset_Details' AND column_name='tenantId') THEN
        ALTER TABLE "Asset_Details" ADD COLUMN "tenantId" TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Category' AND column_name='tenantId') THEN
        ALTER TABLE "Category" ADD COLUMN "tenantId" TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Status' AND column_name='tenantId') THEN
        ALTER TABLE "Status" ADD COLUMN "tenantId" TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Asset_Assignments' AND column_name='tenantId') THEN
        ALTER TABLE "Asset_Assignments" ADD COLUMN "tenantId" TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Notifications' AND column_name='tenantId') THEN
        ALTER TABLE "Notifications" ADD COLUMN "tenantId" TEXT;
    END IF;
END $$;

-- 4. Add constraints (try/catch style)
DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE "Subscriptions" ADD CONSTRAINT "Subscriptions_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    EXCEPTION WHEN others THEN RAISE NOTICE 'Constraint Subscriptions_tenantId_fkey already exists or error.';
    END;
    
    BEGIN
        ALTER TABLE "Subscriptions" ADD CONSTRAINT "Subscriptions_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    EXCEPTION WHEN others THEN RAISE NOTICE 'Constraint Subscriptions_planId_fkey already exists or error.';
    END;

    BEGIN
        ALTER TABLE "Users" ADD CONSTRAINT "Users_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    EXCEPTION WHEN others THEN RAISE NOTICE 'Constraint Users_tenantId_fkey already exists or error.';
    END;

    BEGIN
        ALTER TABLE "Asset_Details" ADD CONSTRAINT "Asset_Details_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    EXCEPTION WHEN others THEN RAISE NOTICE 'Constraint Asset_Details_tenantId_fkey already exists or error.';
    END;

    BEGIN
        ALTER TABLE "Category" ADD CONSTRAINT "Category_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    EXCEPTION WHEN others THEN RAISE NOTICE 'Constraint Category_tenantId_fkey already exists or error.';
    END;

    BEGIN
        ALTER TABLE "Status" ADD CONSTRAINT "Status_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    EXCEPTION WHEN others THEN RAISE NOTICE 'Constraint Status_tenantId_fkey already exists or error.';
    END;

    BEGIN
        ALTER TABLE "Asset_Assignments" ADD CONSTRAINT "Asset_Assignments_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    EXCEPTION WHEN others THEN RAISE NOTICE 'Constraint Asset_Assignments_tenantId_fkey already exists or error.';
    END;

    BEGIN
        ALTER TABLE "Notifications" ADD CONSTRAINT "Notifications_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    EXCEPTION WHEN others THEN RAISE NOTICE 'Constraint Notifications_tenantId_fkey already exists or error.';
    END;
END $$;
