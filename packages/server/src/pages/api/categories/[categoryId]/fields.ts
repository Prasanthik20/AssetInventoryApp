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
  const { categoryId } = req.query;

  if (!tenantId) {
    return res.status(403).json({ message: 'Tenant context missing.' });
  }

  if (!categoryId) {
    return res.status(400).json({ message: 'Category ID is required.' });
  }

  // Ensure the category belongs to the tenant OR is a system category
  try {
    const catCheck = await query(
      `SELECT "categoryId" FROM "Category" WHERE "categoryId" = $1 AND ("tenantId" = $2 OR "isSystemCategory" = true)`,
      [categoryId, tenantId]
    );

    if (catCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Category not found or access denied.' });
    }
  } catch (err) {
    return res.status(500).json({ error: 'Database validation failed' });
  }

  if (req.method === 'GET') {
    try {
      const sqlQuery = `
        SELECT id, "fieldName", "fieldType", "isRequired", "validationRules"
        FROM "AssetCategoryFields"
        WHERE "categoryId" = $1 AND ("tenantId" = $2 OR "tenantId" = 'tenant-nscllp-001' OR "tenantId" = 'default-tenant' OR "tenantId" = 'system')
        ORDER BY id ASC;
      `;
      const result = await query(sqlQuery, [categoryId, tenantId]);
      
      const fields = result.rows.map(row => ({
        ...row,
        id: row.id.toString(),
      }));

      return res.status(200).json({ fields });
    } catch (error) {
      console.error("Fields API GET Error:", error);
      return res.status(500).json({ error: "Failed to fetch category fields" });
    }
  }

  if (req.method === 'POST') {
    try {
      const { fieldName, fieldType, isRequired, validationRules } = req.body;
      
      if (!fieldName || !fieldType) {
        return res.status(400).json({ message: 'fieldName and fieldType are required.' });
      }

      const insertSql = `
        INSERT INTO "AssetCategoryFields" ("tenantId", "categoryId", "fieldName", "fieldType", "isRequired", "validationRules")
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *;
      `;
      const result = await query(insertSql, [tenantId, categoryId, fieldName, fieldType, isRequired || false, validationRules || null]);

      const newField = result.rows[0];
      return res.status(201).json({
        message: 'Field created successfully',
        field: {
          ...newField,
          id: newField.id.toString(),
          categoryId: newField.categoryId.toString()
        }
      });
    } catch (error) {
      console.error("Fields API POST Error:", error);
      return res.status(500).json({ error: "Failed to create field" });
    }
  }

  res.setHeader('Allow', ['GET', 'POST', 'OPTIONS']);
  return res.status(405).end(`Method ${req.method} Not Allowed`);
});
