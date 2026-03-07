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
  // Allow only GET
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET', 'OPTIONS']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const sqlQuery = `
      SELECT 
        id, 
        status 
      FROM 
        "Status"
      ORDER BY 
        id ASC;
    `;

    const result = await query(sqlQuery, []);

    return res.status(200).json({ statuses: result.rows });

  } catch (error) {
    console.error('Get All Statuses API Error:', error);
    return res.status(500).json({ message: 'Internal server error while fetching statuses.' });
  }
}
