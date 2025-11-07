import type { NextApiRequest, NextApiResponse } from 'next';
import { poolPromise } from '@/lib/db';
import bcrypt from 'bcrypt';
import sql from 'mssql';
import corsHandler from '@/lib/cors';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    return corsHandler(req, res, async () => {
        if (req.method !== 'POST') {
            return res.status(405).end('Method Not Allowed');
        }

        // Get all required fields from the request body
        const { employeeId, fullName, email, password, roleId } = req.body;

        // Validate input
        if (!employeeId || !fullName || !email || !password || !roleId) {
            return res.status(400).json({ message: 'All required fields must be provided.' });
        }

        try {
            const saltRounds = 10;
            const hashedPassword = await bcrypt.hash(password, saltRounds);
            
            const pool = await poolPromise;

            // This INSERT statement now includes all required fields
            await pool.request()
                .input('EmployeeID', sql.NVarChar, employeeId)
                .input('FullName', sql.NVarChar, fullName)
                .input('Email', sql.NVarChar, email.toLowerCase())
                .input('PasswordHash', sql.NVarChar, hashedPassword)
                .input('RoleID', sql.Int, roleId)
                .query(`
                    INSERT INTO Users (EmployeeID, FullName, Email, PasswordHash, RoleID)
                    VALUES (@EmployeeID, @FullName, @Email, @PasswordHash, @RoleID);
                `);
                
            return res.status(201).json({ message: 'User created successfully.' });

        } catch (error: any) {
            console.error('Registration API Error:', error);
            // Handle potential duplicate email/employeeID errors
            if (error.number === 2627) { // SQL Server error code for unique constraint violation
                return res.status(409).json({ message: 'A user with this email or employee ID already exists.' });
            }
            return res.status(500).json({ message: 'An internal server error occurred.' });
        }
    });
}