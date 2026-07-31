const { Pool } = require('pg');
const path = require('path');
const fs = require('fs');

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

const connectionString = process.env.DATABASE_URL || process.env.DIRECT_URL;

const pool = new Pool({
  connectionString: connectionString,
  ssl: { rejectUnauthorized: false },
});

async function run() {
  try {
    console.log("Migration: Adding 'reportingTo' column to 'Users' table...");
    await pool.query(`
      ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "reportingTo" BIGINT;
    `);
    console.log("Column 'reportingTo' added or verified.");

    try {
      await pool.query(`
        ALTER TABLE "Users" 
        ADD CONSTRAINT "Users_reportingTo_fkey" 
        FOREIGN KEY ("reportingTo") REFERENCES "Users"("employeeId") 
        ON DELETE SET NULL ON UPDATE CASCADE;
      `);
      console.log("Constraint 'Users_reportingTo_fkey' added successfully.");
    } catch (err) {
      console.log("Constraint notice:", err.message);
    }

    const checkRes = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'Users' AND column_name = 'reportingTo';
    `);
    console.table(checkRes.rows);

  } catch (err) {
    console.error("Migration Error:", err);
  } finally {
    pool.end();
  }
}

run();
