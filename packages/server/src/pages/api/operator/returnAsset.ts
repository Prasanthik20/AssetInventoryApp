import type { NextApiRequest, NextApiResponse } from 'next';
import query from '@/lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {

    if (req.method === 'OPTIONS') {
        res.setHeader('Access-Control-Allow-Origin', 'http://localhost:8081');
        res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        return res.status(200).end();
    }

    res.setHeader('Access-Control-Allow-Origin', 'http://localhost:8081');

    if (req.method !== 'POST') {
        return res.status(405).end();
    }

    try {
        const { assetIds, operatorEmployeeId } = req.body;

        if (!Array.isArray(assetIds) || assetIds.length === 0) {
            return res.status(400).json({ message: 'assetIds required' });
        }

        if (typeof operatorEmployeeId !== 'number') {
            return res.status(400).json({ message: 'operatorEmployeeId required' });
        }

        const assetIdsInt = assetIds.map(Number);

        // 1️⃣ Mark assignment as returned
        await query(
            `
            UPDATE "Asset_Assignments"
            SET expected_return_date = NOW()
            WHERE "operator_employeeId" = $1
            AND "assetId" = ANY($2::bigint[])
            `,
            [operatorEmployeeId, assetIdsInt]
        );

        // 2️⃣ Unassign asset
        await query(
            `
            UPDATE "Asset_Details"
            SET 
                assigned_to = NULL,
                assigned_by = NULL,
                status_id = (
                    SELECT id FROM "Status" WHERE status = 'Unassigned'
                )
            WHERE id = ANY($1::bigint[])
            `,
            [assetIdsInt]
        );

        return res.status(200).json({
            message: 'Assets returned and unassigned successfully',
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Server error' });
    }
}
