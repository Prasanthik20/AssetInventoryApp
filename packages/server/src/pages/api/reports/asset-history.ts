import type { NextApiRequest, NextApiResponse } from 'next';
import query from '@/lib/db';
import { setCorsHeaders } from '@/lib/corsHeaders';
import { withAuth, AuthenticatedRequest } from '@/lib/apiHandler';

type HistoryRow = {
  assignmentId: number | null;
  assetId: number;
  assetName: string;
  serialNo: string | null;
  assetStatus: string;
  operatorEmployeeId: number | null;
  operatorName: string | null;
  supervisorEmployeeId: number | null;
  supervisorName: string | null;
  location: string | null;
  projectName: string | null;
  notes: string | null;
  assignedDate: string | null;
  expectedReturnDate: string | null;
  returnedDate: string | null;
  status: string;
};

const normalizeNotes = (value: unknown): string | null => {
  if (value === null || value === undefined) return null;
  const raw = String(value).trim();
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed === 'string') {
      const text = parsed.trim();
      return text.length > 0 ? text : null;
    }
    if (Array.isArray(parsed)) {
      const text = parsed
        .map((item) => (typeof item === 'string' ? item.trim() : ''))
        .filter((item) => item.length > 0)
        .join(', ');
      return text.length > 0 ? text : null;
    }
    if (parsed && typeof parsed === 'object') {
      const candidateKeys = ['notes', 'note', 'message', 'reason', 'text', 'comment'];
      for (const key of candidateKeys) {
        const candidate = (parsed as Record<string, unknown>)[key];
        if (typeof candidate === 'string' && candidate.trim().length > 0) {
          return candidate.trim();
        }
      }
      const compact = Object.entries(parsed as Record<string, unknown>)
        .filter(([, val]) => val !== null && val !== undefined && String(val).trim().length > 0)
        .map(([key, val]) => `${key}: ${String(val).trim()}`)
        .join(' | ');
      return compact.length > 0 ? compact : raw;
    }
  } catch {
    // Non-JSON legacy note — pass through as-is.
  }
  return raw;
};

const normalizeDate = (value?: string | string[]): string | null => {
  if (!value) return null;
  const raw = Array.isArray(value) ? value[0] : value;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
};

