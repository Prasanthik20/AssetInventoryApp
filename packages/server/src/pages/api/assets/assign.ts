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
        type MediaPayload = {
            photoURL?: string;
            barcodeURL?: string;
            photoURLs?: string[];
            barcodeURLs?: string[];
        };

        const normalizeMediaValues = (...values: unknown[]): string[] => {
            for (const value of values) {
                if (Array.isArray(value)) {
                    const normalized = value
                        .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
                        .filter((entry) => entry.length > 0);
                    if (normalized.length > 0) {
                        return normalized;
                    }
                }

                if (typeof value === 'string' && value.trim().length > 0) {
                    return [value.trim()];
                }
            }
            return [];
        };

        const firstMediaValue = (...values: unknown[]): string | undefined => {
            const normalized = normalizeMediaValues(...values);
            return normalized[0];
        };

        const toAssetId = (value: unknown): number | null => {
            const parsed = Number(value);
            return Number.isFinite(parsed) ? parsed : null;
        };

        const toMediaPayload = (entry: any): MediaPayload => {
            const photoURLs = normalizeMediaValues(
                entry?.photoURLs,
                entry?.photos,
                entry?.photoURL,
                entry?.photoUrl,
                entry?.photo,
                entry?.image,
                entry?.assetPhoto,
            );
            const barcodeURLs = normalizeMediaValues(
                entry?.barcodeURLs,
                entry?.barcodes,
                entry?.barcodeURL,
                entry?.barcodeUrl,
                entry?.barcodeImage,
                entry?.barcode_image,
                entry?.assetBarcode,
            );

            return {
                photoURL: photoURLs[0],
                barcodeURL: barcodeURLs[0],
                photoURLs,
                barcodeURLs,
            };
        };

        const createNotification = async (
            assetId: number,
            assignmentId: number | null,
            senderEmployeeId: number,
            receiverEmployeeId: number,
            reason: string,
            reply?: string,
        ): Promise<void> => {
            await query(
                `INSERT INTO "Notifications"
                 ("assetId", "assignmentId", "senderId", "receiverId", "reason", "reply", "status", "created_at")
                 VALUES ($1, $2, $3, $4, $5, $6, 'unread', NOW())`,
                [assetId, assignmentId, senderEmployeeId, receiverEmployeeId, reason, reply ?? null],
            );
        };

        const resolveDisplayName = async (employeeId: number): Promise<string> => {
            const result = await query(
                `SELECT "fullName"
                 FROM "Users"
                 WHERE "employeeId" = $1
                 LIMIT 1`,
                [employeeId],
            );

            return String(result.rows[0]?.fullName || employeeId);
        };

        const fetchAdminEmployeeIds = async (): Promise<number[]> => {
            const result = await query(
                `SELECT DISTINCT u."employeeId"
                 FROM "Users" u
                 INNER JOIN "Roles" r ON u."roleId" = r."roleId"
                 WHERE LOWER(r."roleName") IN ('admin', 'super admin', 'superadmin')`,
                [],
            );

            return result.rows
                .map((row: { employeeId: unknown }) => Number(row.employeeId))
                .filter((id: number) => Number.isFinite(id));
        };

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

        const incomingOperatorId = Number(operator_employeeId);
        const incomingSupervisorId = Number(supervisor_employeeId);

        const resolveEmployeeId = async (incomingId: number, roleLabel: 'assignee' | 'assigner'): Promise<number> => {
            if (!Number.isFinite(incomingId)) {
                throw new Error(`Invalid ${roleLabel} id`);
            }

            // Prefer direct employeeId match to avoid accidental cross-match with userId.
            const directEmployeeResult = await query(
                `SELECT "employeeId"
                 FROM "Users"
                 WHERE "employeeId" = $1
                 LIMIT 1`,
                [incomingId],
            );

            const directEmployeeId = Number(directEmployeeResult.rows[0]?.employeeId);
            if (Number.isFinite(directEmployeeId)) {
                return directEmployeeId;
            }

            const userIdFallbackResult = await query(
                `SELECT "employeeId"
                 FROM "Users"
                 WHERE "userId" = $1
                 LIMIT 1`,
                [incomingId],
            );

            const resolved = Number(userIdFallbackResult.rows[0]?.employeeId);
            if (!Number.isFinite(resolved)) {
                throw new Error(`Unable to resolve ${roleLabel} employee id`);
            }

            return resolved;
        };

        if (!assetIds || !Array.isArray(assetIds) || assetIds.length === 0) {
            return res.status(400).json({ message: "No assets selected for assignment" });
        }

        const normalizedAssetIds = assetIds
            .map((id: unknown) => toAssetId(id))
            .filter((id: number | null): id is number => id !== null);

        if (normalizedAssetIds.length === 0) {
            return res.status(400).json({ message: "Invalid assetIds payload" });
        }

        if (!Number.isFinite(incomingOperatorId) || !Number.isFinite(incomingSupervisorId)) {
            return res.status(400).json({ message: "Invalid assignee or assigner id" });
        }

        const receiverId = await resolveEmployeeId(incomingOperatorId, 'assignee');
        const senderId = await resolveEmployeeId(incomingSupervisorId, 'assigner');

        // 1. Get Status ID for 'Assigned' with error handling
        const statusResult = await query(`SELECT id FROM "Status" WHERE status = 'Assigned' LIMIT 1`, []);
        
        if (statusResult.rows.length === 0) {
            return res.status(500).json({ message: "System Error: 'Assigned' status not found in database." });
        }
        
        const statusId = statusResult.rows[0].id;
        const senderName = await resolveDisplayName(senderId);
        const receiverName = await resolveDisplayName(receiverId);
        const adminEmployeeIds = await fetchAdminEmployeeIds();
        const adminEmployeeIdSet = new Set(adminEmployeeIds);

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

        const fallbackPhotoURLs = normalizeMediaValues(
            req.body?.photoURLs,
            req.body?.photos,
            photoURL,
            req.body?.photoUrl,
            req.body?.image,
        );
        const fallbackBarcodeURLs = normalizeMediaValues(
            req.body?.barcodeURLs,
            req.body?.barcodes,
            barcodeURL,
            req.body?.barcodeUrl,
            req.body?.barcodeImage,
            req.body?.barcode_image,
        );

        const fallbackMedia: MediaPayload = {
            photoURL: fallbackPhotoURLs[0],
            barcodeURL: fallbackBarcodeURLs[0],
            photoURLs: fallbackPhotoURLs,
            barcodeURLs: fallbackBarcodeURLs,
        };

        const assignmentMediaSummary: Array<{ assetId: number; hasPhoto: boolean; hasBarcode: boolean }> = [];

        // 2. Start a single loop for the updates
        // Note: For high-scale apps, use a SQL TRANSACTION here
        await Promise.all(normalizedAssetIds.map(async (assetId) => {
            const media = assetMediaMap.get(assetId) || fallbackMedia;

            const dbPhotoURL = firstMediaValue(media.photoURLs, media.photoURL);
            const dbBarcodeURL = firstMediaValue(media.barcodeURLs, media.barcodeURL);

            assignmentMediaSummary.push({
                assetId,
                hasPhoto: !!dbPhotoURL,
                hasBarcode: !!dbBarcodeURL,
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
                    senderId,
                    receiverId,
                    destination,
                    dbPhotoURL ?? null,
                    dbBarcodeURL ?? null,
                    assetId,
                ]
            );

            // Insert into Asset_Assignments: The history log
            // Each assignment record is immutable - status and dates only change on return
            const assignmentInsert = await query(`
                INSERT INTO "Asset_Assignments"
                ("assetId", "operator_employeeId", "supervisor_employeeId", "projectName", "location", "assigned_date", "expected_return_date", "notes", "photoURL", "barcodeURL", "status", "serialNoVerified", "createdAt")
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'assigned', true, NOW())
                RETURNING id`,
                [
                    assetId,
                    receiverId,
                    senderId,
                    project_name,
                    destination,
                    assigned_date,
                    expected_return_date,
                    notes,
                    dbPhotoURL ?? null,
                    dbBarcodeURL ?? null,
                ]
            );

            const assignmentId = assignmentInsert.rows[0]?.id ?? null;

            await createNotification(
                assetId,
                assignmentId,
                senderId,
                receiverId,
                `Asset ${assetId} has been assigned to you by ${senderName}.`,
            );

            const auditRecipients = new Set<number>([...adminEmployeeIds, senderId]);
            for (const auditReceiverId of auditRecipients) {
                if (!Number.isFinite(auditReceiverId) || auditReceiverId === receiverId) {
                    continue;
                }

                const reason = `Asset ${assetId} assigned from ${senderName} to ${receiverName}.`;
                const reply = adminEmployeeIdSet.has(auditReceiverId)
                    ? `Confirmation: ${receiverName} received assignment for asset ${assetId}.`
                    : null;

                await createNotification(
                    assetId,
                    assignmentId,
                    senderId,
                    auditReceiverId,
                    reason,
                    reply ?? undefined,
                );
            }
        }));

        console.log('[assign] Asset_Assignments media summary:', assignmentMediaSummary);

        return res.status(200).json({ 
            message: `${normalizedAssetIds.length} Assets assigned successfully`,
            assignedTo: receiverId,
            mediaSummary: assignmentMediaSummary,
        });

    } catch (error) {
        console.error("Assign Asset API Error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
}