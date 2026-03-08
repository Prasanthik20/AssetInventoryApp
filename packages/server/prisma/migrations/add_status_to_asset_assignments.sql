-- Add status tracking and returned_date to Asset_Assignments
-- This enables immutable audit trail: INSERT for new assignments, UPDATE only status/dates for returns

ALTER TABLE "Asset_Assignments"
ADD COLUMN IF NOT EXISTS "status" VARCHAR(20) DEFAULT 'assigned',
ADD COLUMN IF NOT EXISTS "returned_date" TIMESTAMP,
ADD COLUMN IF NOT EXISTS "serialNoVerified" BOOLEAN,
ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP DEFAULT NOW();

-- Create index on status for faster queries of 'assigned' records
CREATE INDEX IF NOT EXISTS "idx_asset_assignments_status" 
ON "Asset_Assignments"("status");

-- Create composite index for efficient lookup of current active assignment
CREATE INDEX IF NOT EXISTS "idx_asset_assignments_active" 
ON "Asset_Assignments"("operator_employeeId", "assetId", "status")
WHERE "status" = 'assigned';
