import type { NextApiResponse } from 'next';
import query from '@/lib/db';
import { setCorsHeaders } from '@/lib/corsHeaders';
import { withAuth, AuthenticatedRequest } from '@/lib/apiHandler';

export default withAuth(async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  const origin = req.headers.origin as string;
  setCorsHeaders(res, origin);

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { tenantId } = req.user;
  const { id: assetId } = req.query;

  if (!tenantId) {
    return res.status(403).json({ message: 'Tenant context missing.' });
  }

  if (!assetId) {
    return res.status(400).json({ message: 'Asset ID is required.' });
  }

  // Ensure the asset belongs to the tenant
  try {
    const assetCheck = await query(
      `SELECT id FROM "Asset_Details" WHERE id = $1 AND "tenantId" = $2`,
      [assetId, tenantId]
    );

    if (assetCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Asset not found or access denied.' });
    }
  } catch (err) {
    return res.status(500).json({ error: 'Database validation failed' });
  }

  if (req.method === 'GET') {
    try {
      const sqlQuery = `
        SELECT adv.id, adv."fieldId", adv.value, acf."fieldName", acf."fieldType"
        FROM "AssetDynamicValues" adv
        INNER JOIN "AssetCategoryFields" acf ON adv."fieldId" = acf.id
        WHERE adv."assetId" = $1;
      `;
      const result = await query(sqlQuery, [assetId]);
      
      const values = result.rows.map(row => ({
        ...row,
        id: row.id.toString(),
        fieldId: row.fieldId.toString()
      }));

      return res.status(200).json({ values });
    } catch (error) {
      console.error("Dynamic Values API GET Error:", error);
      return res.status(500).json({ error: "Failed to fetch dynamic values" });
    }
  }

  if (req.method === 'PUT') {
    try {
      const { values } = req.body; // Expects an array: { fieldId: string, value: string }[]
      
      if (!Array.isArray(values)) {
        return res.status(400).json({ message: 'Values must be an array.' });
      }

      await query('BEGIN');

      for (const item of values) {
        if (!item.fieldId) continue;
        
        // Upsert logic
        const existing = await query(
          'SELECT id FROM "AssetDynamicValues" WHERE "assetId" = $1 AND "fieldId" = $2',
          [assetId, item.fieldId]
        );

        if (existing.rows.length > 0) {
          await query(
            'UPDATE "AssetDynamicValues" SET value = $1 WHERE "assetId" = $2 AND "fieldId" = $3',
            [item.value, assetId, item.fieldId]
          );
        } else {
          await query(
            'INSERT INTO "AssetDynamicValues" ("assetId", "fieldId", value) VALUES ($1, $2, $3)',
            [assetId, item.fieldId, item.value]
          );
        }
      }

      await query('COMMIT');
      return res.status(200).json({ message: 'Values updated successfully' });
    } catch (error) {
      await query('ROLLBACK');
      console.error("Dynamic Values API PUT Error:", error);
      return res.status(500).json({ error: "Failed to update dynamic values" });
    }
  }

  res.setHeader('Allow', ['GET', 'PUT', 'OPTIONS']);
  return res.status(405).end(`Method ${req.method} Not Allowed`);
});
