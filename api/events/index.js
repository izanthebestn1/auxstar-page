import crypto from 'node:crypto';
import { ensureSchema, query } from '../_db.js';
import { requireAdmin } from '../_auth.js';

function mapEvent(row) {
    return {
        id: row.id,
        title: row.title,
        description: row.description,
        eventDate: row.event_date,
        location: row.location,
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
                    `SELECT * FROM events ORDER BY event_date DESC`
                );

                return res.status(200).json({ events: rows.map(mapEvent) });
            }

            // Public view - only upcoming/active events
            const { rows } = await query(
                `SELECT * FROM events 
                 WHERE status = 'upcoming' AND event_date >= NOW()
                 ORDER BY event_date ASC`
            );

            return res.status(200).json({ events: rows.map(mapEvent) });
        } catch (error) {
            console.error('Failed to fetch events:', error);
            return res.status(500).json({ message: 'Failed to fetch events.' });
        }
    }

    if (req.method === 'POST') {
        const session = await requireAdmin(req, res);
        if (!session) {
            return;
        }

        const {
            title: rawTitle,
            description: rawDescription,
            eventDate: rawEventDate,
            location: rawLocation,
            status: rawStatus
        } = req.body || {};

        const title = typeof rawTitle === 'string' ? rawTitle.trim() : '';
        const description = typeof rawDescription === 'string' ? rawDescription.trim() : null;
        const eventDate = typeof rawEventDate === 'string' ? rawEventDate.trim() : '';
        const location = typeof rawLocation === 'string' ? rawLocation.trim() : null;
        const status = typeof rawStatus === 'string' ? rawStatus.trim() : 'upcoming';

        if (!title || !eventDate) {
            return res.status(400).json({ message: 'Title and event date are required.' });
        }

        try {
            const id = crypto.randomUUID();

            await query(
                `INSERT INTO events (id, title, description, event_date, location, status)
                 VALUES ($1, $2, $3, $4, $5, $6)`,
                [id, title, description, eventDate, location, status]
            );

            const { rows } = await query(
                `SELECT * FROM events WHERE id = $1 LIMIT 1`,
                [id]
            );

            return res.status(201).json({ event: mapEvent(rows[0]) });
        } catch (error) {
            console.error('Failed to create event:', error);
            return res.status(500).json({ message: 'Failed to create event.' });
        }
    }

    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).json({ message: 'Method Not Allowed' });
}
