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

  if (!planId || !transactionId || !paymentProofUrl) {
    return res.status(400).json({
      message: 'Plan ID, transaction/reference ID, and payment proof screenshot URL are required.'
    });
  }

  try {
    // 1. Verify that the requested plan actually exists
    const planRes = await query('SELECT id FROM "Plans" WHERE id = $1 LIMIT 1', [planId]);
    if (planRes.rows.length === 0) {
      return res.status(400).json({ message: 'The selected plan does not exist.' });
    }

    // 2. Verify that transactionId is unique (to prevent double submissions)
    const existingReq = await query(
      'SELECT id FROM "RenewalRequests" WHERE "transactionId" = $1 LIMIT 1',
      [transactionId]
    );
    if (existingReq.rows.length > 0) {
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
      transactionId,
      paymentProofUrl,
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
