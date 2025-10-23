import { ensureSchema, query } from '../_db.js';
import { requireAdmin } from '../_auth.js';

function mapEvidence(row, { includeSensitive = false } = {}) {
    const base = {
        id: row.id,
        title: row.title,
        description: row.description,
        name: row.name,
        email: row.email,
        status: row.status,
        createdAt: row.created_at,
        updatedAt: row.updated_at
    };

    if (includeSensitive) {
        base.ipAddress = row.ip_address || null;
    }

    return base;
}

export default async function handler(req, res) {
    await ensureSchema();

    const { id } = req.query;

    if (!id) {
        return res.status(400).json({ message: 'Evidence id is required.' });
    }

    if (req.method === 'GET') {
        try {
            const { rows } = await query(
                `SELECT id, title, description, name, email, status, created_at, updated_at
                 FROM evidence WHERE id = $1 LIMIT 1`,
                [id]
            );

            if (!rows.length) {
                return res.status(404).json({ message: 'Evidence not found.' });
            }

            return res.status(200).json({ evidence: mapEvidence(rows[0]) });
        } catch (error) {
            console.error('Failed to fetch evidence:', error);
            return res.status(500).json({ message: 'Failed to fetch evidence.' });
        }
    }

    const session = await requireAdmin(req, res);
    if (!session) {
        return;
    }
    const includeSensitive = true;

    if (req.method === 'PATCH') {
        const { title, description, status, name, email } = req.body || {};

        if (!title && !description && !status && !name && !email) {
            return res.status(400).json({ message: 'Nothing to update.' });
        }

        const fields = [];
        const values = [];
        let index = 1;

        if (title !== undefined) {
            fields.push(`title = $${++index}`);
            values.push(title);
        }

        if (description !== undefined) {
            fields.push(`description = $${++index}`);
            values.push(description);
        }

        if (status !== undefined) {
            fields.push(`status = $${++index}`);
            values.push(status);
        }

        if (name !== undefined) {
            fields.push(`name = $${++index}`);
            values.push(name);
        }

        if (email !== undefined) {
            fields.push(`email = $${++index}`);
            values.push(email);
        }

        try {
            const { rows } = await query(
                `UPDATE evidence
                 SET ${fields.join(', ')}, updated_at = NOW()
                 WHERE id = $1
                 RETURNING id, title, description, name, email, status, created_at, updated_at, ip_address`,
                [id, ...values]
            );

            if (!rows.length) {
                return res.status(404).json({ message: 'Evidence not found.' });
            }

            return res.status(200).json({ evidence: mapEvidence(rows[0], { includeSensitive }) });
        } catch (error) {
            console.error('Failed to update evidence:', error);
            return res.status(500).json({ message: 'Failed to update evidence.' });
        }
    }

    if (req.method === 'DELETE') {
        try {
            await query(
                `UPDATE evidence
                 SET status = 'deleted', updated_at = NOW()
                 WHERE id = $1`,
                [id]
            );

            return res.status(204).end();
        } catch (error) {
            console.error('Failed to delete evidence:', error);
            return res.status(500).json({ message: 'Failed to delete evidence.' });
        }
    }

    res.setHeader('Allow', ['GET', 'PATCH', 'DELETE']);
    return res.status(405).json({ message: 'Method Not Allowed' });
}
