import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { ensureSchema, query } from './_db.js';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    try {
        await ensureSchema();

        // Check if any users exist
        const { rows: existingUsers } = await query('SELECT COUNT(*) as count FROM users');
        const userCount = parseInt(existingUsers[0].count);

        if (userCount > 0) {
            return res.status(200).json({ 
                message: 'Users already exist in the database.',
                userCount 
            });
        }

        // Create default admin user
        const defaultUsername = 'admin';
        const defaultPassword = 'admin123'; // CHANGE THIS IMMEDIATELY AFTER FIRST LOGIN
        const passwordHash = await bcrypt.hash(defaultPassword, 10);
        const id = crypto.randomUUID();

        await query(
            `INSERT INTO users (id, username, password_hash, role)
             VALUES ($1, $2, $3, $4)`,
            [id, defaultUsername, passwordHash, 'admin']
        );

        return res.status(201).json({ 
            message: 'Default admin user created successfully.',
            username: defaultUsername,
            warning: '⚠️ CHANGE THE DEFAULT PASSWORD IMMEDIATELY!'
        });
    } catch (error) {
        console.error('Failed to initialize admin:', error);
        return res.status(500).json({ 
            message: 'Failed to initialize admin user.',
            error: error.message 
        });
    }
}
