import type { NextApiResponse } from 'next';
import query from '@/lib/db';
import { withAuth, AuthenticatedRequest } from '@/lib/apiHandler';

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ message: `Method ${req.method} not allowed` });
  }

  const {
    actionType, // "CHECKOUT" or "RETURN"
    assetId,
    targetAssigneeId, // Employee ID of the operator/supervisor receiving the asset (for checkout)
    expectedReturnDate,
    projectName,
    location,
    notes,
    photoURL,
    barcodeURL
  } = req.body;

  const { tenantId, userId } = req.user;

  if (!actionType || !['CHECKOUT', 'RETURN', 'EXTENSION'].includes(actionType)) {
    return res.status(400).json({ message: 'actionType must be "CHECKOUT", "RETURN" or "EXTENSION"' });
  }

  if (!assetId) {
    return res.status(400).json({ message: 'assetId is required' });
  }

  try {
    // 1. Resolve requester employeeId and role
    const userResult = await query(
      `SELECT u."employeeId", u."fullName", r."roleName"
       FROM "Users" u
       LEFT JOIN "Roles" r ON u."roleId" = r."roleId"
       WHERE u."userId" = $1 LIMIT 1`,
      [userId]
    );
    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: 'Requester user not found' });
    }
    const requesterEmployeeId = Number(userResult.rows[0].employeeId);
    const requesterName = userResult.rows[0].fullName;
    const requesterRole = String(userResult.rows[0].roleName || '').toLowerCase();

    // Verify asset exists
    const assetCheck = await query('SELECT name, status_id FROM "Asset_Details" WHERE id = $1 LIMIT 1', [assetId]);
    if (assetCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Asset not found' });
    }

    const isTenantAdmin = ['tenant admin', 'admin', 'super admin', 'superadmin'].includes(requesterRole);

    // If EXTENSION request is submitted by Tenant Admin directly, it's auto-approved
    if (actionType === 'EXTENSION' && isTenantAdmin) {
      const payload = typeof req.body.payload === 'string'
        ? JSON.parse(req.body.payload)
        : req.body.payload || req.body;
      const daysToExtend = Math.max(1, parseInt(String(payload.extendedDays || req.body.daysToExtend || 5)) || 5);
      const assignmentId = payload.assignmentId || req.body.assignmentId;

      await query(
        `UPDATE "Asset_Assignments"
         SET expected_return_date = GREATEST(COALESCE(expected_return_date, CURRENT_DATE), CURRENT_DATE) + ($1 * INTERVAL '1 day'),
             status = 'assigned'
         WHERE id = $2`,
        [daysToExtend, assignmentId]
      );

      const statusRes = await query(`SELECT id FROM "Status" WHERE LOWER(status) = 'assigned' LIMIT 1`);
      if (statusRes.rows.length) {
        await query(
          `UPDATE "Asset_Details" SET status_id = $1 WHERE id = $2`,
          [statusRes.rows[0].id, assetId]
        );
      }

      if (payload.originalNotificationId || req.body.originalNotificationId) {
        await query(
          `UPDATE "Notifications" SET status = 'resolved' WHERE id = $1`,
          [payload.originalNotificationId || req.body.originalNotificationId]
        );
      }

      return res.status(200).json({
        status: 'APPROVED',
        message: 'Extension completed successfully (Auto-Approved by Tenant Admin).'
      });
    }

    // 2. Fetch active workflow config for this action type and tenant
    let workflowResult = await query(
      `SELECT id, name FROM "Approval_Workflows" 
       WHERE "tenantId" = $1 AND "actionType" = $2 AND "isActive" = true 
       LIMIT 1`,
      [tenantId, actionType]
    );

    let hasWorkflow = workflowResult.rows.length > 0;

    if (!hasWorkflow && actionType === 'EXTENSION') {
      // Find Tenant Admin role
      const adminRoleRes = await query(
        `SELECT "roleId" FROM "Roles" 
         WHERE ("tenantId" = $1 OR "tenantId" IS NULL) AND LOWER("roleName") IN ('tenant admin', 'admin') 
         LIMIT 1`,
        [tenantId]
      );
      const adminRoleId = adminRoleRes.rows[0]?.roleId;
      if (adminRoleId) {
        const insertWf = await query(
          `INSERT INTO "Approval_Workflows" ("tenantId", "name", "actionType", "isActive")
           VALUES ($1, 'Default Extension Workflow', 'EXTENSION', true)
           RETURNING id`,
          [tenantId]
        );
        const newWfId = insertWf.rows[0].id;
        await query(
          `INSERT INTO "Approval_Workflow_Steps" ("workflowId", "stepSequence", "approverRoleId")
           VALUES ($1, 1, $2)`,
          [newWfId, adminRoleId]
        );
        
        // Re-fetch workflow
        workflowResult = await query(
          `SELECT id, name FROM "Approval_Workflows" WHERE id = $1 LIMIT 1`,
          [newWfId]
        );
        hasWorkflow = true;
      }
    }

    if (!hasWorkflow) {
      // 3. Fallback: Auto-approve and perform action immediately
      console.log(`No active workflow for ${actionType}. Executing auto-approve fallback...`);
      
      if (actionType === 'CHECKOUT') {
        if (!targetAssigneeId) {
          return res.status(400).json({ message: 'targetAssigneeId is required for checkout' });
        }

        const statusRes = await query(`SELECT id FROM "Status" WHERE status = 'Assigned' LIMIT 1`);
        const statusId = statusRes.rows[0]?.id || 1;

        // Update Asset_Details
        await query(
          `UPDATE "Asset_Details"
           SET status_id = $1, assigned_by = $2, assigned_to = $3, location = $4, "photoURL" = COALESCE($5, "photoURL"), "barcodeURL" = COALESCE($6, "barcodeURL")
           WHERE id = $7`,
          [statusId, requesterEmployeeId, targetAssigneeId, location, photoURL || null, barcodeURL || null, assetId]
        );

        // Insert Asset_Assignments
        await query(
          `INSERT INTO "Asset_Assignments"
           ("assetId", "operator_employeeId", "supervisor_employeeId", "projectName", "location", "assigned_date", "expected_return_date", "notes", "photoURL", "barcodeURL", "status", "serialNoVerified", "createdAt", "tenantId")
           VALUES ($1, $2, $3, $4, $5, NOW(), $6, $7, $8, $9, 'assigned', true, NOW(), $10)`,
          [assetId, targetAssigneeId, requesterEmployeeId, projectName, location, expectedReturnDate || null, notes, photoURL || null, barcodeURL || null, tenantId]
        );

        return res.status(200).json({
          status: 'APPROVED',
          message: 'Checkout completed successfully (Auto-Approved).'
        });
      } else {
        // RETURN auto-approve
        const statusRes = await query(`SELECT id FROM "Status" WHERE status = 'Unassigned' LIMIT 1`);
        const statusId = statusRes.rows[0]?.id || 2;

        // Update Asset_Details
        await query(
          `UPDATE "Asset_Details"
           SET assigned_to = NULL, assigned_by = NULL, status_id = $1, "photoURL" = COALESCE($2, "photoURL"), "barcodeURL" = COALESCE($3, "barcodeURL")
           WHERE id = $4`,
          [statusId, photoURL || null, barcodeURL || null, assetId]
        );

        // Update last assignment status
        await query(
          `UPDATE "Asset_Assignments"
           SET status = 'returned', returned_date = NOW(), "photoURL" = COALESCE($1, "photoURL"), "barcodeURL" = COALESCE($2, "barcodeURL")
           WHERE id = (
             SELECT id FROM "Asset_Assignments"
             WHERE "assetId" = $3 AND status = 'assigned'
             ORDER BY id DESC LIMIT 1
           )`,
          [photoURL || null, barcodeURL || null, assetId]
        );

        return res.status(200).json({
          status: 'APPROVED',
          message: 'Return completed successfully (Auto-Approved).'
        });
      }
    }

    // 4. Workflow exists: Create Approval Request and Steps
    const workflow = workflowResult.rows[0];
    const workflowId = workflow.id;

    const requestPayload = actionType === 'EXTENSION'
      ? {
          assignmentId: req.body.assignmentId,
          extendedDays: req.body.extendedDays,
          originalNotificationId: req.body.originalNotificationId
        }
      : {
          targetAssigneeId,
          expectedReturnDate,
          projectName,
          location,
          notes,
          photoURL,
          barcodeURL
        };

    // Create the Request
    const requestInsert = await query(
      `INSERT INTO "Approval_Requests"
       ("tenantId", "assetId", "workflowId", "currentStepSequence", "status", "requestedById", "payload", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, 1, 'PENDING', $4, $5, NOW(), NOW())
       RETURNING id`,
      [
        tenantId,
        assetId,
        workflowId,
        requesterEmployeeId,
        JSON.stringify(requestPayload)
      ]
    );

    const requestId = requestInsert.rows[0].id;

    // Fetch workflow steps
    const stepsResult = await query(
      `SELECT "stepSequence", "approverRoleId" FROM "Approval_Workflow_Steps"
       WHERE "workflowId" = $1
       ORDER BY "stepSequence" ASC`,
      [workflowId]
    );

    if (stepsResult.rows.length === 0) {
      // Empty steps workflow -> Auto-approve
      await query(`UPDATE "Approval_Requests" SET status = 'APPROVED' WHERE id = $1`, [requestId]);
      return res.status(200).json({
        status: 'APPROVED',
        message: 'No steps configured for this workflow. Action Auto-Approved.'
      });
    }

    // Insert steps into Approval_Request_Steps
    for (const step of stepsResult.rows) {
      await query(
        `INSERT INTO "Approval_Request_Steps"
         ("requestId", "stepSequence", "approverRoleId", "status")
         VALUES ($1, $2, $3, 'PENDING')`,
        [requestId, step.stepSequence, step.approverRoleId]
      );
    }

    // 5. Notify the approvers of step 1
    const firstStep = stepsResult.rows[0];
    const approverRoleId = firstStep.approverRoleId;

    let approversResult = await query(
      `SELECT "employeeId" FROM "Users"
       WHERE "roleId" = $1 AND "tenantId" = $2`,
      [approverRoleId, tenantId]
    );

    if (approversResult.rows.length === 0) {
      approversResult = await query(
        `SELECT DISTINCT u."employeeId"
         FROM "Users" u
         LEFT JOIN "Role_Permissions" rp ON u."roleId" = rp."roleId"
         LEFT JOIN "Permissions" p ON rp."permissionId" = p.id
         WHERE u."tenantId" = $1 AND (
           p.code IN ('ASSIGN_ASSETS', 'CONFIRM_RETURN', 'MANAGE_WORKFLOWS', 'MANAGE_USERS')
         )`,
        [tenantId]
      );
    }

    const approverIds = approversResult.rows.map((r: any) => Number(r.employeeId));

    const notificationPayload = {
      kind: 'workflow_approval_pending',
      requestId: requestId.toString(),
      actionType,
      stepSequence: 1,
      message: `Pending ${actionType} approval step 1 for asset ${assetId}.`
    };

    for (const approverId of approverIds) {
      await query(
        `INSERT INTO "Notifications"
         ("assetId", "assignmentId", "senderId", "receiverId", "reason", "reply", "status", "created_at", "tenantId")
         VALUES ($1, NULL, $2, $3, $4, $5, 'unread', NOW(), $6)`,
        [
          assetId,
          requesterEmployeeId,
          approverId,
          `New ${actionType} approval request submitted by ${requesterName}.`,
          JSON.stringify(notificationPayload),
          tenantId
        ]
      );
    }

    return res.status(201).json({
      status: 'PENDING_APPROVAL',
      requestId: requestId.toString(),
      message: `Approval request submitted successfully. Requiring step 1 role approval.`
    });

  } catch (error: any) {
    console.error('Request approval error:', error);
    return res.status(500).json({ message: error.message || 'Internal server error' });
  }
}

export default withAuth(handler);
