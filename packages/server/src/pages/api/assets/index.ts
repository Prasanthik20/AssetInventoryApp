import type { NextApiResponse } from 'next';
import query from '@/lib/db';
import { setCorsHeaders } from '@/lib/corsHeaders';
import { withAuth, AuthenticatedRequest } from '@/lib/apiHandler';

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
    const origin = req.headers.origin as string;
    setCorsHeaders(res, origin);

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }
    if (req.method !== 'GET') {
        res.setHeader('Allow', ['GET', 'OPTIONS']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    const { tenantId } = req.user;

    try {
        // 1️⃣ Update assets: Only set to 'Overdue' if it is CURRENTLY assigned to someone
        const updateQuery = `
            UPDATE "Asset_Details"
            SET status_id = (
                SELECT id FROM "Status" WHERE status = 'Overdue' AND ("tenantId" = $1 OR "tenantId" IS NULL) LIMIT 1
            )
            WHERE status_id = (
                SELECT id FROM "Status" WHERE status = 'Assigned' AND ("tenantId" = $1 OR "tenantId" IS NULL) LIMIT 1
            )
            AND "tenantId" = $1
            AND assigned_to IS NOT NULL
            AND id IN (
                SELECT "assetId" FROM "Asset_Assignments"
                WHERE "expected_return_date" < CURRENT_DATE
                  AND "tenantId" = $1
                  AND COALESCE(status, '') <> 'returned'
                  AND "returned_date" IS NULL
            );
        `;

        await query(updateQuery, [tenantId]);

        // 2️⃣ Fetch assets with only the LATEST assignment record
        const sqlQuery = `
            SELECT
                a.id,
                a.name AS "assetName",
                a."asset_Id" AS "barcode",
                a."controller_key" AS "controllerKey",
                COALESCE(a."barcodeURL", aa."barcodeURL") AS "barcodeURL",
                a."serial_no" AS "serialNumber",
                a.location,
                a."purchase_date" AS "purchaseDate",
                a.price,
                a."warranty_expiry" AS "warrantyExpiry",
                COALESCE(a."photoURL", aa."photoURL") AS "photoURL",
                
                cat.category AS "category",
                s.status AS "status",
                u."fullName" AS "assignedBy",
                assignee."fullName" AS "assignedTo",
                
                aa.id AS "assignmentId",
                aa."projectName" AS "projectName",
                aa.expected_return_date AS "expectedReturnDate",
                aa."operator_employeeId" AS "operatorId",
                aa."supervisor_employeeId" AS "senderId"

            FROM "Asset_Details" a
            LEFT JOIN "Category" cat ON a."categoryId" = cat."categoryId"
            LEFT JOIN "Status" s ON a.status_id = s.id
            LEFT JOIN "Users" u ON a.assigned_by = u."employeeId"
            LEFT JOIN "Users" assignee ON a.assigned_to = assignee."employeeId"
            
            LEFT JOIN LATERAL (
                SELECT * FROM "Asset_Assignments"
                WHERE "assetId" = a.id
                  AND "tenantId" = $1
                  AND COALESCE(status, '') <> 'returned'
                  AND "returned_date" IS NULL
                ORDER BY id DESC
                LIMIT 1
            ) aa ON TRUE
            WHERE a."tenantId" = $1
            ORDER BY a.id ASC;
        `;

        const result = await query(sqlQuery, [tenantId]);

        const formattedAssets = result.rows.map(asset => ({
            id: asset.id.toString(),
            assetName: asset.assetName,
            barcode: asset.barcode,
            controllerKey: asset.controllerKey || null,
            serialNumber: asset.serialNumber,
            category: asset.category,
            status: asset.status,
            assignedBy: asset.assignedBy || null,
            assignedTo: asset.assignedTo || null,
            location: asset.location,
            purchaseDate: asset.purchaseDate,
            warrantyExpiry: asset.warrantyExpiry,
            price: asset.price,
            photoURL: asset.photoURL || null,
            barcodeURL: asset.barcodeURL || null,
            expectedReturnDate: asset.expectedReturnDate || null,
            projectName: asset.projectName || null,
            assignmentId: asset.assignmentId ? asset.assignmentId.toString() : null,
            operatorId: asset.operatorId ? asset.operatorId.toString() : null,
            senderId: asset.senderId ? asset.senderId.toString() : null,
            receiverId: asset.operatorId ? asset.operatorId.toString() : null
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

export default withAuth(handler);