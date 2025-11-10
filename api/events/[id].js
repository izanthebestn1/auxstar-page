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

    const session = await requireAdmin(req, res);
    if (!session) {
        return;
    }

    const eventId = req.query.id;

    if (!eventId) {
        return res.status(400).json({ message: 'Event ID is required.' });
    }

    if (req.method === 'PATCH') {
        const {
            title: rawTitle,
            description: rawDescription,
            eventDate: rawEventDate,
            location: rawLocation,
            status: rawStatus
        } = req.body || {};

        const updates = [];
        const params = [];
        let paramIndex = 1;

        if (typeof rawTitle === 'string') {
            const title = rawTitle.trim();
            updates.push(`title = $${paramIndex++}`);
            params.push(title);
        }

        if (typeof rawDescription === 'string') {
            const description = rawDescription.trim();
            updates.push(`description = $${paramIndex++}`);
            params.push(description);
        }

        if (typeof rawEventDate === 'string') {
            const eventDate = rawEventDate.trim();
            updates.push(`event_date = $${paramIndex++}`);
            params.push(eventDate);
        }

        if (typeof rawLocation === 'string') {
            const location = rawLocation.trim();
            updates.push(`location = $${paramIndex++}`);
            params.push(location);
        }

        if (typeof rawStatus === 'string') {
            const status = rawStatus.trim();
            updates.push(`status = $${paramIndex++}`);
            params.push(status);
        }

        if (updates.length === 0) {
            return res.status(400).json({ message: 'No fields to update.' });
        }

        updates.push(`updated_at = NOW()`);
        params.push(eventId);

        try {
            await query(
                `UPDATE events SET ${updates.join(', ')} WHERE id = $${paramIndex}`,
                params
            );

            const { rows } = await query(
                `SELECT * FROM events WHERE id = $1 LIMIT 1`,
                [eventId]
            );

            if (rows.length === 0) {
                return res.status(404).json({ message: 'Event not found.' });
            }

            return res.status(200).json({ event: mapEvent(rows[0]) });
        } catch (error) {
            console.error('Failed to update event:', error);
            return res.status(500).json({ message: 'Failed to update event.' });
        }
    }

    if (req.method === 'DELETE') {
        try {
            const { rowCount } = await query(
                `DELETE FROM events WHERE id = $1`,
                [eventId]
            );

            if (rowCount === 0) {
                return res.status(404).json({ message: 'Event not found.' });
            }

            return res.status(200).json({ message: 'Event deleted successfully.' });
        } catch (error) {
            console.error('Failed to delete event:', error);
            return res.status(500).json({ message: 'Failed to delete event.' });
        }
    }

    res.setHeader('Allow', ['PATCH', 'DELETE']);
    return res.status(405).json({ message: 'Method Not Allowed' });
}
