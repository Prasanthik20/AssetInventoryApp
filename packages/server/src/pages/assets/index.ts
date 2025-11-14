import type { NextApiRequest, NextApiResponse } from 'next';
import query from '@/lib/db';  // 👈 Import your raw query function
import corsHandler from '@/lib/cors';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    return corsHandler(req, res, async () => {
        if (req.method !== 'GET') {
            res.setHeader('Allow', ['GET']);
            return res.status(405).end(`Method ${req.method} Not Allowed`);
        }

        try {
            // SQL query to fetch all assets and join related tables
            const sqlQuery = `
                SELECT
                    a.id,
                    a.serial_no AS "serialNumber",
                    a.asset_id AS "barcode",
                    a.name AS "assetName",
                    a.location,
                    s.status AS "statusType",
                    u."fullName" AS "assignedTo"
                FROM 
                    "Asset_Details" a
                INNER JOIN 
                    "Status" s ON a.status_id = s.id
                LEFT JOIN 
                    "Users" u ON a.assigned_by = u."userId"
                ORDER BY
                    a.id ASC;
            `;

            const result = await query(sqlQuery, []);

            // Map the raw database data to the clean format your frontend expects
            const formattedAssets = result.rows.map(asset => ({
                id: asset.id,
                serialNumber: asset.serialNumber,
                barcode: asset.barcode,
                assetName: asset.assetName,
                status: {
                    type: asset.statusType, // e.g., "Assigned", "Overdue"
                    assignedTo: asset.assignedTo || null, // Will be null if no user is joined
                    location: asset.location,
                }
            }));

            return res.status(200).json({
                message: 'Assets fetched successfully!',
                count: formattedAssets.length,
                assets: formattedAssets,
            });

        } catch (error) {
            console.error('Get All Assets API Error:', error);
            return res.status(500).json({ message: 'An internal server error occurred.' });
        }
    });
}