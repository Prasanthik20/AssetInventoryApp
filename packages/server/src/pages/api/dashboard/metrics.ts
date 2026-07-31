import type { NextApiResponse } from "next";
import query from "@/lib/db";
import { withAuth, AuthenticatedRequest } from "@/lib/apiHandler";

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        res.setHeader('Allow', ['GET', 'OPTIONS']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    const { tenantId, role } = req.user;
    const isSuperAdmin = role === 'Super Admin' || role === 'SuperAdmin';

    try {
        const sql = `
            SELECT
                COUNT(a.id) AS "totalAssets",
                COUNT(CASE WHEN LOWER(s.status) = 'unassigned' OR (s.id IS NULL AND a.assigned_to IS NULL) THEN a.id END) AS "officeAssets",
                COUNT(CASE WHEN LOWER(s.status) IN ('assigned', 'overdue') OR (s.id IS NULL AND a.assigned_to IS NOT NULL) THEN a.id END) AS "fieldAssets",
                COUNT(CASE WHEN LOWER(s.status) = 'assigned' OR (s.id IS NULL AND a.assigned_to IS NOT NULL) THEN a.id END) AS "assignedToOperators",
                COUNT(CASE WHEN LOWER(s.status) = 'unassigned' OR (s.id IS NULL AND a.assigned_to IS NULL) THEN a.id END) AS "fieldAvailable"
            FROM "Asset_Details" a
            LEFT JOIN "Status" s ON a.status_id = s.id
            WHERE (a."tenantId" = $1 OR $1 IS NULL OR a."tenantId" IS NULL);
        `;

        const result = await query(sql, [isSuperAdmin ? null : tenantId]);

        return res.status(200).json(result.rows[0]);
    } catch (error: any) {
        console.error("Dashboard Metrics Error:", error);
        return res.status(500).json({ message: "Internal server error.", details: String(error) });
    }
}

export default withAuth(handler);