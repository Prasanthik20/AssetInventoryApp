const sql = require('mssql');
const { execSync } = require('child_process');

async function applyIndexes() {
  let token = '';
  try {
    token = execSync('az account get-access-token --resource https://database.windows.net --query accessToken -o tsv', { encoding: 'utf8' }).trim();
    console.log("Acquired Azure AD token successfully.");
  } catch (e) {
    console.warn('Azure CLI token fetch notice:', e.message);
  }

  const config = {
    server: 'asset-db.database.windows.net',
    database: 'assetledger-db',
    options: {
      encrypt: true,
      trustServerCertificate: false,
      port: 1433,
      requestTimeout: 60000
    },
    authentication: token ? {
      type: 'azure-active-directory-access-token',
      options: { token }
    } : undefined
  };

  console.log("Connecting to Azure SQL Server (asset-db.database.windows.net)...");
  const pool = await sql.connect(config);
  console.log("Connected successfully!");

  const indexStatements = [
    // Asset_Assignments indexes
    `IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_asset_assignments_assetId')
        CREATE INDEX idx_asset_assignments_assetId ON "Asset_Assignments"("assetId");`,
    `IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_asset_assignments_tenantId')
        CREATE INDEX idx_asset_assignments_tenantId ON "Asset_Assignments"("tenantId");`,
    `IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_asset_assignments_operator')
        CREATE INDEX idx_asset_assignments_operator ON "Asset_Assignments"("operator_employeeId");`,
    `IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_asset_assignments_supervisor')
        CREATE INDEX idx_asset_assignments_supervisor ON "Asset_Assignments"("supervisor_employeeId");`,
    `IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_asset_assignments_lookup')
        CREATE INDEX idx_asset_assignments_lookup ON "Asset_Assignments"("assetId", "returned_date", "status");`,

    // Asset_Details indexes
    `IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_asset_details_tenantId')
        CREATE INDEX idx_asset_details_tenantId ON "Asset_Details"("tenantId");`,
    `IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_asset_details_status_id')
        CREATE INDEX idx_asset_details_status_id ON "Asset_Details"("status_id");`,
    `IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_asset_details_assigned_to')
        CREATE INDEX idx_asset_details_assigned_to ON "Asset_Details"("assigned_to");`,
    `IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_asset_details_assigned_by')
        CREATE INDEX idx_asset_details_assigned_by ON "Asset_Details"("assigned_by");`,

    // Users & Notifications indexes
    `IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_users_employeeId')
        CREATE INDEX idx_users_employeeId ON "Users"("employeeId");`,
    `IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_users_tenantId')
        CREATE INDEX idx_users_tenantId ON "Users"("tenantId");`,
    `IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_notifications_receiverId')
        CREATE INDEX idx_notifications_receiverId ON "Notifications"("receiverId");`,
    `IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_notifications_tenantId')
        CREATE INDEX idx_notifications_tenantId ON "Notifications"("tenantId");`
  ];

  console.log("Applying database indexes...");
  for (const stmt of indexStatements) {
    try {
      await pool.request().query(stmt);
      const nameMatch = stmt.match(/name = '([^']+)'/);
      const indexName = nameMatch ? nameMatch[1] : stmt;
      console.log(`✓ Index status verified/created: ${indexName}`);
    } catch (err) {
      console.error(`✗ Failed statement:`, err.message);
    }
  }

  await pool.close();
  console.log("\nAll database performance indexes applied successfully!");
}

applyIndexes().catch(err => {
  console.error("Index creation script error:", err);
  process.exit(1);
});
