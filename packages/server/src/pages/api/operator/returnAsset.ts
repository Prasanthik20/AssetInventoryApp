import type { NextApiRequest, NextApiResponse } from 'next';
import query from '@/lib/db';
import { setCorsHeaders } from '@/lib/corsHeaders';

export const config = {
    api: {
        bodyParser: {
            sizeLimit: '2gb',
        },
    },
};

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
        const { assetIds, operatorEmployeeId, photoURL, barcodeURL, assetMedia } = req.body;

        if (!Array.isArray(assetIds) || assetIds.length === 0) {
            return res.status(400).json({ message: 'assetIds required' });
        }

        if (typeof operatorEmployeeId !== 'number') {
            return res.status(400).json({ message: 'operatorEmployeeId required' });
        }

        const assetIdsInt = assetIds.map(Number);
        const assetMediaMap = new Map<number, { photoURL?: string; barcodeURL?: string }>();

        if (Array.isArray(assetMedia)) {
            for (const entry of assetMedia) {
                const assetId = Number(entry?.assetId);
                if (!Number.isFinite(assetId)) {
                    continue;
                }

                assetMediaMap.set(assetId, {
                    photoURL: typeof entry?.photoURL === 'string' ? entry.photoURL : undefined,
                    barcodeURL: typeof entry?.barcodeURL === 'string' ? entry.barcodeURL : undefined,
                });
            }
        }

        for (const assetId of assetIdsInt) {
            const media = assetMediaMap.get(assetId) || {
                photoURL: typeof photoURL === 'string' ? photoURL : undefined,
                barcodeURL: typeof barcodeURL === 'string' ? barcodeURL : undefined,
            };

            // 1️⃣ Mark assignment as returned: UPDATE the active assignment record
            // Only the most recent 'assigned' status record gets updated to 'returned'
            // This maintains immutable history: each assignment has a complete lifecycle
            const returnResult = await query(
                `
                UPDATE "Asset_Assignments"
                SET 
                    "status" = 'returned',
                    "returned_date" = NOW(),
                    "photoURL" = COALESCE($3, "photoURL"),
                    "barcodeURL" = COALESCE($4, "barcodeURL"),
                    "serialNoVerified" = true
                WHERE id = (
                    SELECT id
                    FROM "Asset_Assignments"
                    WHERE "operator_employeeId" = $1
                      AND "assetId" = $2
                      AND "status" = 'assigned'
                    ORDER BY "assigned_date" DESC NULLS LAST, id DESC
                    LIMIT 1
                )
                RETURNING id
                `,
                [operatorEmployeeId, assetId, media.photoURL ?? null, media.barcodeURL ?? null]
            );

            // Verify the assignment was found and updated
            if (returnResult.rows.length === 0) {
                console.warn(`No active assignment found for operator ${operatorEmployeeId} and asset ${assetId}`);
            }

            // 2️⃣ Unassign asset: UPDATE Asset_Details to reflect current state
            const updateClauses = [
                'assigned_to = NULL',
                'assigned_by = NULL',
                `status_id = (
                    SELECT id FROM "Status" 
                    WHERE status ILIKE 'Unassigned' 
                    LIMIT 1
                )`
            ];
            const updateValues: Array<string | number | null> = [assetId];

            if (media.photoURL) {
                updateClauses.push(`"photoURL" = $${updateValues.length + 1}`);
                updateValues.push(media.photoURL);
            }

            if (media.barcodeURL) {
                updateClauses.push(`"barcodeURL" = $${updateValues.length + 1}`);
                updateValues.push(media.barcodeURL);
            }

            await query(
                `
                UPDATE "Asset_Details"
                SET ${updateClauses.join(', ')}
                WHERE id = $1
                `,
                updateValues
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
