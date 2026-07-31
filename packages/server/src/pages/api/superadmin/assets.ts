import type { NextApiResponse } from 'next';
import query from '@/lib/db';
import { withAuth, AuthenticatedRequest } from '@/lib/apiHandler';

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  // Secure check: Only Super Admin can access the platform assets
  if (req.user.role !== 'Super Admin') {
    return res.status(403).json({ message: 'Access denied. Super Admin privileges required.' });
  }

  if (req.method === 'GET') {
    try {
      const { tenantId, status } = req.query;

      const values: any[] = [];
      let whereClauses: string[] = [];

      if (tenantId && tenantId !== 'all') {
        values.push(tenantId);
        whereClauses.push(`a."tenantId" = $${values.length}`);
      }

      if (status && status !== 'all') {
        values.push(status);
        whereClauses.push(`st.status LIKE $${values.length}`);
      }

      // Auto-migration for useful_life and salvage_value
      try {
        await query(`
          IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Asset_Details' AND COLUMN_NAME = 'useful_life')
          BEGIN
              ALTER TABLE "Asset_Details" ADD "useful_life" INT DEFAULT 5;
          END
          
          IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Asset_Details' AND COLUMN_NAME = 'salvage_value')
          BEGIN
              ALTER TABLE "Asset_Details" ADD "salvage_value" VARCHAR(255);
          END
        `, []);
      } catch (err) {
        console.error('[AUTO-MIGRATION ERROR in superadmin assets]', err);
      }

      const whereSQL = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

      const sql = `
        SELECT TOP 1000
          a.id,
          a.name,
          a.serial_no AS "serialNo",
          a."asset_Id" AS "assetId",
          st.status,
          a.location,
          a.useful_life AS "usefulLife",
          a.salvage_value AS "salvageValue",
          t.name AS "tenantName"
        FROM 
          "Asset_Details" a
        JOIN 
          "Tenants" t ON a."tenantId" = t.id
        LEFT JOIN
          "Status" st ON a."status_id" = st.id
        ${whereSQL}
        ORDER BY a.id DESC;
      `;

      const result = await query(sql, values);
      return res.status(200).json({ count: result.rows.length, assets: result.rows });
    } catch (error) {
      console.error('Super Admin Fetch Assets Error:', error);
      return res.status(500).json({ message: 'An internal server error occurred.' });
    }
  }

  res.setHeader('Allow', ['GET']);
  return res.status(405).json({ message: `Method ${req.method} Not Allowed` });
}

export default withAuth(handler);
