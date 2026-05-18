import type { NextApiResponse } from "next";
import query from "@/lib/db";
import { withAuth, AuthenticatedRequest } from "@/lib/apiHandler";

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        res.setHeader('Allow', ['GET', 'OPTIONS']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    const { tenantId, role } = req.user;
    const isSuperAdmin = role === 'Super Admin';

    try {
        const sql = `
            SELECT
                COUNT(a.id) AS "totalAssets",
                COUNT(a.id) FILTER (WHERE s.status = 'Unassigned') AS "officeAssets",
                COUNT(a.id) FILTER (WHERE s.status IN ('Assigned', 'Overdue')) AS "fieldAssets",
                COUNT(a.id) FILTER (WHERE s.status = 'Assigned') AS "assignedToOperators",
                COUNT(a.id) FILTER (WHERE s.status = 'Unassigned') AS "fieldAvailable"
            FROM "Asset_Details" a
            LEFT JOIN "Status" s ON a.status_id = s.id
            WHERE (a."tenantId" = $1 OR $1 IS NULL);
        `;

        const result = await query(sql, [isSuperAdmin ? null : tenantId]);

        return res.status(200).json(result.rows[0]);
    } catch (error) {
        console.error("Dashboard Metrics Error:", error);
        return res.status(500).json({ message: "Internal server error." });
    }
}

export default withAuth(handler);