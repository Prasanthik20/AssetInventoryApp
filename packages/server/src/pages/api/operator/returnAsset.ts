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

        const resolveEmployeeId = async (incomingId: number, roleLabel: 'operator' | 'supervisor'): Promise<number> => {
            if (!Number.isFinite(incomingId)) {
                throw new Error(`Invalid ${roleLabel} id`);
            }

            // Prefer direct employeeId first to avoid accidental userId cross-match.
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

        const { assetIds, operatorEmployeeId, photoURL, barcodeURL, assetMedia, assignmentIds } = req.body;

        if (!Array.isArray(assetIds) || assetIds.length === 0) {
            return res.status(400).json({ message: 'assetIds required' });
        }

        const incomingOperatorId = Number(operatorEmployeeId);
        if (!Number.isFinite(incomingOperatorId)) {
            return res.status(400).json({ message: 'operatorEmployeeId required' });
        }

        const resolvedOperatorEmployeeId = await resolveEmployeeId(incomingOperatorId, 'operator');
        const operatorName = await resolveDisplayName(resolvedOperatorEmployeeId);
        const adminEmployeeIds = await fetchAdminEmployeeIds();
        const adminEmployeeIdSet = new Set(adminEmployeeIds);

        const assetIdsInt = assetIds.map(Number);
        const assignmentIdMap = new Map<number, number>();

        if (Array.isArray(assignmentIds)) {
            assignmentIds.forEach((assignmentIdValue: unknown, index: number) => {
                const assignmentId = Number(assignmentIdValue);
                const assetId = Number(assetIdsInt[index]);
                if (Number.isFinite(assignmentId) && Number.isFinite(assetId)) {
                    assignmentIdMap.set(assetId, assignmentId);
                }
            });
        }

        const assetMediaMap = new Map<number, { photoURL?: string; barcodeURL?: string }>();

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

        if (Array.isArray(assetMedia)) {
            for (const entry of assetMedia) {
                const assetId = Number(entry?.assetId);
                if (!Number.isFinite(assetId)) {
                    continue;
                }

                const assignmentId = Number(entry?.assignmentId);
                if (Number.isFinite(assignmentId)) {
                    assignmentIdMap.set(assetId, assignmentId);
                }

                const photoURLs = normalizeMediaValues(
                    entry?.photoURLs,
                    entry?.photos,
                    entry?.photoURL,
                    entry?.photoUrl,
                    entry?.photo,
                    entry?.image,
                );
                const barcodeURLs = normalizeMediaValues(
                    entry?.barcodeURLs,
                    entry?.barcodes,
                    entry?.barcodeURL,
                    entry?.barcodeUrl,
                    entry?.barcodeImage,
                    entry?.barcode_image,
                );

                assetMediaMap.set(assetId, {
                    photoURL: photoURLs[0],
                    barcodeURL: barcodeURLs[0],
                });
            }
        }

        for (const assetId of assetIdsInt) {
            const media = assetMediaMap.get(assetId) || {
                photoURL: firstMediaValue(fallbackPhotoURLs, photoURL),
                barcodeURL: firstMediaValue(fallbackBarcodeURLs, barcodeURL),
            };

            const targetAssignmentId = assignmentIdMap.get(assetId);

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
                                WHERE id = COALESCE($5, (
                    SELECT id
                    FROM "Asset_Assignments"
                    WHERE "operator_employeeId" = $1
                      AND "assetId" = $2
                                            AND COALESCE("status", '') <> 'returned'
                                            AND "returned_date" IS NULL
                    ORDER BY "assigned_date" DESC NULLS LAST, id DESC
                    LIMIT 1
                                ))
                                    AND "operator_employeeId" = $1
                                    AND "assetId" = $2
                                    AND COALESCE("status", '') <> 'returned'
                                RETURNING id, "supervisor_employeeId"
                `,
                                                                [
                                                                        resolvedOperatorEmployeeId,
                                                                        assetId,
                                                                        media.photoURL ?? null,
                                                                        media.barcodeURL ?? null,
                                                                        Number.isFinite(targetAssignmentId) ? Number(targetAssignmentId) : null,
                                                                ]
            );

            // Verify the assignment was found and updated
            if (returnResult.rows.length === 0) {
                console.warn(`No active assignment found for operator ${resolvedOperatorEmployeeId} and asset ${assetId}`);
                continue;
            }

            const assignmentId = Number(returnResult.rows[0]?.id);
            const assigningSupervisorId = await resolveEmployeeId(
                Number(returnResult.rows[0]?.supervisor_employeeId),
                'supervisor',
            );
            const assigningSupervisorName = await resolveDisplayName(assigningSupervisorId);

            // 2️⃣ Keep asset under supervisor until return is confirmed.
            const updateClauses = [
                'assigned_to = $2',
                'assigned_by = $2',
                `status_id = (
                    SELECT id FROM "Status" 
                    WHERE status ILIKE 'Assigned' 
                    LIMIT 1
                )`
            ];
            const updateValues: Array<string | number | null> = [assetId, assigningSupervisorId];

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

            const recipients = new Set<number>([...adminEmployeeIds, assigningSupervisorId]);
            for (const receiverEmployeeId of recipients) {
                if (!Number.isFinite(receiverEmployeeId)) {
                    continue;
                }

                const reason = `Asset ${assetId} has been returned by ${operatorName}.`;
                const reply = adminEmployeeIdSet.has(receiverEmployeeId)
                    ? `Return pending confirmation: Asset ${assetId} was returned by ${operatorName} and is now with ${assigningSupervisorName}.`
                    : `Return pending confirmation: ${operatorName} returned asset ${assetId}. Please confirm final return.`;

                await createNotification(
                    assetId,
                    assignmentId,
                    resolvedOperatorEmployeeId,
                    receiverEmployeeId,
                    reason,
                    reply,
                );
            }
        }

        return res.status(200).json({
            message: 'Assets returned and moved to supervisor pending confirmation',
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Server error' });
    }
}
