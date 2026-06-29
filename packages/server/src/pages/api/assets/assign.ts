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
    if (req.method === 'GET') {
        return getAssignment(req, res);
    }
    if (req.method === 'PUT') {
        return updateAssignment(req, res);
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
            tenantId?: string | null,
        ): Promise<void> => {
            await query(
                `INSERT INTO "Notifications"
                 ("assetId", "assignmentId", "senderId", "receiverId", "reason", "reply", "status", "created_at", "tenantId")
                 VALUES ($1, $2, $3, $4, $5, $6, 'unread', NOW(), $7)`,
                [assetId, assignmentId, senderEmployeeId, receiverEmployeeId, reason, reply ?? null, tenantId ?? null],
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
            assignedDate,
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
        const normalizedAssignedDate =
            typeof assigned_date === 'string' && assigned_date.trim()
                ? assigned_date.trim()
                : typeof assignedDate === 'string' && assignedDate.trim()
                    ? assignedDate.trim()
                    : new Date().toISOString().split('T')[0];

        const resolveEmployeeId = async (incomingId: number, roleLabel: 'assignee' | 'assigner'): Promise<{ employeeId: number, tenantId: string | null }> => {
            if (!Number.isFinite(incomingId)) {
                throw new Error(`Invalid ${roleLabel} id`);
            }

            // Prefer direct employeeId match to avoid accidental cross-match with userId.
            const directEmployeeResult = await query(
                `SELECT "employeeId", "tenantId"
                 FROM "Users"
                 WHERE "employeeId" = $1
                 LIMIT 1`,
                [incomingId],
            );

            if (directEmployeeResult.rows.length > 0) {
                return { employeeId: Number(directEmployeeResult.rows[0].employeeId), tenantId: directEmployeeResult.rows[0].tenantId || null };
            }

            const userIdFallbackResult = await query(
                `SELECT "employeeId", "tenantId"
                 FROM "Users"
                 WHERE id = $1
                 LIMIT 1`,
                [incomingId],
            );

            const fallbackEmployeeId = Number(userIdFallbackResult.rows[0]?.employeeId);
            if (Number.isFinite(fallbackEmployeeId)) {
                return { employeeId: fallbackEmployeeId, tenantId: userIdFallbackResult.rows[0]?.tenantId || null };
            }

            throw new Error(`Could not resolve ${roleLabel} with id ${incomingId}`);
        };

        const resolvedOperator = await resolveEmployeeId(incomingOperatorId, 'assignee');
        const resolvedSupervisor = await resolveEmployeeId(incomingSupervisorId, 'assigner');
        
        const resolvedOperatorEmployeeId = resolvedOperator.employeeId;
        const resolvedSupervisorEmployeeId = resolvedSupervisor.employeeId;
        const tenantId = resolvedOperator.tenantId || resolvedSupervisor.tenantId;

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

        const receiverId = resolvedOperator.employeeId;
        const senderId = resolvedSupervisor.employeeId;

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
                ("assetId", "operator_employeeId", "supervisor_employeeId", "projectName", "location", "assigned_date", "expected_return_date", "notes", "photoURL", "barcodeURL", "status", "serialNoVerified", "createdAt", "tenantId")
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'assigned', true, NOW(), $11)
                RETURNING id`,
                [
                    assetId,
                    receiverId,
                    senderId,
                    project_name,
                    destination,
                    normalizedAssignedDate,
                    expected_return_date,
                    notes,
                    dbPhotoURL ?? null,
                    dbBarcodeURL ?? null,
                    tenantId,
                ]
            );

            const assignmentId = assignmentInsert.rows[0]?.id ?? null;

            await createNotification(
                assetId,
                assignmentId,
                senderId,
                receiverId,
                `Asset ${assetId} has been assigned to you by ${senderName}.`,
                undefined,
                tenantId
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
                    tenantId
                );
            }
        }));

        console.log('[assign] Asset_Assignments media summary:', assignmentMediaSummary);

        return res.status(200).json({ 
            message: `${normalizedAssetIds.length} Assets assigned successfully`,
            assignedTo: receiverId,
            assignedDate: normalizedAssignedDate,
            mediaSummary: assignmentMediaSummary,
        });

    } catch (error) {
        console.error("Assign Asset API Error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
}

async function getAssignment(req: NextApiRequest, res: NextApiResponse) {
    try {
        const assignmentId = Number(req.query.assignmentId);
        const assetId = Number(req.query.assetId);

        let sql = `
            SELECT
                aa.id,
                aa."assetId",
                aa."projectName",
                aa.location,
                aa.assigned_date,
                aa.expected_return_date,
                aa.notes,
                aa.status,
                aa."operator_employeeId",
                aa."supervisor_employeeId",
                uo."fullName" AS "operatorName",
                us."fullName" AS "supervisorName"
            FROM "Asset_Assignments" aa
            LEFT JOIN "Users" uo ON uo."employeeId" = aa."operator_employeeId"
            LEFT JOIN "Users" us ON us."employeeId" = aa."supervisor_employeeId"
        `;

        const params: number[] = [];

        if (Number.isFinite(assignmentId)) {
            params.push(assignmentId);
            sql += ` WHERE aa.id = $1 `;
        } else if (Number.isFinite(assetId)) {
            params.push(assetId);
            sql += ` WHERE aa."assetId" = $1 ORDER BY aa.id DESC LIMIT 1 `;
        } else {
            return res.status(400).json({ message: 'assignmentId or assetId is required' });
        }

        if (Number.isFinite(assignmentId)) {
            sql += ` LIMIT 1 `;
        }

        const result = await query(sql, params);

        if (!result.rows.length) {
            return res.status(404).json({ message: 'Assignment not found' });
        }

        const row = result.rows[0];
        const formatDate = (value: string | null) =>
            value ? new Date(value).toISOString().split('T')[0] : null;

        return res.status(200).json({
            assignmentId: row.id,
            assetId: row.assetId,
            projectName: row.projectName || null,
            location: row.location || null,
            assignedDate: formatDate(row.assigned_date),
            expectedReturnDate: formatDate(row.expected_return_date),
            notes: row.notes || null,
            status: row.status || null,
            operatorEmployeeId: row.operator_employeeId || null,
            supervisorEmployeeId: row.supervisor_employeeId || null,
            operatorName: row.operatorName || null,
            supervisorName: row.supervisorName || null,
        });
    } catch (error: any) {
        console.error('Get assignment error:', error);
        return res.status(500).json({ message: error.message || 'Internal server error' });
    }
}

async function updateAssignment(req: NextApiRequest, res: NextApiResponse) {
    try {
        const {
            assignmentId,
            assetId,
            project_name,
            destination,
            assigned_date,
            expected_return_date,
            notes,
        } = req.body;

        const resolvedAssignmentId = Number(assignmentId);
        if (!Number.isFinite(resolvedAssignmentId)) {
            return res.status(400).json({ message: 'assignmentId is required' });
        }

        const updates: string[] = [];
        const values: any[] = [];
        let paramIndex = 1;

        if (project_name !== undefined) {
            updates.push(`"projectName" = $${paramIndex++}`);
            values.push(project_name || null);
        }

        if (destination !== undefined) {
            updates.push(`location = $${paramIndex++}`);
            values.push(destination || null);
        }

        if (assigned_date !== undefined) {
            updates.push(`assigned_date = $${paramIndex++}`);
            values.push(assigned_date || null);
        }

        if (expected_return_date !== undefined) {
            updates.push(`expected_return_date = $${paramIndex++}`);
            values.push(expected_return_date || null);
        }

        if (notes !== undefined) {
            updates.push(`notes = $${paramIndex++}`);
            values.push(notes || null);
        }

        if (updates.length === 0) {
            return res.status(400).json({ message: 'No fields to update' });
        }

        values.push(resolvedAssignmentId);

        const result = await query(
            `UPDATE "Asset_Assignments"
             SET ${updates.join(', ')}
             WHERE id = $${paramIndex}
             RETURNING id, "assetId", "projectName", location, assigned_date, expected_return_date`,
            values,
        );

        if (!result.rows.length) {
            return res.status(404).json({ message: 'Assignment not found' });
        }

        const updatedAssignment = result.rows[0];

        if (destination !== undefined) {
            const resolvedAssetId = Number(assetId || updatedAssignment.assetId);
            if (Number.isFinite(resolvedAssetId)) {
                await query(
                    `UPDATE "Asset_Details"
                     SET location = $1
                     WHERE id = $2`,
                    [destination || null, resolvedAssetId],
                );
            }
        }

        const formatDate = (value: string | null) =>
            value ? new Date(value).toISOString().split('T')[0] : null;

        return res.status(200).json({
            message: 'Assignment updated successfully',
            assignmentId: updatedAssignment.id,
            assetId: updatedAssignment.assetId,
            projectName: updatedAssignment.projectName || null,
            location: updatedAssignment.location || null,
            assignedDate: formatDate(updatedAssignment.assigned_date),
            expectedReturnDate: formatDate(updatedAssignment.expected_return_date),
        });
    } catch (error: any) {
        console.error('Update assignment error:', error);
        return res.status(500).json({ message: error.message || 'Internal server error' });
    }
}