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
    const fromDate = normalizeDate(req.query.fromDate);
    const toDate = normalizeDate(req.query.toDate);

    if (!Number.isFinite(employeeId)) {
      return res.status(400).json({ message: 'employeeId is required' });
    }

    const roleResult = await query(
      `SELECT LOWER(COALESCE(r."roleName", '')) AS role
       FROM "Users" u
       LEFT JOIN "Roles" r ON u."roleId" = r."roleId"
       WHERE u."employeeId" = $1
       LIMIT 1`,
      [employeeId],
    );

    const roleName = String(roleResult.rows[0]?.role || '');
    const isAdmin = roleName.includes('admin');
    const isSupervisor = roleName === 'supervisor';

    if (!isAdmin && !isSupervisor) {
      return res.status(403).json({ message: 'Access denied for reports' });
    }

    const where: string[] = [];
    const params: Array<number | string> = [];

    if (isSupervisor && !isAdmin) {
      params.push(employeeId);
      where.push(`aa."supervisor_employeeId" = $${params.length}`);
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
        COALESCE(aa.status, 'assigned') AS status
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

    return res.status(200).json({
      role: isAdmin ? 'admin' : 'supervisor',
      summary,
      history,
    });
  } catch (error) {
    console.error('Reports API error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
