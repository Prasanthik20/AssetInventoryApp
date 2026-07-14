const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

function loadEnv() {
  const envPath = path.resolve(__dirname, '.env');
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
}

loadEnv();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function run() {
  try {
    const res = await pool.query('SELECT * FROM "Asset_Details" WHERE id = 155');
    if (res.rows.length > 0) {
      const row = res.rows[0];
      console.log("Keys in database row:", Object.keys(row));
      console.log("Values:");
      console.log("id:", row.id);
      console.log("name:", row.name);
      console.log("price:", row.price);
      console.log("usefulLife / useful_life:", row.usefulLife, "/", row.useful_life);
      console.log("salvageValue / salvage_value:", row.salvageValue, "/", row.salvage_value);
      console.log("purchaseDate / purchase_date:", row.purchaseDate, "/", row.purchase_date);
    } else {
      console.log("Asset 155 not found in DB");
    }
  } catch (err) {
    console.error("DB Error:", err);
  } finally {
    pool.end();
  }
}

run();
