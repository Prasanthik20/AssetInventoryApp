const { Pool } = require('pg');
const path = require('path');
const fs = require('fs');

// Load environment variables manually
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  const envConfig = fs.readFileSync(envPath, 'utf8');
  envConfig.split('\n').forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2) {
      const key = parts[0].trim();
      const value = parts.slice(1).join('=').trim().replace(/^['"]|['"]$/g, '');
      process.env[key] = value;
    }
  });
}

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
console.log("Connecting to:", connectionString ? connectionString.split('@')[1] : "undefined");

const pool = new Pool({
  connectionString: connectionString,
  ssl: { rejectUnauthorized: false },
});

async function run() {
  try {
    console.log("Step 1: Adding columns useful_life and salvage_value to Asset_Details if not exists...");
    await pool.query(`
      ALTER TABLE "Asset_Details" 
      ADD COLUMN IF NOT EXISTS "useful_life" INT DEFAULT 5,
      ADD COLUMN IF NOT EXISTS "salvage_value" VARCHAR(255);
    `);
    console.log("Schema updated successfully!");

    console.log("Step 2: Describing table 'Asset_Details' columns to verify...");
    const columnRes = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'Asset_Details'
      AND column_name IN ('useful_life', 'salvage_value', 'price', 'name');
    `);
    
    console.log("=== Columns Status ===");
    console.table(columnRes.rows);

  } catch (err) {
    console.error("Database Sync Error:", err);
  } finally {
    pool.end();
  }
}

run();
