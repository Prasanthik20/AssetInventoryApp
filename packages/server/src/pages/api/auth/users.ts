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
      SELECT u.*, r."roleName", mgr."fullName" AS "managerName"
      FROM "Users" AS u
      LEFT JOIN "Roles" AS r ON u."roleId" = r."roleId"
      LEFT JOIN "Users" AS mgr ON mgr."employeeId" = u."reportingTo" AND (mgr."tenantId" = u."tenantId" OR u."tenantId" IS NULL)
      WHERE (u."tenantId" = $1 OR $1 IS NULL)
        AND (r."roleName" IS NULL OR LOWER(r."roleName") NOT IN ('super admin', 'superadmin'))
      ORDER BY u."userId" ASC;
    `;

    const result = await query(sqlQuery, [tenantId]);

    // Fetch assigned assets for users
    const assetsRes = await query(
      `SELECT id, name, "asset_Id" AS barcode, assigned_to
       FROM "Asset_Details"
       WHERE assigned_to IS NOT NULL AND ("tenantId" = $1 OR $1 IS NULL)`,
      [tenantId]
    );

    // Fetch role permissions
    const permissionsRes = await query(
      `SELECT rp."roleId", p.code
       FROM "Role_Permissions" rp
       JOIN "Permissions" p ON rp."permissionId" = p.id`
    );

    const permissionsByRole: Record<string, string[]> = {};
    permissionsRes.rows.forEach((row: any) => {
      const roleIdStr = String(row.roleId);
      if (!permissionsByRole[roleIdStr]) permissionsByRole[roleIdStr] = [];
      permissionsByRole[roleIdStr].push(row.code);
    });

    const assetsByUser: Record<string, any[]> = {};
    assetsRes.rows.forEach((row: any) => {
      const empIdStr = String(row.assigned_to);
      if (!assetsByUser[empIdStr]) assetsByUser[empIdStr] = [];
      assetsByUser[empIdStr].push({
        id: row.id,
        name: row.name,
        barcode: row.barcode
      });
    });

    const users = result.rows.map((user: any) => {
      const empIdStr = String(user.employeeId);
      const roleIdStr = user.roleId ? String(user.roleId) : '';

      return {
        userId: user.userId.toString(),
        employeeId: user.employeeId.toString(),
        fullName: user.fullName,
        email: user.email,
        phoneNumber: user.phoneNumber || null,
        address: user.address || null,
        photoURL: user.photoURL || null,
        roleId: user.roleId ? user.roleId.toString() : null,
        roleName: user.roleName || null,
        reportingTo: user.reportingTo ? user.reportingTo.toString() : null,
        managerName: user.managerName || null,
        designation: user.designation || null,
        status: user.status || 'active',
        isPrimaryContact: Boolean(user.isPrimaryContact),
        permissions: permissionsByRole[roleIdStr] || [],
        assignedAssets: assetsByUser[empIdStr] || []
      };
    });

    res.status(200).json(users);
  } catch (error: any) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'Failed to fetch users', details: String(error) });
  }
}

export default withAuth(handler);