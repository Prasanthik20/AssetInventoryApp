import type { NextApiResponse } from 'next';
import query from '@/lib/db';
import { withAuth, AuthenticatedRequest } from '@/lib/apiHandler';
import crypto from 'crypto';

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ message: `Method ${req.method} Not Allowed` });
  }

  const { tenantId } = req.user;
  if (!tenantId) {
    return res.status(400).json({ message: 'Tenant context is missing.' });
  }

  const { planId, transactionId, paymentProofUrl, remarks } = req.body;

  if (!planId) {
    return res.status(400).json({ message: 'Plan ID is required.' });
  }

  try {
    // 1. Verify that the requested plan actually exists
    const planRes = await query('SELECT * FROM "Plans" WHERE id = $1 LIMIT 1', [planId]);
    if (planRes.rows.length === 0) {
      return res.status(400).json({ message: 'The selected plan does not exist.' });
    }
    const plan = planRes.rows[0];

    const isEnterprise = parseFloat(plan.price) === -1.00;
    const finalTxId = isEnterprise ? (transactionId || `ENT-REQ-${crypto.randomBytes(4).toString('hex').toUpperCase()}`) : transactionId;
    const finalProofUrl = isEnterprise ? (paymentProofUrl || 'enterprise_request') : paymentProofUrl;

    if (!finalTxId || !finalProofUrl) {
      return res.status(400).json({
        message: 'Transaction reference ID and payment proof screenshot URL are required.'
      });
    }

    // 1b. Count current assets
    const assetsCountRes = await query(
      'SELECT COUNT(id) AS count FROM "Asset_Details" WHERE "tenantId" = $1',
      [tenantId]
    );
    const currentAssets = parseInt(assetsCountRes.rows[0]?.count || '0', 10);

    // 1c. Count current users (excluding disabled)
    const usersCountRes = await query(
      `SELECT COUNT("userId") AS count FROM "Users" WHERE "tenantId" = $1 AND status != 'disabled'`,
      [tenantId]
    );
    const currentUsers = parseInt(usersCountRes.rows[0]?.count || '0', 10);

    // 1d. Validate ranges
    const minAssets = plan.min_assets !== null && plan.min_assets !== undefined ? plan.min_assets : 1;
    const maxAssets = plan.maxAssets !== null && plan.maxAssets !== undefined ? plan.maxAssets : 999999;
    const minUsers = plan.min_users !== null && plan.min_users !== undefined ? plan.min_users : 1;
    const maxUsers = plan.maxUsers !== null && plan.maxUsers !== undefined ? plan.maxUsers : 999999;

    if (currentAssets < minAssets || currentAssets > maxAssets) {
      return res.status(400).json({
        message: `Your organization currently has ${currentAssets} assets, which does not fit in the range allowed for the "${plan.name}" plan (${minAssets} - ${maxAssets} assets). Please select the correct plan tier.`
      });
    }

    if (currentUsers < minUsers || currentUsers > maxUsers) {
      return res.status(400).json({
        message: `Your organization currently has ${currentUsers} active users, which does not fit in the range allowed for the "${plan.name}" plan (${minUsers} - ${maxUsers} users). Please select the correct plan tier.`
      });
    }

    // 2. Verify that transactionId is unique (to prevent double submissions)
    const existingReq = await query(
      'SELECT id FROM "RenewalRequests" WHERE "transactionId" = $1 LIMIT 1',
      [finalTxId]
    );
    if (existingReq.rows.length > 0 && !isEnterprise) {
      return res.status(409).json({
        message: 'This transaction reference ID has already been submitted.'
      });
    }

    // 3. Create the renewal request record
    const requestId = crypto.randomUUID();
    const sql = `
      INSERT INTO "RenewalRequests" (
        id, "tenantId", "planId", "requestedDate", "transactionId", 
        "paymentProofUrl", remarks, status, "createdAt", "updatedAt"
      ) VALUES ($1, $2, $3, NOW(), $4, $5, $6, 'submitted', NOW(), NOW())
      RETURNING id, status;
    `;
    const result = await query(sql, [
      requestId,
      tenantId,
      planId,
      finalTxId,
      finalProofUrl,
      remarks || null
    ]);

    return res.status(201).json({
      success: true,
      message: 'Renewal request submitted successfully. Super Admin will review your transaction shortly.',
      data: {
        requestId: result.rows[0].id,
        status: result.rows[0].status
      }
    });

  } catch (error) {
    console.error('Renewal API Error:', error);
    return res.status(500).json({ message: 'An internal server error occurred.' });
  }
}

export default withAuth(handler);
