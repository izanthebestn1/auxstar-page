import crypto from 'node:crypto';
import { ensureSchema, query } from '../_db.js';
import { requireAdmin } from '../_auth.js';

function mapEvidence(row) {
    return {
        id: row.id,
        title: row.title,
        description: row.description,
        name: row.name,
        email: row.email,
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

            if (scope === 'admin') {
                const session = await requireAdmin(req, res);
                if (!session) {
                    return;
                }

                const { rows } = await query(
                    `SELECT id, title, description, name, email, status, created_at, updated_at
                     FROM evidence
                     ORDER BY updated_at DESC, created_at DESC`
                );

                return res.status(200).json({ evidence: rows.map(mapEvidence) });
            }

            const { rows } = await query(
                `SELECT id, title, description, name, email, status, created_at, updated_at
                 FROM evidence
                 WHERE status != 'deleted'
                 ORDER BY updated_at DESC, created_at DESC`
            );

            return res.status(200).json({ evidence: rows.map(mapEvidence) });
        } catch (error) {
            console.error('Failed to fetch evidence:', error);
            return res.status(500).json({ message: 'Failed to fetch evidence.' });
        }
    }

    if (req.method === 'POST') {
        const { title, description, name, email } = req.body || {};

        if (!title || !description) {
            return res.status(400).json({ message: 'Title and description are required.' });
        }

        try {
            const id = crypto.randomUUID();

            await query(
                `INSERT INTO evidence (id, title, description, name, email, status)
                 VALUES ($1, $2, $3, $4, $5, 'submitted')` ,
                [id, title, description, name || null, email || null]
            );

            const { rows } = await query(
                `SELECT id, title, description, name, email, status, created_at, updated_at
                 FROM evidence WHERE id = $1 LIMIT 1`,
                [id]
            );

            return res.status(201).json({ evidence: mapEvidence(rows[0]) });
        } catch (error) {
            console.error('Failed to create evidence:', error);
            return res.status(500).json({ message: 'Failed to create evidence.' });
        }
    }

    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).json({ message: 'Method Not Allowed' });
}
