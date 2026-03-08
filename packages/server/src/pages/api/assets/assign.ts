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
    if (req.method !== 'POST') return res.status(405).json({ message: "Method not allowed" });

    try {
        type MediaPayload = { photoURL?: string; barcodeURL?: string };

        const normalizeMediaValue = (...values: unknown[]): string | undefined => {
            for (const value of values) {
                if (typeof value === 'string' && value.trim().length > 0) {
                    return value;
                }
            }
            return undefined;
        };

        const toAssetId = (value: unknown): number | null => {
            const parsed = Number(value);
            return Number.isFinite(parsed) ? parsed : null;
        };

        const toMediaPayload = (entry: any): MediaPayload => ({
            photoURL: normalizeMediaValue(entry?.photoURL, entry?.photoUrl, entry?.photo, entry?.image, entry?.assetPhoto),
            barcodeURL: normalizeMediaValue(
                entry?.barcodeURL,
                entry?.barcodeUrl,
                entry?.barcodeImage,
                entry?.barcode_image,
                entry?.assetBarcode,
            ),
        });

        const {
            assetIds,
            operator_employeeId,
            supervisor_employeeId,
            assigned_date,
            expected_return_date,
            project_name,
            destination,
            notes,
            photoURL,
            barcodeURL,
            assetMedia
        } = req.body;

        if (!assetIds || !Array.isArray(assetIds) || assetIds.length === 0) {
            return res.status(400).json({ message: "No assets selected for assignment" });
        }

        const normalizedAssetIds = assetIds
            .map((id: unknown) => toAssetId(id))
            .filter((id: number | null): id is number => id !== null);

        if (normalizedAssetIds.length === 0) {
            return res.status(400).json({ message: "Invalid assetIds payload" });
        }

        // 1. Get Status ID for 'Assigned' with error handling
        const statusResult = await query(`SELECT id FROM "Status" WHERE status = 'Assigned' LIMIT 1`, []);
        
        if (statusResult.rows.length === 0) {
            return res.status(500).json({ message: "System Error: 'Assigned' status not found in database." });
        }
        
        const statusId = statusResult.rows[0].id;

        const assetMediaMap = new Map<number, MediaPayload>();

        if (Array.isArray(assetMedia)) {
            for (const entry of assetMedia) {
                const assetId = toAssetId(entry?.assetId ?? entry?.id);
                if (assetId === null) {
                    continue;
                }

                assetMediaMap.set(assetId, toMediaPayload(entry));
            }
        } else if (assetMedia && typeof assetMedia === 'object') {
            // Support object payloads keyed by assetId, e.g. { "13": { photoURL, barcodeURL } }
            for (const [key, entry] of Object.entries(assetMedia as Record<string, unknown>)) {
                const assetId = toAssetId(key);
                if (assetId === null) {
                    continue;
                }

                assetMediaMap.set(assetId, toMediaPayload(entry));
            }
        }

        const fallbackMedia: MediaPayload = {
            photoURL: normalizeMediaValue(photoURL, req.body?.photoUrl, req.body?.image),
            barcodeURL: normalizeMediaValue(barcodeURL, req.body?.barcodeUrl, req.body?.barcodeImage, req.body?.barcode_image),
        };

        const assignmentMediaSummary: Array<{ assetId: number; hasPhoto: boolean; hasBarcode: boolean }> = [];

        // 2. Start a single loop for the updates
        // Note: For high-scale apps, use a SQL TRANSACTION here
        await Promise.all(normalizedAssetIds.map(async (assetId) => {
            const media = assetMediaMap.get(assetId) || fallbackMedia;

            assignmentMediaSummary.push({
                assetId,
                hasPhoto: !!media.photoURL,
                hasBarcode: !!media.barcodeURL,
            });

            // Update Asset_Details: source of truth for latest asset media/status.
            // COALESCE avoids overwriting existing values when an incoming field is missing.
            await query(
                `
                    UPDATE "Asset_Details"
                    SET status_id = $1,
                        assigned_by = $2,
                        assigned_to = $3,
                        location = $4,
                        "photoURL" = COALESCE($5, "photoURL"),
                        "barcodeURL" = COALESCE($6, "barcodeURL")
                    WHERE id = $7`,
                [
                    statusId,
                    supervisor_employeeId,
                    operator_employeeId,
                    destination,
                    media.photoURL ?? null,
                    media.barcodeURL ?? null,
                    assetId,
                ]
            );

            // Insert into Asset_Assignments: The history log
            // Each assignment record is immutable - status and dates only change on return
            await query(`
                INSERT INTO "Asset_Assignments"
                ("assetId", "operator_employeeId", "supervisor_employeeId", "projectName", "location", "assigned_date", "expected_return_date", "notes", "photoURL", "barcodeURL", "status", "serialNoVerified", "createdAt")
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'assigned', true, NOW())`,
                [
                    assetId,
                    operator_employeeId,
                    supervisor_employeeId,
                    project_name,
                    destination,
                    assigned_date,
                    expected_return_date,
                    notes,
                    media.photoURL ?? null,
                    media.barcodeURL ?? null,
                ]
            );
        }));

        console.log('[assign] Asset_Assignments media summary:', assignmentMediaSummary);

        return res.status(200).json({ 
            message: `${normalizedAssetIds.length} Assets assigned successfully`,
            assignedTo: operator_employeeId,
            mediaSummary: assignmentMediaSummary,
        });

    } catch (error) {
        console.error("Assign Asset API Error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
}