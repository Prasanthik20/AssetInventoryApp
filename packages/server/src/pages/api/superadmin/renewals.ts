import type { NextApiResponse } from 'next';
import query, { pool } from '@/lib/db';
import { withAuth, AuthenticatedRequest } from '@/lib/apiHandler';
import crypto from 'crypto';

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  // 1. Secure check: Only Super Admin can access renewals
  if (req.user.role !== 'Super Admin') {
    return res.status(403).json({ message: 'Access denied. Super Admin privileges required.' });
  }

  // ==========================================
  // GET: Retrieve all renewal requests
  // ==========================================
  if (req.method === 'GET') {
    try {
      const sql = `
        SELECT 
          r.id,
          r."tenantId",
          r."planId",
          r."requestedDate",
          r."transactionId",
          r."paymentProofUrl",
          r.remarks,
          r.status,
          r."rejectionReason",
          t.name AS "companyName",
          p.name AS "planName",
          p.price AS "planPrice",
          p.currency AS "planCurrency"
        FROM 
          "RenewalRequests" r
        JOIN 
          "Tenants" t ON r."tenantId" = t.id
        JOIN 
          "Plans" p ON r."planId" = p.id
        ORDER BY 
          r."requestedDate" DESC;
      `;
      const result = await query(sql);
      return res.status(200).json({ count: result.rows.length, renewals: result.rows });
    } catch (error) {
      console.error('Super Admin Fetch Renewals Error:', error);
      return res.status(500).json({ message: 'An internal server error occurred.' });
    }
  }

  // ==========================================
  // POST: Approve or Reject a Renewal Request
  // ==========================================
  if (req.method === 'POST') {
    const { requestId, action, rejectionReason } = req.body;

    if (!requestId || !action) {
      return res.status(400).json({ message: 'Request ID and action (approve/reject) are required.' });
    }

    if (action === 'reject' && !rejectionReason?.trim()) {
      return res.status(400).json({ message: 'A rejection reason is required for rejection action.' });
    }

    let client;
    try {
      client = await pool.connect();
      await client.query('BEGIN');

      // 1. Fetch and Lock request for update
      const reqRes = await client.query(
        'SELECT * FROM "RenewalRequests" WHERE id = $1 FOR UPDATE',
        [requestId]
      );
      if (reqRes.rows.length === 0) {
        client.release();
        return res.status(404).json({ message: 'Renewal request not found.' });
      }

      const request = reqRes.rows[0];
      if (request.status !== 'submitted' && request.status !== 'reviewing') {
        client.release();
        return res.status(400).json({
          message: `This request cannot be modified. Current status: ${request.status}`
        });
      }

      const reviewerId = req.user.userId;

      if (action === 'reject') {
        // Update request to rejected
        await client.query(
          `UPDATE "RenewalRequests" 
           SET status = 'rejected', "rejectionReason" = $1, "reviewedBy" = $2, "reviewedAt" = NOW(), "updatedAt" = NOW()
           WHERE id = $3`,
          [rejectionReason, reviewerId, requestId]
        );

        await client.query('COMMIT');
        return res.status(200).json({ success: true, message: 'Renewal request rejected successfully.' });
      }

      if (action === 'approve') {
        // A. Resolve plan pricing and metadata
        const planRes = await client.query('SELECT * FROM "Plans" WHERE id = $1 LIMIT 1', [request.planId]);
        if (planRes.rows.length === 0) {
          await client.query('ROLLBACK');
          return res.status(400).json({ message: 'Plan details not found.' });
        }
        const plan = planRes.rows[0];

        // B. Update request status to approved
        await client.query(
          `UPDATE "RenewalRequests" 
           SET status = 'approved', "reviewedBy" = $1, "reviewedAt" = NOW(), "updatedAt" = NOW()
           WHERE id = $2`,
          [reviewerId, requestId]
        );

        // C. Calculate expiration date (standard 1-year extension)
        const validityDays = request.planId === 'free-trial' ? 30 : 365;
        const newEndDate = new Date(Date.now() + validityDays * 24 * 60 * 60 * 1000);

        // D. Create / Update Subscription record
        const newSubId = crypto.randomUUID();
        await client.query(
          `INSERT INTO "Subscriptions" (
             id, "tenantId", "planId", "startDate", "endDate", status, "createdAt", "updatedAt"
           ) VALUES ($1, $2, $3, NOW(), $4, 'active', NOW(), NOW())`,
          [newSubId, request.tenantId, request.planId, newEndDate.toISOString()]
        );

        // E. Reactivate Tenant in main Tenants index
        await client.query(
          `UPDATE "Tenants" SET status = 'active', "updatedAt" = NOW() WHERE id = $1`,
          [request.tenantId]
        );

        // F. Insert Payments ledger record
        const paymentId = crypto.randomUUID();
        await client.query(
          `INSERT INTO "Payments" (
             id, "tenantId", amount, currency, status, "paymentMethod", "transactionId", "paymentDate", "createdAt"
           ) VALUES ($1, $2, $3, $4, 'completed', 'bank_transfer', $5, NOW(), NOW())`,
          [paymentId, request.tenantId, plan.price, plan.currency || 'INR', request.transactionId]
        );

        // G. Generate Invoice
        const invoiceId = crypto.randomUUID();
        const invoiceNo = `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
        await client.query(
          `INSERT INTO "Invoices" (
             id, "tenantId", "invoiceNo", amount, tax, total, status, "dueDate", "paidDate", "createdAt"
           ) VALUES ($1, $2, $3, $4, 0, $4, 'paid', NOW(), NOW(), NOW())`,
          [invoiceId, request.tenantId, invoiceNo, plan.price]
        );

        // H. Log Audit Log for change
        const auditId = crypto.randomUUID();
        await client.query(
          `INSERT INTO "AuditLogs" (
             id, "tenantId", "userId", action, "entityName", "entityId", "createdAt"
           ) VALUES ($1, $2, $3, 'RENEWAL_APPROVED', 'Subscriptions', $4, NOW())`,
          [auditId, request.tenantId, parseInt(reviewerId, 10), newSubId]
        );

        await client.query('COMMIT');
        return res.status(200).json({
          success: true,
          message: 'Renewal request approved successfully. Subscription extended and payment logged.',
          data: {
            newExpiryDate: newEndDate
          }
        });
      }

    } catch (error) {
      if (client) {
        await client.query('ROLLBACK');
      }
      console.error('Super Admin Processing Renewal Error:', error);
      return res.status(500).json({ message: 'An internal server error occurred during transaction processing.' });
    } finally {
      if (client) {
        client.release();
      }
    }
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).json({ message: `Method ${req.method} Not Allowed` });
}

export default withAuth(handler);
