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
  if (!tenantId) {
    return res.status(403).json({ message: 'Tenant context missing.' });
  }

  if (req.method === 'GET') {
    try {
      const sqlQuery = `
        SELECT id, "categoryId", category, "parentCategoryId", "isCustom", "isSystemCategory"
        FROM "Category"
        WHERE "tenantId" = $1 OR "tenantId" IS NULL OR "isSystemCategory" = 1
        ORDER BY id ASC;
      `;
      const result = await query(sqlQuery, [tenantId]);
      
      const categories = result.rows.map(row => ({
        ...row,
        id: row.id ? String(row.id) : '',
        categoryId: row.categoryId ? String(row.categoryId) : '',
        parentCategoryId: row.parentCategoryId ? String(row.parentCategoryId) : null
      }));

      return res.status(200).json({ categories });
    } catch (error: any) {
      console.error("Category API GET Error:", error);
      return res.status(500).json({ error: "Failed to fetch categories", details: String(error) });
    }
  }

  if (req.method === 'POST') {
    try {
      const { categoryName, parentCategoryId } = req.body;
      if (!categoryName) return res.status(400).json({ message: 'Category name is required' });

      // Generate a new categoryId
      const maxCatRes = await query('SELECT MAX("categoryId") as max_cid, MAX("id") as max_id FROM "Category"');
      const maxCidVal = maxCatRes.rows[0]?.max_cid;
      const maxIdVal = maxCatRes.rows[0]?.max_id;
      const nextCategoryId = maxCidVal ? BigInt(maxCidVal) + BigInt(1) : BigInt(1);
      const nextId = maxIdVal ? BigInt(maxIdVal) + BigInt(1) : BigInt(1);
      const serialNo = `CAT-${nextCategoryId}-${Date.now()}`;

      const insertSql = `
        INSERT INTO "Category" ("id", "categoryId", "tenantId", "category", "serial_no", "parentCategoryId", "isCustom", "isSystemCategory")
        OUTPUT INSERTED.*
        VALUES ($1, $2, $3, $4, $5, $6, 1, 0);
      `;
      const result = await query(insertSql, [nextId, nextCategoryId, tenantId, categoryName, serialNo, parentCategoryId || null]);

      const newCat = result.rows[0];
      return res.status(201).json({
        message: 'Category created successfully',
        category: {
          ...newCat,
          id: newCat?.id ? String(newCat.id) : '',
          categoryId: newCat?.categoryId ? String(newCat.categoryId) : '',
          parentCategoryId: newCat?.parentCategoryId ? String(newCat.parentCategoryId) : null
        }
      });
    } catch (error: any) {
      console.error("Category API POST Error:", error);
      return res.status(500).json({ error: "Failed to create category", details: String(error) });
    }
  }

  res.setHeader('Allow', ['GET', 'POST', 'OPTIONS']);
  return res.status(405).end(`Method ${req.method} Not Allowed`);
});