import type { NextApiResponse } from 'next';
import query from '@/lib/db';
import { setCorsHeaders } from '@/lib/corsHeaders';
import { withAuth, AuthenticatedRequest } from '@/lib/apiHandler';

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  const origin = req.headers.origin as string;
  setCorsHeaders(res, origin);

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  if (req.method !== "POST") return res.status(405).json({ message: "Method Not Allowed" });

  const { notificationId, daysToExtend: rawDays } = req.body;
  const daysToExtend = Math.max(1, parseInt(String(rawDays || 5)) || 5);

  if (!notificationId) {
    return res.status(400).json({ message: "notificationId is required" });
  }

  const { tenantId, userId, role } = req.user;

  try {
    // 1️⃣ Get assignment and asset info from the notification
    const notifRes: any = await query(
      `SELECT "assignmentId", "assetId", "senderId", "receiverId"
       FROM "Notifications"
       WHERE id = $1`,
      [notificationId]
    );

    if (!notifRes.rows.length) return res.status(404).json({ message: "Notification not found" });

    const { assignmentId, assetId, senderId: operatorId, receiverId: supervisorId } = notifRes.rows[0];

    // Resolve requester employeeId
    const userResult = await query(
      'SELECT "employeeId", "fullName" FROM "Users" WHERE "userId" = $1 LIMIT 1',
      [userId]
    );
    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: 'Requester user not found' });
    }
    const requesterEmployeeId = Number(userResult.rows[0].employeeId);
    const requesterName = userResult.rows[0].fullName;

    // Check if the requester is Tenant Admin or higher
    const isTenantAdmin = ['tenant admin', 'admin', 'super admin', 'superadmin'].includes(String(role || '').toLowerCase());

    if (isTenantAdmin) {
      // Direct extension (Auto-Approved)
      // Update expected return date in Asset_Assignments
      await query(
        `UPDATE "Asset_Assignments"
         SET expected_return_date = GREATEST(COALESCE(expected_return_date, CURRENT_DATE), CURRENT_DATE) + ($1 * INTERVAL '1 day'),
             status = 'assigned'
         WHERE id = $2 OR (id = (SELECT id FROM "Asset_Assignments" WHERE "assetId" = $3 AND COALESCE(status, '') <> 'returned' ORDER BY id DESC LIMIT 1))`,
        [daysToExtend, assignmentId, assetId]
      );

      // Update status in Asset_Details (set to 'Assigned')
      const statusRes: any = await query(
        `SELECT id FROM "Status" WHERE LOWER(status) = 'assigned' LIMIT 1`
      );

      if (statusRes.rows.length) {
        const assignedStatusId = statusRes.rows[0].id;
        await query(
          `UPDATE "Asset_Details" SET status_id = $1 WHERE id = $2`,
          [assignedStatusId, assetId]
        );
      }

      // Create notification for operator/employee confirming the extension
      const extensionMessage = `Asset return date extended by ${daysToExtend} day(s) by admin.`;
      await query(
        `INSERT INTO "Notifications" 
          ("assignmentId", "assetId", "senderId", "receiverId", "reason", "reply", "status", "created_at", "tenantId")
          VALUES ($1, $2, $3, $4, $5, $6, 'unread', NOW(), $7)`,
        [assignmentId, assetId, requesterEmployeeId, operatorId, 'Extension Approved', extensionMessage, tenantId]
      );

      // Mark original notification as resolved
      await query(
        `UPDATE "Notifications" SET status = 'resolved' WHERE id = $1`,
        [notificationId]
      );

      return res.status(200).json({
        message: `Return date extended by ${daysToExtend} day(s) (Auto-Approved).`,
        extensionMessage: `Return date extended by ${daysToExtend} day(s) (Auto-Approved).`
      });
    } else {
      // Must be approved by Tenant Admin -> Create an Approval Request

      // 1. Fetch or create the EXTENSION workflow for this tenant
      let workflowResult = await query(
        `SELECT id FROM "Approval_Workflows" 
         WHERE "tenantId" = $1 AND "actionType" = 'EXTENSION' AND "isActive" = true 
         LIMIT 1`,
        [tenantId]
      );

      let workflowId: any = null;

      if (workflowResult.rows.length > 0) {
        workflowId = workflowResult.rows[0].id;
      } else {
        // Find Tenant Admin role
        const adminRoleRes = await query(
          `SELECT "roleId" FROM "Roles" 
           WHERE ("tenantId" = $1 OR "tenantId" IS NULL) AND LOWER("roleName") IN ('tenant admin', 'admin') 
           LIMIT 1`,
          [tenantId]
        );
        const adminRoleId = adminRoleRes.rows[0]?.roleId;
        if (!adminRoleId) {
          return res.status(400).json({ message: "No Tenant Admin role configured to handle approvals." });
        }

        // Insert workflow
        const insertWf = await query(
          `INSERT INTO "Approval_Workflows" ("tenantId", "name", "actionType", "isActive")
           VALUES ($1, 'Default Extension Workflow', 'EXTENSION', true)
           RETURNING id`,
          [tenantId]
        );
        workflowId = insertWf.rows[0].id;

        // Insert step requiring Tenant Admin role
        await query(
          `INSERT INTO "Approval_Workflow_Steps" ("workflowId", "stepSequence", "approverRoleId")
           VALUES ($1, 1, $2)`,
          [workflowId, adminRoleId]
        );
      }

      // 2. Create the Approval Request
      const payload = {
        assignmentId,
        extendedDays: daysToExtend,
        originalNotificationId: notificationId
      };

      const requestInsert = await query(
        `INSERT INTO "Approval_Requests"
         ("tenantId", "assetId", "workflowId", "currentStepSequence", "status", "requestedById", "payload", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, 1, 'PENDING', $4, $5, NOW(), NOW())
         RETURNING id`,
        [tenantId, assetId, workflowId, requesterEmployeeId, JSON.stringify(payload)]
      );

      const requestId = requestInsert.rows[0].id;

      // 3. Create the Approval Request Steps
      // Fetch workflow steps
      const stepsResult = await query(
        `SELECT "stepSequence", "approverRoleId" FROM "Approval_Workflow_Steps"
         WHERE "workflowId" = $1
         ORDER BY "stepSequence" ASC`,
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

      // 4. Notify the Tenant Admin of this request
      const firstStep = stepsResult.rows[0];
      const approverRoleId = firstStep.approverRoleId;

      const approversResult = await query(
        `SELECT "employeeId" FROM "Users" WHERE "roleId" = $1 AND "tenantId" = $2`,
        [approverRoleId, tenantId]
      );

      const approverIds = approversResult.rows.map((r: any) => Number(r.employeeId));

      const notificationPayload = {
        kind: 'workflow_approval_pending',
        requestId: requestId.toString(),
        actionType: 'EXTENSION',
        stepSequence: 1,
        message: `Pending extension approval step 1 for asset ${assetId}.`
      };

      const requestNotificationReason = `New extension approval request submitted by ${requesterName}.`;
      for (const approverId of approverIds) {
        await query(
          `INSERT INTO "Notifications"
           ("assetId", "assignmentId", "senderId", "receiverId", "reason", "reply", "status", "created_at", "tenantId")
           VALUES ($1, NULL, $2, $3, $4, $5, 'unread', NOW(), $6)`,
          [
            assetId,
            requesterEmployeeId,
            approverId,
            requestNotificationReason,
            JSON.stringify(notificationPayload),
            tenantId
          ]
        );
      }

      // Mark original notification as resolved/replied in the UI context so it doesn't linger
      await query(
        `UPDATE "Notifications" SET status = 'resolved' WHERE id = $1`,
        [notificationId]
      );

      return res.status(200).json({
        message: `Extension request submitted to Tenant Admin for approval.`,
        extensionMessage: `Submitted to Tenant Admin for approval.`
      });
    }

  } catch (error: any) {
    console.error("Extend API Error:", error);
    return res.status(500).json({ message: error.message || "Failed to extend return date." });
  }
}

export default withAuth(handler);