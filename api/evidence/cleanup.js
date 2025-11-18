import { ensureSchema, query } from '../_db.js';
import { requireAdmin } from '../_auth.js';

export default async function handler(req, res) {
    await ensureSchema();

    const session = await requireAdmin(req, res);
    if (!session) {
        return;
    }

    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    try {
        const { rows } = await query(
            `WITH ranked AS (
                SELECT id,
                       ROW_NUMBER() OVER (
                           PARTITION BY LOWER(title), LOWER(description), COALESCE(LOWER(email), ''), COALESCE(ip_address, '')
                           ORDER BY created_at DESC
                       ) AS row_num
                FROM evidence
                WHERE status = 'submitted'
            ),
            deleted AS (
                DELETE FROM evidence e
                USING ranked r
                WHERE e.id = r.id
                  AND r.row_num > 1
                RETURNING e.id
            )
            SELECT COUNT(*) AS count FROM deleted;`
        );

        const removed = rows.length ? Number(rows[0].count || 0) : 0;
        return res.status(200).json({ removed });
    } catch (error) {
        console.error('Failed to clean duplicate evidence:', error);
        return res.status(500).json({ message: 'Failed to remove duplicate evidence.' });
    }
}
