import type { NextApiRequest, NextApiResponse } from 'next';
import { poolPromise } from '@/lib/db'; // Import our new poolPromise
import bcrypt from 'bcrypt';
import sql from 'mssql';
import corsHandler from '@/lib/cors';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {

    return corsHandler(req, res, async () => {
        if (req.method !== 'POST') {
            res.setHeader('Allow', ['POST']);
            return res.status(405).end(`Method ${req.method} Not Allowed`);
        }
      try {
            const { email, password } = req.body;
            if (!email || !password) {
                return res.status(400).json({ message: 'Email and password are required.' });
            }

            // --- MODIFICATION: Await the poolPromise ---
            const pool = await poolPromise;

            // Now 'pool' is the actual connection pool, and you can call .request() on it
            const result = await pool.request()
                .input('Email', sql.NVarChar, email.toLowerCase())
                .query(`
                    SELECT 
                        u.UserID, 
                        u.PasswordHash, 
                        r.RoleName 
                    FROM 
                        Users u
                    INNER JOIN 
                        Roles r ON u.RoleID = r.RoleID
                    WHERE 
                        u.Email = @Email;
                `);

            if (result.recordset.length === 0) {
                 return res.status(401).json({ message: 'Invalid credentials.' });
            }

            const user = result.recordset[0];
            const isMatch = await bcrypt.compare(password, user.PasswordHash);

            if (!isMatch) {
                return res.status(401).json({ message: 'Invalid credentials.' });
            }

            return res.status(200).json({ 
                message: 'Login successful!',
                role: user.RoleName
            });

        } catch (error) {
            console.error('Login API Error:', error);
            return res.status(500).json({ message: 'An internal server error occurred.' });
        }
    });
}