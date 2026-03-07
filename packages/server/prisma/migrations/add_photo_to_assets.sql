-- Migration: Add photoURL column to Asset_Details table
-- Date: 2026-03-04
-- Description: Adds a photoURL field to store asset photos

-- Add photoURL column to Asset_Details table
ALTER TABLE "Asset_Details" 
ADD COLUMN IF NOT EXISTS "photoURL" TEXT;

-- Add comment to the column
COMMENT ON COLUMN "Asset_Details"."photoURL" IS 'URL or base64 encoded string of the asset photo';

-- Optional: Add index for faster queries if needed
-- CREATE INDEX IF NOT EXISTS idx_asset_details_photo ON "Asset_Details"("photoURL") WHERE "photoURL" IS NOT NULL;
