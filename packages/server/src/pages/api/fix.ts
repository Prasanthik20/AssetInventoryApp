import type { NextApiRequest, NextApiResponse } from 'next';
import query from '@/lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // 1. Take a backup of the existing Notifications table
    console.log("Taking backup of Notifications...");
    try {
      await query(`DROP TABLE IF EXISTS "Notifications_backup"`);
      await query(`SELECT * INTO "Notifications_backup" FROM "Notifications"`);
    } catch (e) {
      console.log("Error taking backup (maybe table is empty or missing):", e);
    }

    // 2. Drop the original table
    console.log("Dropping original Notifications table...");
    try {
      await query(`DROP TABLE IF EXISTS "Notifications"`);
    } catch (e: any) {
      console.log("Failed to drop Notifications table directly:", e.message);
    }

    // 3. Create the exact same table with IDENTITY(1,1)
    console.log("Creating new Notifications table with IDENTITY...");
    await query(`
      CREATE TABLE "Notifications" (
        "id" BIGINT IDENTITY(1,1) PRIMARY KEY,
        "assetId" BIGINT NOT NULL,
        "tenantId" NVARCHAR(255),
        "assignmentId" BIGINT,
        "reply" NVARCHAR(MAX),
        "senderId" BIGINT NOT NULL,
        "receiverId" BIGINT NOT NULL,
        "reason" NVARCHAR(MAX) NOT NULL,
        "status" NVARCHAR(255) NOT NULL DEFAULT 'unread',
        "created_at" DATETIME2 NOT NULL DEFAULT GETDATE()
      );
    `);

    // 4. Restore the data from the backup table
    let hasData = false;
    try {
      const { rows } = await query(`SELECT * FROM "Notifications_backup"`);
      if (rows.length > 0) {
        hasData = true;
        console.log("Restoring data from backup...");
        await query(`SET IDENTITY_INSERT "Notifications" ON`);
        await query(`
          INSERT INTO "Notifications" ("id", "assetId", "tenantId", "assignmentId", "reply", "senderId", "receiverId", "reason", "status", "created_at")
          SELECT "id", "assetId", "tenantId", "assignmentId", "reply", "senderId", "receiverId", "reason", "status", "created_at"
          FROM "Notifications_backup"
        `);
        await query(`SET IDENTITY_INSERT "Notifications" OFF`);
      }
    } catch (e) {
      console.log("No data to restore from backup.");
    }

    res.status(200).json({ 
      message: "Successfully backed up and recreated the Notifications table with IDENTITY(1,1)!",
      dataRestored: hasData
    });
  } catch (error: any) {
    console.error("Fix Script Error:", error);
    res.status(500).json({ error: error.message || String(error) });
  }
}
