import type { NextApiRequest, NextApiResponse } from 'next';
import query from '@/lib/db';
import { setCorsHeaders } from '@/lib/corsHeaders';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '2gb',
    },
  },
};

type MediaPayload = {
  photoURL?: string;
  barcodeURL?: string;
};

const toNumber = (value: unknown): number | null => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const origin = req.headers.origin as string;
  setCorsHeaders(res, origin);

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const assetIdsRaw = Array.isArray(req.body?.assetIds) ? req.body.assetIds : [];
    const assetIds = assetIdsRaw
      .map((value: unknown) => toNumber(value))
      .filter((value: number | null): value is number => value !== null);

    const managerEmployeeId = toNumber(req.body?.managerEmployeeId || req.body?.supervisorEmployeeId);
    const assetMediaRaw = Array.isArray(req.body?.assetMedia) ? req.body.assetMedia : [];
    const assetMediaMap = new Map<number, MediaPayload>();

    for (const item of assetMediaRaw) {
      const assetId = toNumber(item?.assetId);
      if (!assetId) continue;
      assetMediaMap.set(assetId, {
        photoURL: typeof item?.photoURL === 'string' ? item.photoURL : undefined,
        barcodeURL: typeof item?.barcodeURL === 'string' ? item.barcodeURL : undefined,
      });
    }

    if (!managerEmployeeId) {
      return res.status(400).json({ message: 'managerEmployeeId is required' });
    }

    if (assetIds.length === 0) {
      return res.status(400).json({ message: 'No assets selected for return' });
    }

    const managerResult = await query(
      `SELECT "employeeId", "fullName", "tenantId"
       FROM "Users"
       WHERE "employeeId" = $1
       LIMIT 1`,
      [managerEmployeeId],
    );

    if (managerResult.rows.length === 0) {
      return res.status(404).json({ message: 'Manager not found' });
    }

    const managerName = String(managerResult.rows[0]?.fullName || managerEmployeeId);
    const tenantId = managerResult.rows[0]?.tenantId || null;

    let adminResult = await query(
      `SELECT DISTINCT u."employeeId"
       FROM "Users" u
       INNER JOIN "Role_Permissions" rp ON u."roleId" = rp."roleId"
       INNER JOIN "Permissions" p ON rp."permissionId" = p.id
       WHERE p.code IN ('MANAGE_USERS', 'MANAGE_WORKFLOWS')`,
      [],
    );

    if (adminResult.rows.length === 0) {
      adminResult = await query(
        `SELECT DISTINCT u."employeeId"
         FROM "Users" u
         INNER JOIN "Roles" r ON u."roleId" = r."roleId"
         WHERE LOWER(r."roleName") IN ('admin', 'super admin', 'superadmin', 'tenant admin', 'tenantadmin')`,
        [],
      );
    }

    const adminIds = adminResult.rows
      .map((row: { employeeId: unknown }) => Number(row.employeeId))
      .filter((id: number) => Number.isFinite(id));

    // Check for active RETURN workflow in the tenant
    const workflowResult = await query(
        `SELECT id, name FROM "Approval_Workflows" 
         WHERE "tenantId" = $1 AND "actionType" = 'RETURN' AND "isActive" = true 
         LIMIT 1`,
        [tenantId]
    );

    if (workflowResult.rows.length > 0) {
        const workflowId = workflowResult.rows[0].id;
        const workflowName = workflowResult.rows[0].name;

        for (const assetId of assetIds) {
            const media = assetMediaMap.get(assetId) || {};

            const ownershipCheck = await query(
                `SELECT id
                 FROM "Asset_Details"
                 WHERE id = $1
                   AND assigned_to = $2
                 LIMIT 1`,
                [assetId, managerEmployeeId],
            );

            if (ownershipCheck.rows.length === 0) {
                continue;
            }

            const pendingCheck = await query(
                `SELECT id FROM "Approval_Requests" 
                 WHERE "assetId" = $1 AND status = 'PENDING' LIMIT 1`,
                [assetId]
            );
            if (pendingCheck.rows.length > 0) {
                continue;
            }

            const requestInsert = await query(
                `INSERT INTO "Approval_Requests"
                 ("tenantId", "assetId", "workflowId", "currentStepSequence", "status", "requestedById", "payload", "createdAt", "updatedAt")
                 VALUES ($1, $2, $3, 1, 'PENDING', $4, $5, NOW(), NOW())
                 RETURNING id`,
                [
                    tenantId,
                    assetId,
                    workflowId,
                    managerEmployeeId,
                    JSON.stringify({
                        photoURL: media.photoURL || null,
                        barcodeURL: media.barcodeURL || null
                    })
                ]
            );

            const requestId = requestInsert.rows[0].id;

            const stepsResult = await query(
                `SELECT "stepSequence", "approverRoleId" FROM "Approval_Workflow_Steps"
                 WHERE "workflowId" = $1 ORDER BY "stepSequence" ASC`,
                [workflowId]
            );

            for (const step of stepsResult.rows) {
                await query(
                    `INSERT INTO "Approval_Request_Steps"
                     ("requestId", "stepSequence", "approverRoleId", "status")
                     VALUES ($1, $2, $3, 'PENDING')`,
                    [requestId, step.stepSequence, step.approverRoleId]
                );
            }

            const firstStep = stepsResult.rows[0];
            const firstRoleId = firstStep.approverRoleId;

            const approvers = await query(
                `SELECT "employeeId" FROM "Users" WHERE "roleId" = $1 AND "tenantId" = $2`,
                [firstRoleId, tenantId]
            );

            const approverIds = approvers.rows.map((r: any) => Number(r.employeeId));
            
            const notificationPayload = {
                kind: 'workflow_approval_pending',
                requestId: requestId.toString(),
                actionType: 'RETURN',
                stepSequence: 1,
                message: `Pending return approval step 1 for asset ${assetId}.`
            };

            for (const approverId of approverIds) {
                await query(
                    `INSERT INTO "Notifications"
                     ("assetId", "assignmentId", "senderId", "receiverId", "reason", "reply", "status", "created_at", "tenantId")
                     VALUES ($1, NULL, $2, $3, $4, $5, 'unread', NOW(), $6)`,
                    [
                        assetId,
                        managerEmployeeId,
                        approverId,
                        `New return approval request submitted by ${managerName}.`,
                        JSON.stringify(notificationPayload),
                        tenantId
                    ]
                );
            }
        }

        return res.status(200).json({
            message: `Return requests submitted for approval via workflow: ${workflowName}.`,
            pendingApproval: true
        });
    }

    for (const assetId of assetIds) {
      const media = assetMediaMap.get(assetId) || {};

      const ownershipCheck = await query(
        `SELECT id
         FROM "Asset_Details"
         WHERE id = $1
           AND assigned_to = $2
         LIMIT 1`,
        [assetId, managerEmployeeId],
      );

      if (ownershipCheck.rows.length === 0) {
        continue;
      }

      await query(
        `UPDATE "Asset_Details"
         SET "photoURL" = COALESCE($2, "photoURL"),
             "barcodeURL" = COALESCE($3, "barcodeURL")
         WHERE id = $1`,
        [assetId, media.photoURL ?? null, media.barcodeURL ?? null],
      );

      for (const adminId of adminIds) {
        const replyPayload = {
            kind: 'return_notification',
            message: `Return pending confirmation by admin.`,
            tenantId: tenantId,
            returnedDate: new Date().toISOString()
        };

        await query(
          `INSERT INTO "Notifications"
            ("assetId", "assignmentId", "senderId", "receiverId", "reason", "reply", "status", "created_at", "tenantId")
           VALUES ($1, NULL, $2, $3, $4, $5, 'unread', NOW(), $6)`,
          [
            assetId,
            managerEmployeeId,
            adminId,
            `Asset ${assetId} has been returned by manager ${managerName}.`,
            JSON.stringify(replyPayload),
            tenantId,
          ],
        );
      }
    }

    return res.status(200).json({
      message: 'Manager return submitted for admin confirmation',
    });
  } catch (error) {
    console.error('Manager return API error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
