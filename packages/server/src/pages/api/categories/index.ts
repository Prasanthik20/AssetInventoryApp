import type { NextApiRequest, NextApiResponse } from 'next';
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
        WHERE "tenantId" = $1 OR "tenantId" IS NULL OR "isSystemCategory" = true
        ORDER BY id ASC;
      `;
      const result = await query(sqlQuery, [tenantId]);
      
      // Convert BigInts to string for JSON serialization
      const categories = result.rows.map(row => ({
        ...row,
        id: row.id.toString(),
        categoryId: row.categoryId.toString(),
        parentCategoryId: row.parentCategoryId ? row.parentCategoryId.toString() : null
      }));

      return res.status(200).json({ categories });
    } catch (error) {
      console.error("Category API GET Error:", error);
      return res.status(500).json({ error: "Failed to fetch categories" });
    }
  }

  if (req.method === 'POST') {
    try {
      const { categoryName, parentCategoryId } = req.body;
      if (!categoryName) return res.status(400).json({ message: 'Category name is required' });

      // Generate a new categoryId
      const maxCatRes = await query('SELECT MAX("categoryId") as max_id FROM "Category"');
      const nextCategoryId = maxCatRes.rows[0].max_id ? BigInt(maxCatRes.rows[0].max_id) + BigInt(1) : BigInt(1);
      const serialNo = `CAT-${nextCategoryId}-${Date.now()}`;

      const insertSql = `
        INSERT INTO "Category" ("categoryId", "tenantId", "category", "serial_no", "parentCategoryId", "isCustom", "isSystemCategory")
        VALUES ($1, $2, $3, $4, $5, true, false)
        RETURNING *;
      `;
      const result = await query(insertSql, [nextCategoryId, tenantId, categoryName, serialNo, parentCategoryId || null]);

      const newCat = result.rows[0];
      return res.status(201).json({
        message: 'Category created successfully',
        category: {
          ...newCat,
          id: newCat.id.toString(),
          categoryId: newCat.categoryId.toString(),
          parentCategoryId: newCat.parentCategoryId ? newCat.parentCategoryId.toString() : null
        }
      });
    } catch (error) {
      console.error("Category API POST Error:", error);
      return res.status(500).json({ error: "Failed to create category" });
    }
  }

  res.setHeader('Allow', ['GET', 'POST', 'OPTIONS']);
  return res.status(405).end(`Method ${req.method} Not Allowed`);
});