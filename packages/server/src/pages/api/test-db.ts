import type { NextApiRequest, NextApiResponse } from 'next';
import query from '@/lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    try {
        const result = await query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'Asset_Assignments';
        `, []);
        res.status(200).json(result.rows);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
}
