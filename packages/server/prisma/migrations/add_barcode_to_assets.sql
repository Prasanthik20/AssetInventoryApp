-- Migration: Add barcodeURL column to Asset_Details table
-- Date: 2026-03-06
-- Description: Adds a barcodeURL field to store asset barcode images

-- Add barcodeURL column to Asset_Details table
ALTER TABLE "Asset_Details" 
ADD COLUMN IF NOT EXISTS "barcodeURL" TEXT;

-- Add comment to the column
COMMENT ON COLUMN "Asset_Details"."barcodeURL" IS 'URL or base64 encoded string of the asset barcode image';
