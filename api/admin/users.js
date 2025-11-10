import { ensureSchema, query } from '../_db.js';
import { requireAdmin } from '../_auth.js';
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';

function mapUser(row) {
    return {
        username: row.username,
        role: row.role,
        joinedAt: row.created_at
    };
}

export default async function handler(req, res) {
    await ensureSchema();

    const session = await requireAdmin(req, res);
    if (!session) {
        return;
    }

    if (req.method === 'GET') {
        try {
            const { rows } = await query(
                `SELECT username, role, created_at FROM users ORDER BY created_at DESC`
            );

            return res.status(200).json({ users: rows.map(mapUser) });
        } catch (error) {
            console.error('Failed to load users:', error);
            return res.status(500).json({ message: 'Failed to load users.' });
        }
    }

    if (req.method === 'POST') {
        const {
            username: rawUsername,
            password: rawPassword,
            role: rawRole
        } = req.body || {};

        const username = typeof rawUsername === 'string' ? rawUsername.trim() : '';
        const password = typeof rawPassword === 'string' ? rawPassword.trim() : '';
        const role = typeof rawRole === 'string' ? rawRole.trim() : 'editor';

        if (!username || !password) {
            return res.status(400).json({ message: 'Username and password are required.' });
        }

        if (username.length < 3) {
            return res.status(400).json({ message: 'Username must be at least 3 characters.' });
        }

        if (password.length < 6) {
            return res.status(400).json({ message: 'Password must be at least 6 characters.' });
        }

        if (!['admin', 'editor'].includes(role)) {
            return res.status(400).json({ message: 'Role must be either "admin" or "editor".' });
        }

        try {
            // Check if username already exists
            const { rows: existing } = await query(
                `SELECT username FROM users WHERE username = $1 LIMIT 1`,
                [username]
            );

            if (existing.length > 0) {
                return res.status(409).json({ message: 'Username already exists.' });
            }

            // Hash password
            const passwordHash = await bcrypt.hash(password, 10);
            const id = crypto.randomUUID();

            // Create user
            await query(
                `INSERT INTO users (id, username, password_hash, role)
                 VALUES ($1, $2, $3, $4)`,
                [id, username, passwordHash, role]
            );

            return res.status(201).json({ 
                message: 'User created successfully.',
                user: { username, role }
            });
        } catch (error) {
            console.error('Failed to create user:', error);
            return res.status(500).json({ message: 'Failed to create user.' });
        }
    }

    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).json({ message: 'Method Not Allowed' });
}
