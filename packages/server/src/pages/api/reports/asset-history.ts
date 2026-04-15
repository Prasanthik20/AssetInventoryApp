import type { NextApiRequest, NextApiResponse } from 'next';
import query from '@/lib/db';
import { setCorsHeaders } from '@/lib/corsHeaders';

type HistoryRow = {
  assignmentId: number;
  assetId: number;
  assetName: string;
  serialNo: string | null;
  operatorEmployeeId: number;
  operatorName: string;
  supervisorEmployeeId: number;
  supervisorName: string;
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
    // Non-JSON legacy note text should pass through unchanged.
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

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
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
       WHERE u."employeeId" = $1
       LIMIT 1`,
      [employeeId],
    );

    if (!userResult.rows.length) {
      return res.status(404).json({ message: 'User not found' });
    }

    const where: string[] = [];
    const params: Array<number | string> = [];

    if (!isAdminRole) {
      params.push(employeeId);
      where.push(`(aa."operator_employeeId" = $${params.length} OR aa."supervisor_employeeId" = $${params.length})`);
    }

    if (fromDate) {
      params.push(fromDate);
      where.push(`aa."assigned_date" >= $${params.length}::date`);
    }

    if (toDate) {
      params.push(toDate);
      where.push(`aa."assigned_date" <= $${params.length}::date`);
    }

    const whereSql = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

    const historySql = `
      SELECT
        aa.id AS "assignmentId",
        ad.id AS "assetId",
        ad.name AS "assetName",
        ad.serial_no AS "serialNo",
        aa."operator_employeeId" AS "operatorEmployeeId",
        COALESCE(op."fullName", 'Unknown') AS "operatorName",
        aa."supervisor_employeeId" AS "supervisorEmployeeId",
        COALESCE(sp."fullName", 'Unknown') AS "supervisorName",
        aa.location,
        aa."projectName" AS "projectName",
        aa.notes,
        aa.assigned_date AS "assignedDate",
        aa.expected_return_date AS "expectedReturnDate",
        aa.returned_date AS "returnedDate",
        CASE
          WHEN aa.returned_date IS NULL
            AND LOWER(COALESCE(aa.status, '')) <> 'returned'
            AND aa.expected_return_date IS NOT NULL
            AND aa.expected_return_date < CURRENT_DATE
          THEN 'overdue'
          ELSE COALESCE(aa.status, 'assigned')
        END AS status
      FROM "Asset_Assignments" aa
      INNER JOIN "Asset_Details" ad ON ad.id = aa."assetId"
      LEFT JOIN "Users" op ON op."employeeId" = aa."operator_employeeId"
      LEFT JOIN "Users" sp ON sp."employeeId" = aa."supervisor_employeeId"
      ${whereSql}
      ORDER BY aa.assigned_date DESC NULLS LAST, aa.id DESC;
    `;

    const historyResult = await query(historySql, params);
    const history = historyResult.rows.map((row: any): HistoryRow => ({
      assignmentId: Number(row.assignmentId),
      assetId: Number(row.assetId),
      assetName: String(row.assetName || ''),
      serialNo: row.serialNo || null,
      operatorEmployeeId: Number(row.operatorEmployeeId),
      operatorName: String(row.operatorName || 'Unknown'),
      supervisorEmployeeId: Number(row.supervisorEmployeeId),
      supervisorName: String(row.supervisorName || 'Unknown'),
      location: row.location || null,
      projectName: row.projectName || null,
      notes: normalizeNotes(row.notes),
      assignedDate: row.assignedDate || null,
      expectedReturnDate: row.expectedReturnDate || null,
      returnedDate: row.returnedDate || null,
      status: String(row.status || 'assigned'),
    }));

    const summary = {
      totalAssignments: history.length,
      activeAssignments: history.filter((row) => row.status.toLowerCase() === 'assigned').length,
      returnedAssignments: history.filter((row) => row.status.toLowerCase() === 'returned').length,
      overdueAssignments: history.filter((row) => row.status.toLowerCase() === 'overdue').length,
    };

    const pendingApprovalBaseSql = `
      FROM "Notifications" n
      WHERE LOWER(COALESCE(n.status, '')) IN ('unread', 'replied')
        AND (
          LOWER(COALESCE(n.reply, '')) LIKE '%pending confirmation%'
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
         AND (n."receiverId" = $1 OR n."senderId" = $1)`;

    const pendingParams = isAdminRole ? [] : [employeeId];
    const pendingApprovalResult = await query(pendingApprovalSql, pendingParams);
    const pendingApprovalConfirmations = Number(pendingApprovalResult.rows?.[0]?.count || 0);

    let adminSummaryExtras: {
      totalAssets?: number;
      officeAssets?: number;
      underMaintenanceAssets?: number;
    } = {};

    if (isAdminRole) {
      const totalAssetsResult = await query(
        `SELECT COUNT(*)::int AS count FROM "Asset_Details"`,
        [],
      );

      const officeAssetsResult = await query(
        `SELECT COUNT(*)::int AS count
         FROM "Asset_Details" ad
         LEFT JOIN "Status" s ON ad.status_id = s.id
         WHERE LOWER(COALESCE(s.status, '')) = 'unassigned'`,
        [],
      );

      const maintenanceAssetsResult = await query(
        `SELECT COUNT(*)::int AS count
         FROM "Asset_Details" ad
         LEFT JOIN "Status" s ON ad.status_id = s.id
         WHERE LOWER(COALESCE(s.status, '')) IN ('under maintenance', 'maintenance')`,
        [],
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
}
