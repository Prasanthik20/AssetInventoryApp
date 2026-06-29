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

type MediaPayload = {
  photoURL?: string;
  barcodeURL?: string;
};

const toNumber = (value: unknown): number | null => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const origin = req.headers.origin as string;
  setCorsHeaders(res, origin);

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const assetIdsRaw = Array.isArray(req.body?.assetIds) ? req.body.assetIds : [];
    const assetIds = assetIdsRaw
      .map((value: unknown) => toNumber(value))
      .filter((value: number | null): value is number => value !== null);

    const supervisorEmployeeId = toNumber(req.body?.supervisorEmployeeId);
    const assetMediaRaw = Array.isArray(req.body?.assetMedia) ? req.body.assetMedia : [];
    const assetMediaMap = new Map<number, MediaPayload>();

    for (const item of assetMediaRaw) {
      const assetId = toNumber(item?.assetId);
      if (!assetId) continue;
      assetMediaMap.set(assetId, {
        photoURL: typeof item?.photoURL === 'string' ? item.photoURL : undefined,
        barcodeURL: typeof item?.barcodeURL === 'string' ? item.barcodeURL : undefined,
      });
    }

    if (!supervisorEmployeeId) {
      return res.status(400).json({ message: 'supervisorEmployeeId is required' });
    }

    if (assetIds.length === 0) {
      return res.status(400).json({ message: 'No assets selected for return' });
    }

    const supervisorResult = await query(
      `SELECT "employeeId", "fullName", "tenantId"
       FROM "Users"
       WHERE "employeeId" = $1
       LIMIT 1`,
      [supervisorEmployeeId],
    );

    if (supervisorResult.rows.length === 0) {
      return res.status(404).json({ message: 'Supervisor not found' });
    }

    const supervisorName = String(supervisorResult.rows[0]?.fullName || supervisorEmployeeId);
    const tenantId = supervisorResult.rows[0]?.tenantId || null;

    const adminResult = await query(
      `SELECT DISTINCT u."employeeId"
       FROM "Users" u
       INNER JOIN "Roles" r ON u."roleId" = r."roleId"
       WHERE LOWER(r."roleName") IN ('admin', 'super admin', 'superadmin')`,
      [],
    );

    const adminIds = adminResult.rows
      .map((row: { employeeId: unknown }) => Number(row.employeeId))
      .filter((id: number) => Number.isFinite(id));

    for (const assetId of assetIds) {
      const media = assetMediaMap.get(assetId) || {};

      const ownershipCheck = await query(
        `SELECT id
         FROM "Asset_Details"
         WHERE id = $1
           AND assigned_to = $2
         LIMIT 1`,
        [assetId, supervisorEmployeeId],
      );

      if (ownershipCheck.rows.length === 0) {
        continue;
      }

      await query(
        `UPDATE "Asset_Details"
         SET "photoURL" = COALESCE($2, "photoURL"),
             "barcodeURL" = COALESCE($3, "barcodeURL")
         WHERE id = $1`,
        [assetId, media.photoURL ?? null, media.barcodeURL ?? null],
      );

      for (const adminId of adminIds) {
        const replyPayload = {
            kind: 'return_notification',
            message: `Return pending confirmation by admin.`,
            tenantId: tenantId,
            returnedDate: new Date().toISOString()
        };

        await query(
          `INSERT INTO "Notifications"
            ("assetId", "assignmentId", "senderId", "receiverId", "reason", "reply", "status", "created_at", "tenantId")
           VALUES ($1, NULL, $2, $3, $4, $5, 'unread', NOW(), $6)`,
          [
            assetId,
            supervisorEmployeeId,
            adminId,
            `Asset ${assetId} has been returned by supervisor ${supervisorName}.`,
            JSON.stringify(replyPayload),
            tenantId,
          ],
        );
      }
    }

    return res.status(200).json({
      message: 'Supervisor return submitted for admin confirmation',
    });
  } catch (error) {
    console.error('Supervisor return API error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}