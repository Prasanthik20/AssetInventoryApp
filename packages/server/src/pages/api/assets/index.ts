import type { NextApiResponse } from 'next';
import query from '@/lib/db';
import { setCorsHeaders } from '@/lib/corsHeaders';
import { withAuth, AuthenticatedRequest } from '@/lib/apiHandler';

// Module-level caches to avoid repeating heavy DB operations on every HTTP GET request
let isMigrated = false;
const lastOverdueUpdate = new Map<string, number>();

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

    // 1️⃣ Run auto-migration ONCE per process boot
    if (!isMigrated) {
        try {
            await query(`
                IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Asset_Details') AND name = 'useful_life')
                    ALTER TABLE "Asset_Details" ADD "useful_life" INT DEFAULT 5;
            `, []);
            isMigrated = true;
        } catch (err) {
            console.error('[AUTO-MIGRATION ERROR]', err);
            isMigrated = true;
        }
    }

    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(1000, Math.max(1, parseInt(req.query.limit as string) || 50));
    const offset = (page - 1) * limit;
    const includeMedia = req.query.includeMedia === 'true';

    let search = (req.query.search as string) || '';
    if (search === 'undefined' || search === 'null') search = '';
    const isSearch = search.trim().length > 0;

    try {
        // 2️⃣ Throttle the heavy UPDATE query (run at most once per 60s per tenant on page 1)
        const tenantKey = String(tenantId || 'global');
        const lastRun = lastOverdueUpdate.get(tenantKey) || 0;
        const now = Date.now();

        if (page === 1 && (now - lastRun > 60000)) {
            lastOverdueUpdate.set(tenantKey, now);
            const updateQuery = `
                UPDATE "Asset_Details"
                SET status_id = (
                    SELECT TOP 1 id FROM "Status" WHERE status = 'Overdue' AND ("tenantId" = $1 OR "tenantId" IS NULL)
                )
                WHERE status_id = (
                    SELECT TOP 1 id FROM "Status" WHERE status = 'Assigned' AND ("tenantId" = $1 OR "tenantId" IS NULL)
                )
                AND "tenantId" = $1
                AND assigned_to IS NOT NULL
                AND id IN (
                    SELECT "assetId" FROM "Asset_Assignments"
                    WHERE "expected_return_date" < GETDATE()
                      AND "tenantId" = $1
                      AND COALESCE(status, '') <> 'returned'
                      AND "returned_date" IS NULL
                );
            `;
            // Execute non-blocking update
            query(updateQuery, [tenantId]).catch(err => console.error('[OVERDUE UPDATE ERROR]', err));
        }

        // 3️⃣ Fetch assets with only the LATEST assignment record
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
                COALESCE(u."fullName", u_aa."fullName") AS "assignedBy",
                COALESCE(assignee."fullName", assignee_aa."fullName") AS "assignedTo",
                
                aa.id AS "assignmentId",
                aa."projectName" AS "projectName",
                aa.assigned_date AS "assignedDate",
                aa.expected_return_date AS "expectedReturnDate",
                aa.returned_date AS "returnedDate",
                COALESCE(aa."operator_employeeId", a.assigned_to) AS "operatorId",
                COALESCE(aa."supervisor_employeeId", a.assigned_by) AS "senderId"

            FROM "Asset_Details" a WITH (NOLOCK)
            LEFT JOIN "Category" cat WITH (NOLOCK) ON a."categoryId" = cat."categoryId"
            LEFT JOIN "Status" s WITH (NOLOCK) ON a.status_id = s.id
            
            OUTER APPLY (
                SELECT TOP 1 * FROM "Asset_Assignments" WITH (NOLOCK)
                WHERE "assetId" = a.id
                  AND (a."tenantId" = $1 OR "tenantId" = $1 OR "tenantId" IS NULL)
                  AND (COALESCE(status, '') <> 'returned')
                ORDER BY id DESC
            ) aa

            LEFT JOIN "Users" u WITH (NOLOCK) ON u."employeeId" = a.assigned_by AND (u."tenantId" = a."tenantId" OR a."tenantId" IS NULL)
            LEFT JOIN "Users" assignee WITH (NOLOCK) ON assignee."employeeId" = a.assigned_to AND (assignee."tenantId" = a."tenantId" OR a."tenantId" IS NULL)
            
            LEFT JOIN "Users" u_aa WITH (NOLOCK) ON u_aa."employeeId" = aa."supervisor_employeeId" AND (u_aa."tenantId" = a."tenantId" OR a."tenantId" IS NULL)
            LEFT JOIN "Users" assignee_aa WITH (NOLOCK) ON assignee_aa."employeeId" = aa."operator_employeeId" AND (assignee_aa."tenantId" = a."tenantId" OR a."tenantId" IS NULL)

            WHERE (a."tenantId" = $1 OR a."tenantId" IS NULL)
            ${isSearch ? `AND (a.name LIKE $2 OR a."asset_Id" LIKE $2 OR a."serial_no" LIKE $2)` : ''}
            ORDER BY a.id ASC
            OFFSET ${offset} ROWS FETCH NEXT ${limit} ROWS ONLY;
        `;

        const countQuery = `
            SELECT COUNT(*) as total
            FROM "Asset_Details" a WITH (NOLOCK)
            WHERE (a."tenantId" = $1 OR a."tenantId" IS NULL)
            ${isSearch ? `AND (a.name LIKE $2 OR a."asset_Id" LIKE $2 OR a."serial_no" LIKE $2)` : ''};
        `;

        const searchPattern = isSearch ? `%${search.trim()}%` : null;
        const mainParams = isSearch ? [tenantId, searchPattern] : [tenantId];
        const countParams = isSearch ? [tenantId, searchPattern] : [tenantId];

        const [result, countResult] = await Promise.all([
            query(sqlQuery, mainParams),
            query(countQuery, countParams),
        ]);

        const total = parseInt(countResult.rows[0]?.total || '0');
        const totalPages = Math.ceil(total / limit);

        // Helper to strip heavy base64 strings from list payloads unless explicitly requested
        const sanitizeMedia = (val: string | null): string | null => {
            if (!val) return null;
            if (includeMedia) return val;
            if (typeof val === 'string' && val.startsWith('data:')) {
                return null; // Omit multi-megabyte base64 strings in list responses
            }
            return val;
        };

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

            const formatLocation = (loc: string | null | undefined): string => {
                if (!loc || typeof loc !== 'string') return 'Office';
                const trimmed = loc.trim();
                if (!trimmed || trimmed.toLowerCase() === 'unassigned' || trimmed.toLowerCase() === 'null') {
                    return 'Office';
                }
                return trimmed;
            };

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
                location: formatLocation(asset.location),
                purchaseDate: asset.purchaseDate,
                warrantyExpiry: asset.warrantyExpiry,
                price: asset.price,
                photoURL: sanitizeMedia(asset.photoURL),
                barcodeURL: sanitizeMedia(asset.barcodeURL),
                expectedReturnDate: asset.expectedReturnDate || null,
                assignedDate: asset.assignedDate || null,
                returnedDate: asset.returnedDate || null,
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