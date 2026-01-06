import type { NextApiRequest, NextApiResponse } from 'next';
import query from '@/lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {

    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ message: "Method not allowed" });

   try {
        const {
            assetIds, // Receive the array from frontend
            operator_employeeId,
            supervisor_employeeId,
            assigned_date,
            expected_return_date,
            project_name,
            destination,
            notes
        } = req.body;

        if (!assetIds || !Array.isArray(assetIds) || assetIds.length === 0) {
            return res.status(400).json({ message: "No assets selected for assignment" });
        }

        // Get Status ID for 'Assigned'
        const statusResult = await query(`SELECT id FROM "Status" WHERE status = 'Assigned' LIMIT 1`, []);
        const statusId = statusResult.rows[0].id;

        // Process each asset in the array
        const results = await Promise.all(assetIds.map(async (id) => {
            // 1. Update Asset_Details
            await query(`
                UPDATE "Asset_Details"
                SET status_id = $1, assigned_by = $2, assigned_to = $3, location = $4
                WHERE id = $5`, 
                [statusId, supervisor_employeeId, operator_employeeId, destination, id]
            );

            // 2. Insert into Asset_Assignments
            return query(`
                INSERT INTO "Asset_Assignments"
                ("assetId", "operator_employeeId", "supervisor_employeeId", "projectName", "location", "assigned_date", "expected_return_date", "notes")
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                RETURNING *`,
                [id, operator_employeeId, supervisor_employeeId, project_name, destination, assigned_date, expected_return_date, notes]
            );
        }));

        return res.status(200).json({ message: `${assetIds.length} Assets assigned successfully` });

    } catch (error) {
        console.error("Assign Asset API Error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
}