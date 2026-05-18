const pg = require('pg');

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function run() {
  try {
    const tables = [
      { table: 'Category', idCol: 'id', seq: 'public."Category_id_seq"' },
      { table: 'Category_Details', idCol: 'id', seq: 'public."Category_Details_id_seq"' },
      { table: 'Status', idCol: 'id', seq: 'public."Status_id_seq"' },
      { table: 'Asset_Details', idCol: 'id', seq: 'public."Asset_Details_id_seq"' },
      { table: 'Asset_Assignments', idCol: 'id', seq: 'public."Asset_Assignments_id_seq"' },
      { table: 'Notifications', idCol: 'id', seq: 'public."Notifications_id_seq"' },
      { table: 'AssetCategoryFields', idCol: 'id', seq: 'public."AssetCategoryFields_id_seq"' },
      { table: 'AssetDynamicValues', idCol: 'id', seq: 'public."AssetDynamicValues_id_seq"' },
      { table: 'Users', idCol: 'userId', seq: 'public."Users_userId_seq"' },
      { table: 'Users', idCol: 'employeeId', seq: 'public."Users_employeeId_seq"' }
    ];

    for (const t of tables) {
      try {
        const maxRes = await pool.query(`SELECT MAX("${t.idCol}") as max_val FROM "${t.table}"`);
        const maxVal = maxRes.rows[0].max_val;
        console.log(`Table ${t.table} Column ${t.idCol}: MAX value is ${maxVal}`);
        if (maxVal !== null && maxVal !== undefined) {
          const setValRes = await pool.query(`SELECT setval('${t.seq}', ${maxVal})`);
          console.log(`  Successfully reset sequence ${t.seq} to ${maxVal}`);
        }
      } catch (err) {
        console.error(`  Error resetting sequence for ${t.table} (${t.idCol}):`, err.message);
      }
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}
run();
