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

    const { tenantId, role } = req.user;
    
    if (!tenantId && role !== 'Super Admin') {
        console.error('[ERROR] tenantId missing in token for non-Super Admin user.');
        return res.status(403).json({ message: 'Tenant ID missing. Please log in again.' });
    }

    // Auto-migration for useful_life and salvage_value
    try {
        await query(`
            ALTER TABLE "Asset_Details" 
            ADD COLUMN IF NOT EXISTS "useful_life" INT DEFAULT 5,
            ADD COLUMN IF NOT EXISTS "salvage_value" VARCHAR(255);
        `, []);
    } catch (err) {
        console.error('[AUTO-MIGRATION ERROR]', err);
    }

    console.log(`[DEBUG] User Payload: ${JSON.stringify(req.user)}`);
    console.log(`[DEBUG] Fetching assets for tenantId: "${tenantId}"`);

    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 50));
    const offset = (page - 1) * limit;
    
    let search = (req.query.search as string) || '';
    if (search === 'undefined' || search === 'null') search = '';
    const isSearch = search.trim().length > 0;

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
                a.useful_life AS "usefulLife",
                a.salvage_value AS "salvageValue",
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
                  AND ("tenantId" = $1 OR $1 IS NULL)
                  AND COALESCE(status, '') <> 'returned'
                  AND "returned_date" IS NULL
                ORDER BY id DESC
                LIMIT 1
            ) aa ON TRUE
            WHERE (a."tenantId" = $1 OR $1 IS NULL)
            ${isSearch ? `AND (a.name ILIKE $2 OR a."asset_Id" ILIKE $2 OR a."serial_no" ILIKE $2)` : ''}
            ORDER BY a.id ASC
            LIMIT $${isSearch ? 3 : 2} OFFSET $${isSearch ? 4 : 3};
        `;

        const countQuery = `
            SELECT COUNT(*) as total
            FROM "Asset_Details" a
            WHERE (a."tenantId" = $1 OR $1 IS NULL)
            ${isSearch ? `AND (a.name ILIKE $2 OR a."asset_Id" ILIKE $2 OR a."serial_no" ILIKE $2)` : ''};
        `;

        const searchPattern = isSearch ? `%${search.trim()}%` : null;
        const mainParams = isSearch
            ? [tenantId, searchPattern, limit, offset]
            : [tenantId, limit, offset];
        const countParams = isSearch ? [tenantId, searchPattern] : [tenantId];

        const [result, countResult] = await Promise.all([
            query(sqlQuery, mainParams),
            query(countQuery, countParams),
        ]);

        const total = parseInt(countResult.rows[0]?.total || '0');
        console.log(`[DEBUG] Query results: MainRows=${result.rows.length}, TotalCount=${total}`);
        const totalPages = Math.ceil(total / limit);

        const formattedAssets = result.rows.map(asset => {
            const initialCost = parseFloat(asset.price) || 0;
            const salvageValueNum = parseFloat(asset.salvageValue) || 0;
            const usefulLifeNum = parseInt(asset.usefulLife) || 5;
            
            let remainingValue = initialCost;
            let percentLifeRemaining = 100;
            let percentLifeElapsed = 0;
            let depreciationMessage = null;

            if (initialCost > 0 && usefulLifeNum > 0 && asset.purchaseDate) {
                const purchaseDate = new Date(asset.purchaseDate);
                const today = new Date();
                const ageYears = Math.max(0, (today.getTime() - purchaseDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
                
                const depreciationPerYear = (initialCost - salvageValueNum) / usefulLifeNum;
                const totalDepreciation = Math.max(0, Math.min(depreciationPerYear * ageYears, initialCost - salvageValueNum));
                remainingValue = initialCost - totalDepreciation;
                
                percentLifeElapsed = (ageYears / usefulLifeNum) * 100;
                percentLifeElapsed = Math.min(100, percentLifeElapsed);
                percentLifeRemaining = Math.max(0, 100 - percentLifeElapsed);

                if (percentLifeRemaining < 60) {
                    depreciationMessage = `Depreciation alert: remaining life is ${percentLifeRemaining.toFixed(1)}%. Please scrap or upgrade this asset.`;
                }
            }

            return {
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
                receiverId: asset.operatorId ? asset.operatorId.toString() : null,
                usefulLife: usefulLifeNum,
                salvageValue: asset.salvageValue || null,
                remainingValue: parseFloat(remainingValue.toFixed(2)),
                depreciationMessage
            };
        });

        return res.status(200).json({
            message: 'Assets fetched successfully!',
            count: formattedAssets.length,
            total,
            page,
            limit,
            totalPages,
            assets: formattedAssets
        });

    } catch (error) {
        console.error('Get All Assets Error:', error);
        return res.status(500).json({ message: 'Internal server error.' });
    }
}

export default withAuth(handler);