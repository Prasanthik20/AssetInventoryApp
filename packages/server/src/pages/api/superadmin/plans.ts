import type { NextApiResponse } from 'next';
import query from '@/lib/db';
import { withAuth, AuthenticatedRequest } from '@/lib/apiHandler';

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  // 1. Secure check: Only Super Admin can write or list plans via this admin endpoint
  if (req.user.role !== 'Super Admin') {
    return res.status(403).json({ message: 'Access denied. Super Admin privileges required.' });
  }

  // ==========================================
  // GET: Fetch all plans in the system
  // ==========================================
  if (req.method === 'GET') {
    try {
      const plansRes = await query('SELECT * FROM "Plans" ORDER BY price ASC');
      return res.status(200).json({ count: plansRes.rows.length, plans: plansRes.rows });
    } catch (error) {
      console.error('Super Admin Fetch Plans Error:', error);
      return res.status(500).json({ message: 'An internal server error occurred.' });
    }
  }

  // ==========================================
  // POST: Add or Update (Upsert) a plan package
  // ==========================================
  if (req.method === 'POST') {
    const { id, name, maxUsers, maxAssets, price, currency, features } = req.body;

    if (!id || !name || maxUsers === undefined || maxAssets === undefined || price === undefined) {
      return res.status(400).json({
        message: 'Plan Identifier (id), name, maximum users, maximum assets, and price are required.'
      });
    }

    try {
      const sql = `
        INSERT INTO "Plans" (id, name, "maxUsers", "maxAssets", price, currency, features, "createdAt")
        VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, NOW())
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          "maxUsers" = EXCLUDED."maxUsers",
          "maxAssets" = EXCLUDED."maxAssets",
          price = EXCLUDED.price,
          currency = EXCLUDED.currency,
          features = EXCLUDED.features
        RETURNING *;
      `;

      const values = [
        id.toLowerCase().trim().replace(/\s+/g, '-'), // enforce URL-safe ID format
        name.trim(),
        parseInt(maxUsers, 10),
        parseInt(maxAssets, 10),
        parseFloat(price),
        currency || 'INR',
        JSON.stringify(features || {})
      ];

      const result = await query(sql, values);

      return res.status(200).json({
        success: true,
        message: `Plan "${name}" has been successfully added/updated in the catalog.`,
        plan: result.rows[0]
      });

    } catch (error) {
      console.error('Super Admin Save Plan Error:', error);
      return res.status(500).json({ message: 'An internal server error occurred during plan saving.' });
    }
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).json({ message: `Method ${req.method} Not Allowed` });
}

export default withAuth(handler);
