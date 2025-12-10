import type { NextApiRequest, NextApiResponse } from "next";
import query from "@/lib/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    try {
        const sql = `
           SELECT
    COUNT(a.id) AS "totalAssets",

    COUNT(a.id) FILTER (WHERE s.status = 'Unassigned') AS "assetsInOffice",

    COUNT(a.id) FILTER (WHERE s.status IN ('Assigned', 'Overdue')) AS "assetsInField",

    COUNT(a.id) FILTER (WHERE s.status = 'Assigned') AS "assignedToOperators",

    COUNT(a.id) FILTER (WHERE s.status = 'Unassigned') AS "fieldAvailable"

FROM "Asset_Details" a
LEFT JOIN "Status" s ON a.status_id = s.id;
        `;

        const result = await query(sql);

        return res.status(200).json(result.rows[0]);
    } catch (error) {
        console.error("Dashboard Metrics Error:", error);
        return res.status(500).json({ message: "Internal server error." });
    }
}