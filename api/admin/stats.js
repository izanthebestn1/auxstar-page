import { ensureSchema, query } from '../_db.js';
import { requireAdmin } from '../_auth.js';

export default async function handler(req, res) {
    await ensureSchema();

    if (req.method !== 'GET') {
        res.setHeader('Allow', ['GET']);
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    const session = await requireAdmin(req, res);
    if (!session) {
        return;
    }

    try {
        const { rows } = await query(`
            SELECT
                (SELECT COUNT(*) FROM articles) AS total_articles,
                (SELECT COUNT(*) FROM articles WHERE status = 'pending') AS pending_articles,
                (SELECT COUNT(*) FROM evidence WHERE status != 'deleted') AS total_evidence,
                (SELECT COUNT(*) FROM users WHERE LOWER(role) != 'admin') AS total_contributors
        `);

        if (!rows.length) {
            return res.status(200).json({
                totalArticles: 0,
                pendingArticles: 0,
                totalEvidence: 0,
                totalContributors: 0
            });
        }

        const stats = rows[0];
        return res.status(200).json({
            totalArticles: Number(stats.total_articles) || 0,
            pendingArticles: Number(stats.pending_articles) || 0,
            totalEvidence: Number(stats.total_evidence) || 0,
            totalContributors: Number(stats.total_contributors) || 0
        });
    } catch (error) {
        console.error('Failed to load admin stats:', error);
        return res.status(500).json({ message: 'Failed to load admin stats.' });
    }
}
