# Proposed Database Schema Changes (SaaS Multi-Tenancy)

These changes should be applied via a Prisma migration or raw SQL script.

## 1. New Tables

### Tenants Table
```sql
CREATE TABLE "Tenants" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "type" TEXT, -- e.g., 'Hospital', 'Corporate', 'Education'
    "institutionId" TEXT,
    "gstNumber" TEXT,
    "address" TEXT,
    "country" TEXT,
    "state" TEXT,
    "city" TEXT,
    "postalCode" TEXT,
    "status" TEXT DEFAULT 'active', -- active, suspended, deleted
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### Plans Table
```sql
CREATE TABLE "Plans" (
    "id" TEXT PRIMARY KEY, -- e.g., 'trial', 'starter', 'pro', 'enterprise'
    "name" TEXT NOT NULL,
    "maxUsers" INTEGER NOT NULL,
    "maxAssets" INTEGER NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "currency" TEXT DEFAULT 'INR',
    "features" JSONB,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### Subscriptions Table
```sql
CREATE TABLE "Subscriptions" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "tenantId" UUID NOT NULL REFERENCES "Tenants"("id"),
    "planId" TEXT NOT NULL REFERENCES "Plans"("id"),
    "startDate" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP WITH TIME ZONE,
    "status" TEXT DEFAULT 'trialing', -- trialing, active, past_due, canceled
    "paymentProvider" TEXT, -- 'stripe', 'razorpay'
    "providerSubscriptionId" TEXT,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

## 2. Updated Tables (Adding Tenant Isolation)

### Users Table
```sql
ALTER TABLE "Users" ADD COLUMN "tenantId" UUID REFERENCES "Tenants"("id");
ALTER TABLE "Users" ADD COLUMN "designation" TEXT;
ALTER TABLE "Users" ADD COLUMN "isPrimaryContact" BOOLEAN DEFAULT FALSE;
ALTER TABLE "Users" ADD COLUMN "status" TEXT DEFAULT 'active';
```

### Asset_Details Table
```sql
ALTER TABLE "Asset_Details" ADD COLUMN "tenantId" UUID REFERENCES "Tenants"("id");
```

### Asset_Assignments Table
```sql
ALTER TABLE "Asset_Assignments" ADD COLUMN "tenantId" UUID REFERENCES "Tenants"("id");
```

### Notifications Table
```sql
ALTER TABLE "Notifications" ADD COLUMN "tenantId" UUID REFERENCES "Tenants"("id");
```

### Category Table
```sql
ALTER TABLE "Category" ADD COLUMN "tenantId" UUID REFERENCES "Tenants"("id");
```

## 3. Migration Strategy

1.  **Preparation**: Create a "Default Tenant" for existing data to prevent FK violations.
2.  **Schema Update**: Run the `CREATE TABLE` and `ALTER TABLE` scripts.
3.  **Data Fixup**: Assign all existing users and assets to the Default Tenant.
4.  **Enforcement**: Make `tenantId` NOT NULL after data migration.
5.  **Indexing**: Add indexes on `tenantId` for all tables to ensure query performance.
    ```sql
    CREATE INDEX idx_users_tenant ON "Users"("tenantId");
    CREATE INDEX idx_assets_tenant ON "Asset_Details"("tenantId");
    ```
