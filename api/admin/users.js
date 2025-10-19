import { ensureSchema, query } from '../_db.js';
import { requireAdmin } from '../_auth.js';

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

    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ message: 'Method Not Allowed' });
}
