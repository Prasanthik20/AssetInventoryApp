import type { NextApiRequest, NextApiResponse } from 'next';
import query from '@/lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    // Handle preflight OPTIONS request
    if (req.method === 'OPTIONS') {
        res.setHeader('Access-Control-Allow-Origin', 'http://localhost:8081'); // allow your frontend
        res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        return res.status(200).end();
    }

    // Set CORS headers for actual requests
    res.setHeader('Access-Control-Allow-Origin', 'http://localhost:8081');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    try {
        const { assetIds, operatorEmployeeId } = req.body;

        if (!assetIds || !Array.isArray(assetIds) || assetIds.length === 0) {
            return res.status(400).json({ message: 'assetIds is required and should be a non-empty array.' });
        }

        if (!operatorEmployeeId || typeof operatorEmployeeId !== 'number') {
            return res.status(400).json({ message: 'operatorEmployeeId is required and should be a number.' });
        }

        const assetIdsInt = assetIds.map((id: string | number) => parseInt(String(id)));

        const updateQuery = `
          UPDATE "Asset_Assignments"
          SET expected_return_date = NOW()
          WHERE "operator_employeeId" = $1
          AND "assetId" = ANY($2::bigint[])
          RETURNING *;
        `;

        const updatedAssets = await query(updateQuery, [operatorEmployeeId, assetIdsInt]);

        return res.status(200).json({
            message: 'Assets returned successfully',
            updatedCount: updatedAssets.rowCount,
            updatedAssets: updatedAssets.rows,
        });
    } catch (error) {
        console.error('Return Asset API Error:', error);
        return res.status(500).json({ message: 'Internal server error.', error });
    }
}
