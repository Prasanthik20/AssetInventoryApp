import type { NextApiRequest, NextApiResponse } from 'next';
import query from '@/lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        res.setHeader('Allow', ['GET']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    try {
        const sqlQuery = `
            SELECT
                a.id,
                a.name AS "assetName",
                a."asset_Id" AS "barcode",
                a."serial_no" AS "serialNumber",
                a.location,
                a."purchase_date" AS "purchaseDate",
                a.price,
                a."warranty_expiry" AS "warrantyExpiry",

                -- joined tables
                cat.category AS "category",
                s.status AS "status",
                u."fullName" AS "assignedBy",
                assignee."fullName" AS "assignedTo"

            FROM "Asset_Details" a
            LEFT JOIN "Category" cat ON a."categoryId" = cat."categoryId"
            LEFT JOIN "Status" s ON a.status_id = s.id
            LEFT JOIN "Users" u ON a.assigned_by = u."employeeId"
            LEFT JOIN "Users" assignee ON a.assigned_to = assignee."employeeId"

            ORDER BY a.id ASC;
        `;

        const result = await query(sqlQuery);

        const formattedAssets = result.rows.map(asset => ({
            id: asset.id,
            assetName: asset.assetName,
            barcode: asset.barcode,
            serialNumber: asset.serialNumber,
            category: asset.category,
            status: asset.status,
            assignedBy: asset.assignedBy || null,
            assignedTo: asset.assignedTo || null,
            location: asset.location,
            purchaseDate: asset.purchaseDate,
            warrantyExpiry: asset.warrantyExpiry,
            price: asset.price
        }));

        return res.status(200).json({
            message: 'Assets fetched successfully!',
            count: formattedAssets.length,
            assets: formattedAssets
        });

    } catch (error) {
        console.error('Get All Assets Error:', error);
        return res.status(500).json({ message: 'Internal server error.' });
    }
}