import type { NextApiResponse } from 'next';
import query from '@/lib/db';
import { withPermission } from '@/lib/apiHandler';

async function handler(req: any, res: NextApiResponse) {
  const { tenantId } = req.user;

  if (!tenantId) {
    return res.status(403).json({ message: 'Tenant context missing.' });
  }

  if (req.method === 'GET') {
    try {
      // 1. Fetch workflows
      const workflowsResult = await query(
        `SELECT id, name, "actionType", "isActive"
         FROM "Approval_Workflows"
         WHERE "tenantId" = $1
         ORDER BY id ASC`,
        [tenantId]
      );

      // 2. Fetch steps
      const stepsResult = await query(
        `SELECT aws.id, aws."workflowId", aws."stepSequence", aws."approverRoleId", r."roleName"
         FROM "Approval_Workflow_Steps" aws
         LEFT JOIN "Roles" r ON aws."approverRoleId" = r."roleId"
         INNER JOIN "Approval_Workflows" aw ON aws."workflowId" = aw.id
         WHERE aw."tenantId" = $1
         ORDER BY aws."workflowId" ASC, aws."stepSequence" ASC`,
        [tenantId]
      );

      // Group steps by workflowId
      const stepsByWorkflow: Record<string, any[]> = {};
      stepsResult.rows.forEach((row: any) => {
        const wId = row.workflowId ? String(row.workflowId) : '';
        if (!stepsByWorkflow[wId]) {
          stepsByWorkflow[wId] = [];
        }
        stepsByWorkflow[wId].push({
          stepId: row.id ? String(row.id) : '',
          stepSequence: Number(row.stepSequence),
          approverRoleId: row.approverRoleId ? String(row.approverRoleId) : '',
          approverRoleName: row.roleName || 'Unknown Role'
        });
      });

      const workflows = workflowsResult.rows.map((row: any) => {
        const idStr = row.id ? String(row.id) : '';
        return {
          workflowId: idStr,
          name: row.name,
          actionType: row.actionType,
          isActive: Boolean(row.isActive),
          steps: stepsByWorkflow[idStr] || []
        };
      });

      return res.status(200).json({ workflows });
    } catch (error: any) {
      console.error('Fetch workflows error:', error);
      return res.status(500).json({ message: error.message || 'Internal server error' });
    }
  }

  if (req.method === 'POST') {
    const { name, actionType, isActive, steps } = req.body;

    if (!name || !actionType || !['CHECKOUT', 'RETURN'].includes(actionType)) {
      return res.status(400).json({ message: 'name and actionType ("CHECKOUT" or "RETURN") are required' });
    }

    if (!Array.isArray(steps)) {
      return res.status(400).json({ message: 'steps must be an array of roles' });
    }

    try {
      await query('BEGIN');

      // 1. Create or update the workflow config (UPSERT style based on actionType)
      const existingCheck = await query(
        `SELECT TOP 1 id FROM "Approval_Workflows" 
         WHERE "tenantId" = $1 AND "actionType" = $2`,
        [tenantId, actionType]
      );

      let workflowId: bigint;

      if (existingCheck.rows.length > 0) {
        workflowId = BigInt(existingCheck.rows[0].id.toString());
        await query(
          `UPDATE "Approval_Workflows"
           SET name = $1, "isActive" = $2
           WHERE id = $3`,
          [name, isActive !== false, workflowId]
        );
      } else {
        const maxWfRes = await query(`SELECT COALESCE(MAX(id), 0) + 1 AS next_id FROM "Approval_Workflows"`, []);
        const nextWorkflowId = BigInt(maxWfRes.rows[0]?.next_id || 1);

        const insertResult = await query(
          `INSERT INTO "Approval_Workflows" (id, "tenantId", name, "actionType", "isActive")
           OUTPUT INSERTED.id
           VALUES ($1, $2, $3, $4, $5)`,
          [nextWorkflowId, tenantId, name, actionType, isActive !== false]
        );
        if (!insertResult.rows.length) {
          workflowId = nextWorkflowId;
        } else {
          workflowId = BigInt(insertResult.rows[0].id.toString());
        }
      }

      // 2. Refresh workflow steps (Delete and Reinsert)
      await query(
        `DELETE FROM "Approval_Workflow_Steps"
         WHERE "workflowId" = $1`,
        [workflowId]
      );

      // Insert new steps
      for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        const stepSequence = step.stepSequence || (i + 1);
        const approverRoleId = step.approverRoleId;

        if (!approverRoleId) {
          throw new Error(`approverRoleId is required for step ${i + 1}`);
        }

        const maxStepRes = await query(`SELECT COALESCE(MAX(id), 0) + 1 AS next_id FROM "Approval_Workflow_Steps"`, []);
        const nextStepId = BigInt(maxStepRes.rows[0]?.next_id || 1);

        await query(
          `INSERT INTO "Approval_Workflow_Steps" (id, "workflowId", "stepSequence", "approverRoleId")
           VALUES ($1, $2, $3, $4)`,
          [nextStepId, workflowId, parseInt(String(stepSequence), 10), BigInt(String(approverRoleId))]
        );
      }

      await query('COMMIT');

      return res.status(200).json({
        message: 'Workflow configuration updated successfully',
        workflowId: workflowId.toString()
      });

    } catch (error: any) {
      try { await query('ROLLBACK'); } catch (_) {}
      console.error('Save workflow error:', error);
      return res.status(500).json({ message: error.message || 'Internal server error' });
    }
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).json({ message: `Method ${req.method} not allowed` });
}

export default withPermission('MANAGE_WORKFLOWS', handler);
