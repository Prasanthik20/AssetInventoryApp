import type { NextApiResponse } from 'next';
import query from '@/lib/db';
import { withAuth, AuthenticatedRequest } from '@/lib/apiHandler';

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ message: `Method ${req.method} not allowed` });
  }

  const { requestId, action, notes, photoURL, barcodeURL } = req.body;
  const { tenantId, userId } = req.user;

  if (!requestId) {
    return res.status(400).json({ message: 'requestId is required' });
  }

  if (!action || !['approve', 'reject'].includes(action)) {
    return res.status(400).json({ message: 'action must be either "approve" or "reject"' });
  }

  try {
    // 1. Resolve actioner employeeId and role
    const userResult = await query(
      `SELECT u."employeeId", u."fullName", u."roleId"
       FROM "Users" u
       WHERE u."userId" = $1 LIMIT 1`,
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: 'Actioner user not found' });
    }

    const approverEmployeeId = Number(userResult.rows[0].employeeId);
    const approverName = userResult.rows[0].fullName;
    const approverRoleId = Number(userResult.rows[0].roleId);

    // 2. Fetch active approval request
    const requestResult = await query(
      `SELECT ar.id, ar."assetId", ar."workflowId", ar."currentStepSequence", ar.status, ar."requestedById", ar.payload, aw."actionType"
       FROM "Approval_Requests" ar
       LEFT JOIN "Approval_Workflows" aw ON ar."workflowId" = aw.id
       WHERE ar.id = $1 AND ar."tenantId" = $2 AND ar.status = 'PENDING'
       LIMIT 1`,
      [requestId, tenantId]
    );

    if (requestResult.rows.length === 0) {
      return res.status(404).json({ message: 'Pending approval request not found' });
    }

    const approvalRequest = requestResult.rows[0];
    const assetId = approvalRequest.assetId;
    const currentStepSequence = approvalRequest.currentStepSequence;
    const requestedById = approvalRequest.requestedById;
    const payload = typeof approvalRequest.payload === 'string' 
      ? JSON.parse(approvalRequest.payload) 
      : approvalRequest.payload;

    // 3. Verify user has authority for the current step sequence
    const stepResult = await query(
      `SELECT id, "approverRoleId" FROM "Approval_Request_Steps"
       WHERE "requestId" = $1 AND "stepSequence" = $2 AND status = 'PENDING'
       LIMIT 1`,
      [requestId, currentStepSequence]
    );

    if (stepResult.rows.length === 0) {
      return res.status(400).json({ message: 'Active step not found for this sequence' });
    }

    const activeStep = stepResult.rows[0];
    const stepApproverRoleId = Number(activeStep.approverRoleId);

    // The user's roleId must match the step's expected approverRoleId, or user must have admin/workflow privileges
    const userPermissionsRes = await query(
      `SELECT p.code 
       FROM "Role_Permissions" rp
       JOIN "Permissions" p ON rp."permissionId" = p.id
       WHERE rp."roleId" = $1`,
      [approverRoleId]
    );
    const userPermissionCodes = userPermissionsRes.rows.map((r: any) => r.code);
    const hasAdminPermission = userPermissionCodes.some((code: string) =>
      ['MANAGE_USERS', 'MANAGE_WORKFLOWS', 'CONFIRM_RETURN', 'ASSIGN_ASSETS'].includes(code)
    );

    const isRoleMatch = approverRoleId === stepApproverRoleId;
    const isPrivilegedRole = ['tenant admin', 'admin', 'super admin', 'superadmin'].includes(String(req.user.role || '').toLowerCase()) || hasAdminPermission;

    if (!isRoleMatch && !isPrivilegedRole) {
      return res.status(403).json({ message: 'Forbidden: You do not hold the required role to approve this step.' });
    }

    // 4. Handle REJECT action
    if (action === 'reject') {
      await query(
        `UPDATE "Approval_Request_Steps"
         SET status = 'REJECTED', "actionedById" = $1, "actionedAt" = NOW(), notes = $2
         WHERE id = $3`,
        [approverEmployeeId, notes || 'Rejected by approver', activeStep.id]
      );

      await query(
        `UPDATE "Approval_Requests"
         SET status = 'REJECTED', "updatedAt" = NOW()
         WHERE id = $1`,
        [requestId]
      );

      // Notify the requester
      const notificationPayload = {
        kind: 'workflow_approval_rejected',
        requestId: requestId.toString(),
        message: `Your approval request for asset ${assetId} has been rejected.`
      };

      await query(
        `INSERT INTO "Notifications"
         ("assetId", "assignmentId", "senderId", "receiverId", "reason", "reply", "status", "created_at", "tenantId")
         VALUES ($1, NULL, $2, $3, $4, $5, 'unread', NOW(), $6)`,
        [
          assetId,
          approverEmployeeId,
          requestedById,
          `Approval request for asset ${assetId} was rejected by ${approverName}.`,
          JSON.stringify(notificationPayload),
          tenantId
        ]
      );

      // Mark the parent notification as resolved
      await query(
        `UPDATE "Notifications"
         SET status = 'resolved'
         WHERE "assetId" = $1 AND status = 'unread'
           AND reply LIKE $2`,
        [assetId, `%\"requestId\":\"${requestId}\"%`]
      );

      return res.status(200).json({
        status: 'REJECTED',
        message: 'Approval request has been rejected successfully.'
      });
    }

    // 5. Handle APPROVE action
    const mediaURL = photoURL || barcodeURL || null;
    await query(
      `UPDATE "Approval_Request_Steps"
       SET status = 'APPROVED', "actionedById" = $1, "actionedAt" = NOW(), notes = $2, "mediaURL" = $3
       WHERE id = $4`,
      [approverEmployeeId, notes || 'Approved', mediaURL, activeStep.id]
    );

    // Check if there is a next step
    const nextStepResult = await query(
      `SELECT "stepSequence", "approverRoleId" FROM "Approval_Request_Steps"
       WHERE "requestId" = $1 AND "stepSequence" > $2
       ORDER BY "stepSequence" ASC LIMIT 1`,
      [requestId, currentStepSequence]
    );

    if (nextStepResult.rows.length > 0) {
      // Move to next step
      const nextStep = nextStepResult.rows[0];
      const nextSequence = nextStep.stepSequence;
      const nextRoleId = nextStep.approverRoleId;

      await query(
        `UPDATE "Approval_Requests"
         SET "currentStepSequence" = $1, "updatedAt" = NOW()
         WHERE id = $2`,
        [nextSequence, requestId]
      );

      // Resolve old unread notifications for this step
      await query(
        `UPDATE "Notifications"
         SET status = 'resolved'
         WHERE "assetId" = $1 AND status = 'unread'
           AND reply LIKE $2`,
        [assetId, `%\"requestId\":\"${requestId}\"%`]
      );

      let nextApproversResult = await query(
        `SELECT "employeeId" FROM "Users"
         WHERE "roleId" = $1 AND "tenantId" = $2`,
        [nextRoleId, tenantId]
      );

      if (nextApproversResult.rows.length === 0) {
        nextApproversResult = await query(
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

      const nextApproverIds = nextApproversResult.rows.map((r: any) => Number(r.employeeId));
      const nextNotificationPayload = {
        kind: 'workflow_approval_pending',
        requestId: requestId.toString(),
        actionType: approvalRequest.actionType,
        stepSequence: nextSequence,
        message: `Pending approval step ${nextSequence} for asset ${assetId}.`
      };

      for (const approverId of nextApproverIds) {
        await query(
          `INSERT INTO "Notifications"
           ("assetId", "assignmentId", "senderId", "receiverId", "reason", "reply", "status", "created_at", "tenantId")
           VALUES ($1, NULL, $2, $3, $4, $5, 'unread', NOW(), $6)`,
          [
            assetId,
            approverEmployeeId,
            approverId,
            `Next approval step ${nextSequence} for asset ${assetId}.`,
            JSON.stringify(nextNotificationPayload),
            tenantId
          ]
        );
      }

      return res.status(200).json({
        status: 'PENDING_NEXT_STEP',
        message: `Step ${currentStepSequence} approved. Request moved to step ${nextSequence}.`
      });

    } else {
      // 6. Final Step Approved: Execute database modifications based on checkout/return
      await query(
        `UPDATE "Approval_Requests"
         SET status = 'APPROVED', "updatedAt" = NOW()
         WHERE id = $1`,
        [requestId]
      );

      const actionType = approvalRequest.actionType;

      if (actionType === 'CHECKOUT') {
        const statusRes = await query(`SELECT id FROM "Status" WHERE status = 'Assigned' LIMIT 1`);
        const statusId = statusRes.rows[0]?.id || 1;

        // Update Asset_Details
        await query(
          `UPDATE "Asset_Details"
           SET status_id = $1, assigned_by = $2, assigned_to = $3, location = $4, "photoURL" = COALESCE($5, "photoURL"), "barcodeURL" = COALESCE($6, "barcodeURL")
           WHERE id = $7`,
          [
            statusId, 
            requestedById, 
            payload.targetAssigneeId, 
            payload.location, 
            payload.photoURL || null, 
            payload.barcodeURL || null, 
            assetId
          ]
        );

        // Insert Asset_Assignments
        await query(
          `INSERT INTO "Asset_Assignments"
           ("assetId", "operator_employeeId", "supervisor_employeeId", "projectName", "location", "assigned_date", "expected_return_date", "notes", "photoURL", "barcodeURL", "status", "serialNoVerified", "createdAt", "tenantId")
           VALUES ($1, $2, $3, $4, $5, NOW(), $6, $7, $8, $9, 'assigned', true, NOW(), $10)`,
          [
            assetId, 
            payload.targetAssigneeId, 
            requestedById, 
            payload.projectName, 
            payload.location, 
            payload.expectedReturnDate || null, 
            payload.notes, 
            payload.photoURL || null, 
            payload.barcodeURL || null, 
            tenantId
          ]
        );

      } else {
        // RETURN
        const statusRes = await query(`SELECT id FROM "Status" WHERE status = 'Unassigned' LIMIT 1`);
        const statusId = statusRes.rows[0]?.id || 2;

        // Update Asset_Details
        await query(
          `UPDATE "Asset_Details"
           SET assigned_to = NULL, assigned_by = NULL, status_id = $1, "photoURL" = COALESCE($2, "photoURL"), "barcodeURL" = COALESCE($3, "barcodeURL")
           WHERE id = $4`,
          [
            statusId, 
            payload.photoURL || photoURL || null, 
            payload.barcodeURL || barcodeURL || null, 
            assetId
          ]
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
          [
            payload.photoURL || photoURL || null, 
            payload.barcodeURL || barcodeURL || null, 
            assetId
          ]
        );
      }

      // Mark sibling pending request notifications as resolved
      await query(
        `UPDATE "Notifications"
         SET status = 'resolved'
         WHERE "assetId" = $1 AND status = 'unread'
           AND reply LIKE $2`,
        [assetId, `%\"requestId\":\"${requestId}\"%`]
      );

      // Notify the requester of final approval
      const completeNotificationPayload = {
        kind: 'workflow_approval_complete',
        requestId: requestId.toString(),
        message: `Your approval request for asset ${assetId} has been fully approved.`
      };

      await query(
        `INSERT INTO "Notifications"
         ("assetId", "assignmentId", "senderId", "receiverId", "reason", "reply", "status", "created_at", "tenantId")
         VALUES ($1, NULL, $2, $3, $4, $5, 'unread', NOW(), $6)`,
        [
          assetId,
          approverEmployeeId,
          requestedById,
          `${actionType} request for asset ${assetId} has been approved.`,
          JSON.stringify(completeNotificationPayload),
          tenantId
        ]
      );

      return res.status(200).json({
        status: 'APPROVED',
        message: 'Approval workflow completed. Asset transaction successfully executed.'
      });
    }

  } catch (error: any) {
    console.error('Action approval error:', error);
    return res.status(500).json({ message: error.message || 'Internal server error' });
  }
}

export default withAuth(handler);
