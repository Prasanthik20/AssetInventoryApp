import type { NextApiRequest, NextApiResponse } from 'next';
import query from '@/lib/db';

export default async function testHandler(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> {
  try {
    const email = 'amar@sreevarshith.com';
    await query(`UPDATE "Users" SET "roleId" = '8' WHERE "email" = $1`, [email]);
    const updated = await query(`SELECT * FROM "Users" WHERE "email" = $1`, [email]);
    res.status(200).json({ message: "Updated", user: updated.rows[0] });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}