export default withAuth(async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  const origin = req.headers.origin as string;
  setCorsHeaders(res, origin);

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET', 'OPTIONS']);
    return res.status(405).json({ message: `Method ${req.method} not allowed` });
  }

  try {
    const { tenantId } = req.user;
    if (!tenantId) {
      return res.status(403).json({ message: 'Tenant context missing.' });
    }

    const employeeId = Number(req.query.employeeId);
    const roleNameRaw = Array.isArray(req.query.roleName) ? req.query.roleName[0] : req.query.roleName;
    const normalizedRoleName = String(roleNameRaw || '').toLowerCase();
    const isAdminRole = normalizedRoleName.includes('admin');
    const fromDate = normalizeDate(req.query.fromDate);
    const toDate = normalizeDate(req.query.toDate);

    if (!Number.isFinite(employeeId)) {
      return res.status(400).json({ message: 'employeeId is required' });
    }

    const userResult = await query(
      `SELECT u."employeeId"
       FROM "Users" u
       WHERE u."employeeId" = $1 AND u."tenantId" = $2
       LIMIT 1`,
      [employeeId, tenantId],
    );

    if (!userResult.rows.length) {
      return res.status(404).json({ message: 'User not found in your organization' });
    }

    // ─── Build WHERE clauses ──────────────────────────────────────────────────
    // All filtering anchors on Asset_Details (ad) so unassigned assets appear too.
    const params: Array<number | string> = [tenantId];
    const adWhere: string[] = [`ad."tenantId" = $1`];
    const aaExtraClauses: string[] = []; // extra conditions on aa (applied in the LEFT JOIN itself)

    if (!isAdminRole) {
      params.push(employeeId);
      // Non-admins see assets they appear on in any assignment (as operator or supervisor).
      adWhere.push(`ad.id IN (
        SELECT aa2."assetId"
        FROM "Asset_Assignments" aa2
        WHERE aa2."operator_employeeId" = $${params.length}
           OR aa2."supervisor_employeeId" = $${params.length}
      )`);
    }

    if (fromDate) {
      params.push(fromDate);
      aaExtraClauses.push(`aa.assigned_date >= $${params.length}::date`);
    }

    if (toDate) {
      params.push(toDate);
      aaExtraClauses.push(`aa.assigned_date <= $${params.length}::date`);
    }

    const adWhereSql = adWhere.length > 0 ? `WHERE ${adWhere.join(' AND ')}` : '';
    // Date-range filters go into the JOIN condition so unassigned rows still appear.
    const aaJoinExtra = aaExtraClauses.length > 0 ? `AND ${aaExtraClauses.join(' AND ')}` : '';

    // ─── Main query ───────────────────────────────────────────────────────────
    // Start from Asset_Details → LEFT JOIN assignments → each assignment = one row.
    // Assets with no assignments produce a single "unassigned" or "maintenance" row.
    const historySql = `
      SELECT
        aa.id                                              AS "assignmentId",
        ad.id                                              AS "assetId",
        ad.name                                            AS "assetName",
        ad.serial_no                                       AS "serialNo",
        LOWER(COALESCE(s.status, 'unknown'))               AS "assetStatus",
        aa."operator_employeeId"                           AS "operatorEmployeeId",
        op."fullName"                                      AS "operatorName",
        aa."supervisor_employeeId"                         AS "supervisorEmployeeId",
        sp."fullName"                                      AS "supervisorName",
        aa.location,
        aa."projectName"                                   AS "projectName",
        aa.notes,
        aa.assigned_date                                   AS "assignedDate",
        aa.expected_return_date                            AS "expectedReturnDate",
        aa.returned_date                                   AS "returnedDate",
        CASE
          WHEN aa.id IS NULL THEN
            CASE
              WHEN LOWER(COALESCE(s.status, '')) IN ('under maintenance', 'maintenance')
                THEN 'maintenance'
              ELSE 'unassigned'
            END
          WHEN aa.status = 'returned' OR aa.returned_date IS NOT NULL THEN 'returned'
          WHEN aa.expected_return_date < CURRENT_DATE               THEN 'overdue'
          ELSE 'assigned'
        END                                                AS "status"
      FROM "Asset_Details" ad
      LEFT JOIN "Status" s ON s.id = ad.status_id
      LEFT JOIN "Asset_Assignments" aa
        ON aa."assetId" = ad.id ${aaJoinExtra}
      LEFT JOIN "Users" op ON op."employeeId" = aa."operator_employeeId"
      LEFT JOIN "Users" sp ON sp."employeeId" = aa."supervisor_employeeId"
      ${adWhereSql}
      ORDER BY
        CASE WHEN aa.id IS NULL THEN 1 ELSE 0 END,
        aa.assigned_date DESC,
        aa.id DESC;
    `;

    const historyResult = await query(historySql, params);
    const history = historyResult.rows.map((row: any): HistoryRow => ({
      assignmentId: row.assignmentId != null ? Number(row.assignmentId) : null,
      assetId: Number(row.assetId),
      assetName: String(row.assetName || ''),
      serialNo: row.serialNo || null,
      assetStatus: String(row.assetStatus || 'unknown'),
      operatorEmployeeId: row.operatorEmployeeId != null ? Number(row.operatorEmployeeId) : null,
      operatorName: row.operatorName || null,
      supervisorEmployeeId: row.supervisorEmployeeId != null ? Number(row.supervisorEmployeeId) : null,
      supervisorName: row.supervisorName || null,
      location: row.location || null,
      projectName: row.projectName || null,
      notes: normalizeNotes(row.notes),
      assignedDate: row.assignedDate || null,
      expectedReturnDate: row.expectedReturnDate || null,
      returnedDate: row.returnedDate || null,
      status: String(row.status || 'unassigned'),
    }));

    const summary = {
      totalAssignments: history.filter((r) => r.assignmentId != null).length,
      activeAssignments: history.filter((r) => r.status === 'assigned').length,
      returnedAssignments: history.filter((r) => r.status === 'returned').length,
      overdueAssignments: history.filter((r) => r.status === 'overdue').length,
      unassignedAssets: history.filter((r) => r.status === 'unassigned').length,
      maintenanceAssets: history.filter((r) => r.status === 'maintenance').length,
    };

    const pendingApprovalBaseSql = `
      FROM "Notifications" n
      WHERE n."tenantId" = $1
        AND LOWER(COALESCE(n.status, '')) IN ('unread', 'replied')
        AND (
          LOWER(COALESCE(n.reply, '')) LIKE '%pending confirmation%'
          OR LOWER(COALESCE(n.reply, '')) LIKE '%workflow_approval_pending%'
          OR (
            LOWER(COALESCE(n.reason, '')) LIKE '%has been returned by%'
            AND LOWER(COALESCE(n.reply, '')) LIKE '%return pending confirmation%'
          )
        )
        AND LOWER(COALESCE(n.reason, '')) NOT LIKE '%return confirmed%'
        AND LOWER(COALESCE(n.reply, '')) NOT LIKE '%return confirmed%'
    `;

    const pendingApprovalSql = isAdminRole
      ? `SELECT COUNT(*)::int AS count ${pendingApprovalBaseSql}`
      : `SELECT COUNT(*)::int AS count ${pendingApprovalBaseSql}
         AND (n."receiverId" = $2 OR n."senderId" = $2)`;

    const pendingParams = isAdminRole ? [tenantId] : [tenantId, employeeId];
    const pendingApprovalResult = await query(pendingApprovalSql, pendingParams);
    const pendingApprovalConfirmations = Number(pendingApprovalResult.rows?.[0]?.count || 0);

    let adminSummaryExtras: {
      totalAssets?: number;
      officeAssets?: number;
      underMaintenanceAssets?: number;
    } = {};

    if (isAdminRole) {
      const totalAssetsResult = await query(
        `SELECT COUNT(*)::int AS count FROM "Asset_Details" WHERE "tenantId" = $1`,
        [tenantId],
      );

      const officeAssetsResult = await query(
        `SELECT COUNT(*)::int AS count
         FROM "Asset_Details" ad
         LEFT JOIN "Status" s ON ad.status_id = s.id
         WHERE ad."tenantId" = $1 AND LOWER(COALESCE(s.status, '')) = 'unassigned'`,
        [tenantId],
      );

      const maintenanceAssetsResult = await query(
        `SELECT COUNT(*)::int AS count
         FROM "Asset_Details" ad
         LEFT JOIN "Status" s ON ad.status_id = s.id
         WHERE ad."tenantId" = $1 AND LOWER(COALESCE(s.status, '')) IN ('under maintenance', 'maintenance')`,
        [tenantId],
      );

      adminSummaryExtras = {
        totalAssets: Number(totalAssetsResult.rows?.[0]?.count || 0),
        officeAssets: Number(officeAssetsResult.rows?.[0]?.count || 0),
        underMaintenanceAssets: Number(maintenanceAssetsResult.rows?.[0]?.count || 0),
      };
    }

    return res.status(200).json({
      role: isAdminRole ? 'admin' : 'user',
      summary: {
        ...summary,
        pendingApprovalConfirmations,
        ...adminSummaryExtras,
      },
      history,
    });
  } catch (error) {
    console.error('Reports API error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});