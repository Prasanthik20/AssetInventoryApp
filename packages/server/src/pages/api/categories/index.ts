import type { NextApiRequest, NextApiResponse } from 'next';
import query from '@/lib/db';
import { setCorsHeaders } from '@/lib/corsHeaders';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Set CORS headers
  const origin = req.headers.origin as string;
  setCorsHeaders(res, origin);

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const sqlQuery = `
      SELECT 
    id, 
    category 
  FROM 
    "Category"
  ORDER BY 
    id ASC;
    `;

    const result = await query(sqlQuery, []); // empty array since no params
    return res.status(200).json({ categories: result.rows });
  } catch (error) {
    console.error("Category API Error:", error);
    return res.status(500).json({ error: "Failed to fetch categories" });
  }
}