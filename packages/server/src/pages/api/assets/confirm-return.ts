import type { NextApiRequest, NextApiResponse } from 'next';
import query from '@/lib/db';
import { setCorsHeaders } from '@/lib/corsHeaders';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const origin = req.headers.origin as string;
  setCorsHeaders(res, origin);

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST', 'OPTIONS']);
    return res.status(405).json({ message: `Method ${req.method} not allowed` });
  }

  try {
    const toValidEmployeeId = (value: unknown): number | null => {
      const parsed = Number(value);
      return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
    };

    const { notificationId, assignmentId, assetId, confirmedByEmployeeId } = req.body;

    const parsedNotificationId = Number(notificationId);
    const parsedAssignmentId = Number(assignmentId);
    const parsedAssetId = Number(assetId);
    const parsedConfirmedBy = Number(confirmedByEmployeeId);

    if (!Number.isFinite(parsedNotificationId) || !Number.isFinite(parsedConfirmedBy)) {
      return res.status(400).json({ message: 'notificationId and confirmedByEmployeeId are required' });
    }

    let resolvedAssetId: number | null = null;
    let resolvedOperatorEmployeeId: number | null = null;
    let resolvedSupervisorEmployeeId: number | null = null;
    const hasAssignmentId = Number.isFinite(parsedAssignmentId) && parsedAssignmentId > 0;

    if (hasAssignmentId) {
      const assignmentResult = await query(
        `SELECT id, "assetId", "operator_employeeId", "supervisor_employeeId", status
         FROM "Asset_Assignments"
         WHERE id = $1
         LIMIT 1`,
        [parsedAssignmentId],
      );

      if (assignmentResult.rows.length === 0) {
        return res.status(404).json({ message: 'Assignment not found' });
      }

      const assignment = assignmentResult.rows[0];
      resolvedAssetId = Number(assignment.assetId);
      resolvedOperatorEmployeeId = toValidEmployeeId(assignment.operator_employeeId);
      resolvedSupervisorEmployeeId = toValidEmployeeId(assignment.supervisor_employeeId);
    } else if (Number.isFinite(parsedAssetId) && parsedAssetId > 0) {
      resolvedAssetId = parsedAssetId;

      const assetResult = await query(
        `SELECT assigned_to
         FROM "Asset_Details"
         WHERE id = $1
         LIMIT 1`,
        [resolvedAssetId],
      );

      if (assetResult.rows.length === 0) {
        return res.status(404).json({ message: 'Asset not found' });
      }

      resolvedSupervisorEmployeeId = toValidEmployeeId(assetResult.rows[0]?.assigned_to);
    } else {
      // Fallback: derive context from notification when caller only provides notificationId.
      const notificationResult = await query(
        `SELECT "assetId", "assignmentId", "senderId", "receiverId"
         FROM "Notifications"
         WHERE id = $1
         LIMIT 1`,
        [parsedNotificationId],
      );

      if (notificationResult.rows.length === 0) {
        return res.status(404).json({ message: 'Notification not found' });
      }

      const notificationRow = notificationResult.rows[0];
      const fallbackAssetId = Number(notificationRow?.assetId);
      const fallbackAssignmentId = Number(notificationRow?.assignmentId);

      if (!Number.isFinite(fallbackAssetId) || fallbackAssetId <= 0) {
        return res.status(400).json({ message: 'Unable to resolve asset from notification' });
      }

      resolvedAssetId = fallbackAssetId;

      if (Number.isFinite(fallbackAssignmentId) && fallbackAssignmentId > 0) {
        const fallbackAssignmentResult = await query(
          `SELECT "operator_employeeId", "supervisor_employeeId"
           FROM "Asset_Assignments"
           WHERE id = $1
           LIMIT 1`,
          [fallbackAssignmentId],
        );

        if (fallbackAssignmentResult.rows.length > 0) {
          resolvedOperatorEmployeeId = toValidEmployeeId(fallbackAssignmentResult.rows[0]?.operator_employeeId);
          resolvedSupervisorEmployeeId = toValidEmployeeId(fallbackAssignmentResult.rows[0]?.supervisor_employeeId);
        }
      }

      if (!Number.isFinite(resolvedSupervisorEmployeeId)) {
        const assetResult = await query(
          `SELECT assigned_to
           FROM "Asset_Details"
           WHERE id = $1
           LIMIT 1`,
          [resolvedAssetId],
        );
        resolvedSupervisorEmployeeId = toValidEmployeeId(assetResult.rows[0]?.assigned_to);
      }
    }

    await query(
      `UPDATE "Asset_Details"
       SET assigned_to = NULL,
           assigned_by = NULL,
           status_id = (
             SELECT id FROM "Status" WHERE status ILIKE 'Unassigned' LIMIT 1
           )
       WHERE id = $1`,
      [resolvedAssetId],
    );

    await query(
      `UPDATE "Notifications"
       SET status = 'resolved',
           reply = COALESCE(reply, '') || CASE WHEN COALESCE(reply, '') = '' THEN '' ELSE E'\n' END || $2
       WHERE id = $1`,
      [parsedNotificationId, `Return confirmed by employee ${parsedConfirmedBy}.`],
    );

    // Resolve sibling pending return notifications so other dashboards
    // do not continue showing a stale "Confirm Return" action.
    await query(
      `UPDATE "Notifications"
       SET status = 'resolved'
       WHERE "assetId" = $1
         AND id <> $2
         AND COALESCE(status, '') <> 'resolved'
         AND (
           ($3::bigint IS NOT NULL AND "assignmentId" = $3)
           OR
           ($3::bigint IS NULL AND "assignmentId" IS NULL)
         )
         AND (
           LOWER(COALESCE(reason, '')) LIKE '%has been returned by%'
           OR LOWER(COALESCE(reply, '')) LIKE '%pending confirmation%'
         )`,
      [resolvedAssetId, parsedNotificationId, hasAssignmentId ? parsedAssignmentId : null],
    );

    let adminsResult = await query(
      `SELECT DISTINCT u."employeeId"
       FROM "Users" u
       INNER JOIN "Role_Permissions" rp ON u."roleId" = rp."roleId"
       INNER JOIN "Permissions" p ON rp."permissionId" = p.id
       WHERE p.code IN ('MANAGE_USERS', 'MANAGE_WORKFLOWS')`,
      [],
    );

    if (adminsResult.rows.length === 0) {
      adminsResult = await query(
        `SELECT DISTINCT u."employeeId"
         FROM "Users" u
         INNER JOIN "Roles" r ON u."roleId" = r."roleId"
         WHERE LOWER(r."roleName") IN ('admin', 'super admin', 'superadmin', 'tenant admin', 'tenantadmin')`,
        [],
      );
    }

    const adminIds = adminsResult.rows
      .map((row: { employeeId: unknown }) => toValidEmployeeId(row.employeeId))
      .filter((id: number | null): id is number => id !== null);

    const confirmerResult = await query(
      `SELECT "tenantId" FROM "Users" WHERE "employeeId" = $1 LIMIT 1`,
      [parsedConfirmedBy]
    );
    const tenantId = confirmerResult.rows[0]?.tenantId || null;

    const recipients = new Set<number>([
      ...adminIds,
      ...(resolvedSupervisorEmployeeId ? [resolvedSupervisorEmployeeId] : []),
      ...(resolvedOperatorEmployeeId ? [resolvedOperatorEmployeeId] : []),
    ]);

    for (const receiverId of recipients) {
      const replyPayload = {
        kind: 'return_notification',
        message: `Asset ${resolvedAssetId} is now unassigned after return confirmation.`,
        tenantId: tenantId,
        returnedDate: new Date().toISOString()
      };

      await query(
        `INSERT INTO "Notifications"
        ("assetId", "assignmentId", "senderId", "receiverId", "reason", "reply", "status", "created_at", "tenantId")
        VALUES ($1, $2, $3, $4, $5, $6, 'received', NOW(), $7)`,
        [
          resolvedAssetId,
          hasAssignmentId ? parsedAssignmentId : null,
          parsedConfirmedBy,
          receiverId,
          `Return confirmed for asset ${resolvedAssetId}.`,
          JSON.stringify(replyPayload),
          tenantId,
        ],
      );
    }

    return res.status(200).json({
      message: 'Return confirmed and asset moved to unassigned',
    });
  } catch (error) {
    console.error('Confirm return API error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
