import type { NextApiRequest, NextApiResponse } from 'next';
import query from '@/lib/db'; // ✅ your database helper
import corsHandler from '@/lib/cors'; // ✅ handles CORS

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    return corsHandler(req, res, async () => {
        if (req.method !== 'GET') {
            res.setHeader('Allow', ['GET']);
            return res.status(405).end(`Method ${req.method} Not Allowed`);
        }

        try {
            // ✅ Query all users along with their role names
            const sqlQuery = `
                SELECT 
                    u."userId",
                    u."employeeId",
                    u."fullName",
                    u."email",
                    u."phoneNumber",
                    u."address",
                    u."photoURL",
                    r."roleName"
                FROM 
                    "Users" u
                INNER JOIN 
                    "Roles" r ON u."roleId" = r."roleId"
                ORDER BY 
                    u."fullName" ASC;
            `;

            const result = await query(sqlQuery, []);

            const users = result.rows.map((user: any) => ({
                userId: user.userId,
                employeeId: user.employeeId,
                fullName: user.fullName,
                email: user.email,
                phoneNumber: user.phoneNumber,
                address: user.address,
                photoURL: user.photoURL,
                role: user.roleName,
            }));

            return res.status(200).json({
                message: 'Users fetched successfully!',
                count: users.length,
                users,
            });

        } catch (error) {
            console.error('Get All Users API Error:', error);
            return res.status(500).json({
                message: 'An internal server error occurred while fetching users.',
            });
        }
    });
}
