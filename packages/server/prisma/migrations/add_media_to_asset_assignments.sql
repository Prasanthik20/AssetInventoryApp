-- Migration: Add photoURL and barcodeURL columns to Asset_Assignments table
-- Description: Stores assignment-time and return-time media history per assignment row

ALTER TABLE "Asset_Assignments"
ADD COLUMN IF NOT EXISTS "photoURL" TEXT,
ADD COLUMN IF NOT EXISTS "barcodeURL" TEXT;

COMMENT ON COLUMN "Asset_Assignments"."photoURL" IS 'Photo URL/base64 captured during assignment or return for this assignment record';
COMMENT ON COLUMN "Asset_Assignments"."barcodeURL" IS 'Barcode URL/base64 captured during assignment or return for this assignment record';
