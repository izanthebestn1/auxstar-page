import crypto from 'node:crypto';
import { ensureSchema, query } from '../_db.js';
import { requireAdmin } from '../_auth.js';

function mapArticle(row) {
    return {
        id: row.id,
        title: row.title,
        category: row.category,
        content: row.content,
        image: row.image_data,
        author: row.author,
        status: row.status,
        createdAt: row.created_at,
        updatedAt: row.updated_at
    };
}

export default async function handler(req, res) {
    await ensureSchema();

    if (req.method === 'GET') {
        try {
            const scope = req.query.scope;
            const rawLimit = parseInt(req.query.limit, 10);
            const limit = Number.isFinite(rawLimit) && rawLimit > 0
                ? Math.min(rawLimit, scope === 'admin' ? 200 : 50)
                : scope === 'admin'
                    ? 50
                    : 12;

            const rawStatus = typeof req.query.status === 'string' ? req.query.status.trim() : '';
            const normalizedStatus = rawStatus.toLowerCase();
            const statusFilter = normalizedStatus && normalizedStatus !== 'all' ? normalizedStatus : null;

            if (scope === 'admin') {
                const session = await requireAdmin(req, res);
                if (!session) {
                    return;
                }

                if (statusFilter) {
                    const { rows } = await query(
                        `SELECT id, title, category, content, image_data, author, status, created_at, updated_at
                         FROM articles
                         WHERE status = $1
                         ORDER BY updated_at DESC, created_at DESC
                         LIMIT $2`,
                        [statusFilter, limit]
                    );

                    return res.status(200).json({ articles: rows.map(mapArticle) });
                }

                const { rows } = await query(
                    `SELECT id, title, category, content, image_data, author, status, created_at, updated_at
                     FROM articles
                     ORDER BY updated_at DESC, created_at DESC
                     LIMIT $1`,
                    [limit]
                );

                return res.status(200).json({ articles: rows.map(mapArticle) });
            }

            const publicStatus = statusFilter || 'approved';
            const { rows } = await query(
                `SELECT id, title, category, content, image_data, author, status, created_at, updated_at
                 FROM articles
                 WHERE status = $1
                 ORDER BY updated_at DESC, created_at DESC
                 LIMIT $2`,
                [publicStatus, limit]
            );

            return res.status(200).json({ articles: rows.map(mapArticle) });
        } catch (error) {
            console.error('Failed to fetch articles:', error);
            return res.status(500).json({ message: 'Failed to fetch articles.' });
        }
    }

    if (req.method === 'POST') {
        const session = await requireAdmin(req, res);
        if (!session) {
            return;
        }

        const { title, category, content, image, status } = req.body || {};

        if (!title || !category || !content) {
            return res.status(400).json({ message: 'Title, category, and content are required.' });
        }

        try {
            const id = crypto.randomUUID();
            const articleStatus = status || 'approved';

            const { rows } = await query(
                `INSERT INTO articles (id, title, category, content, image_data, author, status)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)
                 RETURNING id, title, category, content, image_data, author, status, created_at, updated_at` ,
                [id, title, category, content, image || null, session.username, articleStatus]
            );

            return res.status(201).json({ article: mapArticle(rows[0]) });
        } catch (error) {
            console.error('Failed to create article:', error);
            return res.status(500).json({ message: 'Failed to create article.' });
        }
    }

    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).json({ message: 'Method Not Allowed' });
}
