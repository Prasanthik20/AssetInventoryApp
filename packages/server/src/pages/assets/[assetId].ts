import type { NextApiRequest, NextApiResponse } from 'next';
import query from '@/lib/db';  // 👈 Import your raw query function
import corsHandler from '@/lib/cors';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    return corsHandler(req, res, async () => {
        if (req.method !== 'GET') {
            res.setHeader('Allow', ['GET']);
            return res.status(405).end(`Method ${req.method} Not Allowed`);
        }

        const { assetId } = req.query;

        if (!assetId || typeof assetId !== 'string') {
            return res.status(400).json({ message: 'Asset ID is required.' });
        }

        try {
            // SQL query to fetch a single asset and join all related tables
            const sqlQuery = `
                SELECT
                    a.id,
                    a.name AS "assetName",
                    cat.name AS "category",
                    s.status,
                    a.model_no AS "modelNumber",
                    a.serial_no AS "serialNumber",
                    a.asset_id AS "barcode",
                    a.location,
                    u."fullName" AS "assignedTo",
                    assigner."fullName" AS "assignedBy", -- Assuming you add this relation
                    a.warranty_expiry AS "warrantyExpiry",
                    a.purchase_date AS "purchaseDate",
                    a.price
                FROM 
                    "Asset_Details" a
                INNER JOIN
                    "Category_Details" cat ON a."categoryId" = cat."categoryId"
                INNER JOIN 
                    "Status" s ON a.status_id = s.id
                LEFT JOIN 
                    "Users" u ON a.assigned_by = u."userId" -- The user it is assigned TO
                LEFT JOIN
                    "Users" assigner ON a.assigned_by = assigner."userId" -- The user who assigned it
                WHERE
                    a.id = $1;
            `;

            const params = [parseInt(assetId)];
            const result = await query(sqlQuery, params);

            if (result.rows.length === 0) {
                return res.status(404).json({ message: `Asset with ID ${assetId} not found.` });
            }

            const asset = result.rows[0];
            
            // Reformat dates for cleaner display if they exist
            const formatDate = (date: string | null) => date ? new Date(date).toISOString().split('T')[0] : null;

            // Map the detailed data to the format needed by the AssetFullDetails screen
            const formattedAsset = {
                id: asset.id,
                assetName: asset.assetName,
                category: asset.category,
                status: asset.status,
                modelNumber: asset.modelNumber,
                serialNumber: asset.serialNumber,
                barcode: asset.barcode,
                location: asset.location,
                assignedTo: asset.assignedTo || 'N/A',
                assignedBy: asset.assignedBy || 'N/A',
                warrantyExpiry: formatDate(asset.warrantyExpiry),
                purchaseDate: formatDate(asset.purchaseDate),
                value: asset.price ? `$${parseFloat(asset.price).toLocaleString()}` : 'N/A',
            };

            return res.status(200).json(formattedAsset);

        } catch (error) {
            console.error(`Get Asset by ID API Error:`, error);
            return res.status(500).json({ message: 'An internal server error occurred.' });
        }
    });
}
