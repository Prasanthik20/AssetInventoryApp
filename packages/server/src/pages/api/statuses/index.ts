import type { NextApiRequest, NextApiResponse } from 'next';
import query from '@/lib/db'; // 👈 Import your raw query function
import corsHandler from '@/lib/cors'; // Import your CORS middleware

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Wrap the entire function in the CORS handler
  return corsHandler(req, res, async () => {
    // This endpoint should only handle GET requests
    if (req.method !== 'GET') {
      res.setHeader('Allow', ['GET']);
      return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    try {
      // Define the simple SQL query to get all statuses
      const sqlQuery = `
        SELECT 
          id, 
          status 
        FROM 
          "Status" 
        ORDER BY 
          id ASC;
      `;

      // Use the imported query function. Pass an empty array for parameters.
      const result = await query(sqlQuery, []);

       return res.status(200).json({ statuses: result.rows });

    } catch (error) {
      console.error('Get All Statuses API Error:', error);
      return res.status(500).json({ message: 'An internal server error occurred while fetching statuses.' });
    }
  });
}