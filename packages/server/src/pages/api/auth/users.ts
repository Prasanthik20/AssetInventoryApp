import type { NextApiResponse } from 'next';
import query from '@/lib/db';
import { setCorsHeaders } from '@/lib/corsHeaders';
import { withAuth, AuthenticatedRequest } from '@/lib/apiHandler';

async function handler(req: AuthenticatedRequest, res: NextApiResponse): Promise<void> {
  const origin = req.headers.origin as string;
  setCorsHeaders(res, origin);

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET', 'OPTIONS']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
    return;
  }

  const { tenantId } = req.user;

  try {
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
      WHERE u."tenantId" = $1
      GROUP BY u."userId", r."roleName"
      ORDER BY u."userId" ASC;
    `;

    const result = await query(sqlQuery, [tenantId]);

    const users = result.rows.map((user: any) => ({
      userId: user.userId.toString(),
      employeeId: user.employeeId.toString(),
      fullName: user.fullName,
      email: user.email,
      phoneNumber: user.phoneNumber || null,
      address: user.address || null,
      photoURL: user.photoURL || null,
      role: {
        roleName: user.roleName || 'Unassigned'
      },
      assignedAssets: user.assignedassets || [],
    }));

    res.status(200).json({
      message: 'Users fetched successfully!',
      count: users.length,
      users,
    });
  } catch (error) {
    console.error('❌ Get All Users API Error:', error);
    res.status(500).json({
      message: 'An internal server error occurred while fetching users.',
    });
  }
}

export default withAuth(handler);