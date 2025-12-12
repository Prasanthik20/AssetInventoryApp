import type { NextApiRequest, NextApiResponse } from 'next';
import query from '@/lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        res.setHeader('Allow', ['GET']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    try {
        // 1️⃣ Update assets: Assigned → Overdue if expected_return_date < today
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

        const updateQuery = `
            UPDATE "Asset_Details"
                SET status_id = (
                SELECT id FROM "Status" WHERE status = 'Overdue' LIMIT 1
             )
            WHERE status_id = (
            SELECT id FROM "Status" WHERE status = 'Assigned' LIMIT 1
            )
            AND id IN (
            SELECT "assetId" FROM "Asset_Assignments"
            WHERE "expected_return_date" < CURRENT_DATE
            );
        `;

        await query(updateQuery);

        // 2️⃣ Fetch all assets after the update
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

            cat.category AS "category",
            s.status AS "status",

            -- Supervisor & Operator names
            u."fullName" AS "assignedBy",
            assignee."fullName" AS "assignedTo",

            -- Assignment table fields
                aa.id AS "assignmentId",
                aa.expected_return_date AS "expectedReturnDate",

            -- Correct based on your DB structure
                aa."operator_employeeId"     AS "operatorId",
                aa."supervisor_employeeId"   AS "senderId"

            FROM "Asset_Details" a
            LEFT JOIN "Category" cat 
                ON a."categoryId" = cat."categoryId"
            LEFT JOIN "Status" s 
            ON a.status_id = s.id

            LEFT JOIN "Users" u 
            ON a.assigned_by = u."employeeId"
            LEFT JOIN "Users" assignee 
            ON a.assigned_to = assignee."employeeId"

            LEFT JOIN "Asset_Assignments" aa 
            ON aa."assetId" = a.id   -- ✔ FIXED (correct camelCase)

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
            price: asset.price,
            expectedReturnDate: asset.expectedReturnDate || null,
            assignmentId: asset.assignmentId || null,
            operatorId: asset.operatorId || null,
            senderId: asset.senderId || null,
            receiverId: asset.operatorId || null
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
