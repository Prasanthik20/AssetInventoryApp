import type { NextApiRequest, NextApiResponse } from 'next';
import query from '@/lib/db';
import { setCorsHeaders } from '@/lib/corsHeaders';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    // Set CORS headers
    const origin = req.headers.origin as string;
    setCorsHeaders(res, origin);

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).end();
    }

    try {
        const { assetIds, operatorEmployeeId, photoURL } = req.body;

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
    -- Remove the 'IS NOT NULL' check to ensure it catches all rows
    `,
    [operatorEmployeeId, assetIdsInt]
        );

        // 2️⃣ Unassign asset and update photo if provided
        if (photoURL) {
            await query(
                `
          UPDATE "Asset_Details"
    SET
        assigned_to = NULL,
        assigned_by = NULL,
        "photoURL" = $2,
        status_id = (
            SELECT id FROM "Status" 
            WHERE status ILIKE 'Unassigned' 
            LIMIT 1
        )
    WHERE id = ANY($1::bigint[])
    `,
                [assetIdsInt, photoURL]
            );
        } else {
            await query(
                `
          UPDATE "Asset_Details"
    SET
        assigned_to = NULL,
        assigned_by = NULL,
        status_id = (
            SELECT id FROM "Status" 
            WHERE status ILIKE 'Unassigned' 
            LIMIT 1
        )
    WHERE id = ANY($1::bigint[])
    `,
                [assetIdsInt]
            );
        }

        return res.status(200).json({
            message: 'Assets returned and unassigned successfully',
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Server error' });
    }
}
