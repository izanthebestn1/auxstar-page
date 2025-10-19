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

    const {
        query: { id }
    } = req;

    if (!id) {
        return res.status(400).json({ message: 'Article id is required.' });
    }

    if (req.method === 'PATCH') {
        const session = await requireAdmin(req, res);
        if (!session) {
            return;
        }

        const { status } = req.body || {};

        if (!status) {
            return res.status(400).json({ message: 'Status is required.' });
        }

        try {
            const { rows } = await query(
                `UPDATE articles
                 SET status = $1, updated_at = NOW()
                 WHERE id = $2
                 RETURNING id, title, category, content, image_data, author, status, created_at, updated_at`,
                [status, id]
            );

            if (!rows[0]) {
                return res.status(404).json({ message: 'Article not found.' });
            }

            return res.status(200).json({ article: mapArticle(rows[0]) });
        } catch (error) {
            console.error('Failed to update article:', error);
            return res.status(500).json({ message: 'Failed to update article.' });
        }
    }

    if (req.method === 'DELETE') {
        const session = await requireAdmin(req, res);
        if (!session) {
            return;
        }

        try {
            await query('DELETE FROM articles WHERE id = $1', [id]);
            return res.status(204).end();
        } catch (error) {
            console.error('Failed to delete article:', error);
            return res.status(500).json({ message: 'Failed to delete article.' });
        }
    }

    if (req.method === 'GET') {
        try {
            const { rows } = await query(
                `SELECT id, title, category, content, image_data, author, status, created_at, updated_at
                 FROM articles WHERE id = $1 LIMIT 1`,
                [id]
            );

            if (!rows[0]) {
                return res.status(404).json({ message: 'Article not found.' });
            }

            return res.status(200).json({ article: mapArticle(rows[0]) });
        } catch (error) {
            console.error('Failed to fetch article:', error);
            return res.status(500).json({ message: 'Failed to fetch article.' });
        }
    }

    res.setHeader('Allow', ['GET', 'PATCH', 'DELETE']);
    return res.status(405).json({ message: 'Method Not Allowed' });
}
