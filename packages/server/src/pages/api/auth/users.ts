import type { NextApiRequest, NextApiResponse } from 'next';
import query from '@/lib/db';
import { setCorsHeaders } from '@/lib/corsHeaders';
// import { withCors } from '@/lib/cors'; // Removed import: CORS is now handled by middleware.ts

/**
 * The core API logic for fetching all users.
 * The explicit `Promise<void>` return type is used for standard Next.js API handler compatibility.
 */
export default async function usersCoreHandler(req: NextApiRequest, res: NextApiResponse): Promise<void> {

  // Set CORS headers
  const origin = req.headers.origin as string;
  setCorsHeaders(res, origin);

  // Handle OPTIONS requests for CORS preflight
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET', 'OPTIONS']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
    return; // <-- Exit (return void)
  }

  try {
    // Corrected Query: Fetch all users and join with Roles to get the roleName
    const sqlQuery = `
   SELECT u.*, r."roleName",
         json_agg(
           json_build_object(
             'id', a.id,
             'name', a.name,
             'barcode', a."asset_Id"
           )
         ) FILTER (WHERE a.id IS NOT NULL) AS assignedAssets
  FROM "Users" AS u
  LEFT JOIN "Roles" AS r ON u."roleId" = r."roleId"
  LEFT JOIN "Asset_Details" AS a ON a."assigned_to" = u."employeeId"
  GROUP BY u."userId", r."roleName"
  ORDER BY u."userId" ASC;
`;

    const result = await query(sqlQuery, []);

    // Format result data
    const users = result.rows.map((user: any) => ({
      userId: user.userId,
      employeeId: user.employeeId,
      fullName: user.fullName,
      email: user.email,
      phoneNumber: user.phoneNumber || null,
      address: user.address || null,
      photoURL: user.photoURL || null,
      // Use the fetched roleName
      role: {                  // <--- FIXED
    roleName: user.roleName || 'Unassigned'
    },
    assignedAssets: user.assignedassets || [],
    }));

    res.status(200).json({
      message: 'Users fetched successfully!',
      count: users.length,
      users,
    });
    return; // <-- Exit (return void) after sending 200 response

  } catch (error) {
    console.error('❌ Get All Users API Error:', error);
    res.status(500).json({
      message: 'An internal server error occurred while fetching users.',
    });
    return; // <-- Exit (return void) after sending 500 response
  }
}