import { Pool } from 'pg';

// ✅ Create a PostgreSQL connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL, // Supabase connection URL
  ssl: { rejectUnauthorized: false }, // Required for Supabase
});

// ✅ Export a helper function to run queries easily
export default async function query(text: string, params?: any[]) {
  const client = await pool.connect();
  try {
    const result = await client.query(text, params);
    return result; // same structure as pool.query()
  } finally {
    client.release(); // always release connection back to pool
  }
}