import type { NextApiRequest, NextApiResponse } from 'next';
import query from '@/lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ message: "Method not allowed" });

    try {
        const {
            assetIds,
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

        // 1. Get Status ID for 'Assigned' with error handling
        const statusResult = await query(`SELECT id FROM "Status" WHERE status = 'Assigned' LIMIT 1`, []);
        
        if (statusResult.rows.length === 0) {
            return res.status(500).json({ message: "System Error: 'Assigned' status not found in database." });
        }
        
        const statusId = statusResult.rows[0].id;

        // 2. Start a single loop for the updates
        // Note: For high-scale apps, use a SQL TRANSACTION here
        await Promise.all(assetIds.map(async (id) => {
            const assetId = Number(id);

            // Update Asset_Details: The source of truth for current status
            await query(`
                UPDATE "Asset_Details"
                SET 
                    status_id = $1, 
                    assigned_by = $2, 
                    assigned_to = $3, 
                    location = $4
                WHERE id = $5`, 
                [statusId, supervisor_employeeId, operator_employeeId, destination, assetId]
            );

            // Insert into Asset_Assignments: The history log
            await query(`
                INSERT INTO "Asset_Assignments"
                ("assetId", "operator_employeeId", "supervisor_employeeId", "projectName", "location", "assigned_date", "expected_return_date", "notes")
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
                [assetId, operator_employeeId, supervisor_employeeId, project_name, destination, assigned_date, expected_return_date, notes]
            );
        }));

        return res.status(200).json({ 
            message: `${assetIds.length} Assets assigned successfully`,
            assignedTo: operator_employeeId 
        });

    } catch (error) {
        console.error("Assign Asset API Error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
}