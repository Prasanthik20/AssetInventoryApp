import type { NextApiResponse } from 'next';
import query from '@/lib/db';
import { withPermission } from '@/lib/apiHandler';

async function handler(req: any, res: NextApiResponse) {
  const { tenantId } = req.user;

  if (req.method === 'GET') {
    try {
      // 1. Get all roles for this tenant (or system default roles where tenantId IS NULL)
      const rolesResult = await query(
        `SELECT "roleId", "roleName", "tenantId" 
         FROM "Roles"
         WHERE ("tenantId" = $1 OR "tenantId" IS NULL)
           AND LOWER("roleName") NOT IN ('super admin', 'superadmin')
         ORDER BY "roleId" ASC`,
        [tenantId]
      );

      // 2. Fetch all role permission mappings for this tenant's roles
      const permissionsResult = await query(
        `SELECT rp."roleId", p.code, p.name 
         FROM "Role_Permissions" rp
         INNER JOIN "Permissions" p ON rp."permissionId" = p.id
         INNER JOIN "Roles" r ON rp."roleId" = r."roleId"
         WHERE (r."tenantId" = $1 OR r."tenantId" IS NULL)
           AND LOWER(r."roleName") NOT IN ('super admin', 'superadmin')`,
        [tenantId]
      );

      const allPermissionsResult = await query(
        `SELECT id, code, name FROM "Permissions" ORDER BY id ASC`
      );

      // Group permissions by roleId
      const permissionsByRole: Record<string, any[]> = {};
      permissionsResult.rows.forEach((row: any) => {
        if (!permissionsByRole[row.roleId]) {
          permissionsByRole[row.roleId] = [];
        }
        permissionsByRole[row.roleId].push({ code: row.code, name: row.name });
      });

      const roles = rolesResult.rows.map((row: any) => ({
        roleId: row.roleId.toString(),
        roleName: row.roleName,
        isSystem: row.tenantId === null,
        permissions: permissionsByRole[row.roleId] || []
      }));

      return res.status(200).json({
        roles,
        availablePermissions: allPermissionsResult.rows
      });
    } catch (error: any) {
      console.error('Fetch roles error:', error);
      return res.status(500).json({ message: error.message || 'Internal server error' });
    }
  }

  if (req.method === 'POST') {
    const { roleName, permissionCodes } = req.body;

    if (!roleName || !roleName.trim()) {
      return res.status(400).json({ message: 'roleName is required' });
    }

    try {
      // Create role scoped to tenant
      const roleInsert = await query(
        `INSERT INTO "Roles" ("roleName", "tenantId")
         VALUES ($1, $2)
         RETURNING "roleId", "roleName"`,
        [roleName.trim(), tenantId]
      );

      const newRole = roleInsert.rows[0];
      const newRoleId = newRole.roleId;

      if (Array.isArray(permissionCodes) && permissionCodes.length > 0) {
        // Insert permission mappings
        await query(
          `INSERT INTO "Role_Permissions" ("roleId", "permissionId")
           SELECT $1, id FROM "Permissions"
           WHERE code = ANY($2)`,
          [newRoleId, permissionCodes]
        );
      }

      return res.status(201).json({
        message: 'Role created successfully',
        roleId: newRoleId.toString(),
        roleName: newRole.roleName,
        permissions: permissionCodes || []
      });
    } catch (error: any) {
      console.error('Create role error:', error);
      return res.status(500).json({ message: error.message || 'Internal server error' });
    }
  }

  if (req.method === 'PUT') {
    const { roleId, roleName, permissionCodes } = req.body;

    if (!roleId) {
      return res.status(400).json({ message: 'roleId is required' });
    }

    try {
      // Verify role belongs to tenant (system roles are read-only)
      const roleCheck = await query(
        `SELECT "tenantId" FROM "Roles" WHERE "roleId" = $1 LIMIT 1`,
        [roleId]
      );

      if (roleCheck.rows.length === 0) {
        return res.status(404).json({ message: 'Role not found' });
      }

      if (roleCheck.rows[0].tenantId === null) {
        return res.status(403).json({ message: 'System default roles are read-only' });
      }

      if (roleCheck.rows[0].tenantId !== tenantId) {
        return res.status(403).json({ message: 'Forbidden' });
      }

      if (roleName && roleName.trim()) {
        await query(
          `UPDATE "Roles" SET "roleName" = $1 WHERE "roleId" = $2`,
          [roleName.trim(), roleId]
        );
      }

      if (Array.isArray(permissionCodes)) {
        // Drop existing permissions
        await query(
          `DELETE FROM "Role_Permissions" WHERE "roleId" = $1`,
          [roleId]
        );

        // Bind new ones
        if (permissionCodes.length > 0) {
          await query(
            `INSERT INTO "Role_Permissions" ("roleId", "permissionId")
             SELECT $1, id FROM "Permissions"
             WHERE code = ANY($2)`,
             [roleId, permissionCodes]
          );
        }
      }

      return res.status(200).json({ message: 'Role updated successfully' });
    } catch (error: any) {
      console.error('Update role error:', error);
      return res.status(500).json({ message: error.message || 'Internal server error' });
    }
  }

  res.setHeader('Allow', ['GET', 'POST', 'PUT']);
  return res.status(405).json({ message: `Method ${req.method} not allowed` });
}

export default withPermission('MANAGE_USERS', handler);
