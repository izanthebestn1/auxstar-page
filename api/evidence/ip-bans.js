import { ensureSchema, query } from '../_db.js';
import { requireAdmin } from '../_auth.js';

function normalizeIp(ipAddress) {
    if (typeof ipAddress !== 'string') {
        return '';
    }

    let value = ipAddress.trim();
    if (!value) {
        return '';
    }

    if (value.startsWith('::ffff:')) {
        value = value.slice(7);
    }

    if (value === '::1') {
        value = '127.0.0.1';
    }

    return value.length > 64 ? value.slice(0, 64) : value;
}

function mapBan(row) {
    return {
        ipAddress: row.ip_address,
        reason: row.reason,
        createdAt: row.created_at
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
                `SELECT ip_address, reason, created_at
                 FROM evidence_ip_bans
                 ORDER BY created_at DESC`
            );

            return res.status(200).json({ bans: rows.map(mapBan) });
        } catch (error) {
            console.error('Failed to fetch evidence IP bans:', error);
            return res.status(500).json({ message: 'Failed to load banned IPs.' });
        }
    }

    if (req.method === 'POST') {
        const { ipAddress: rawIp, reason } = req.body || {};
        const ipAddress = normalizeIp(rawIp);

        if (!ipAddress) {
            return res.status(400).json({ message: 'IP address is required.' });
        }

        try {
            const sanitizedReason = reason ? String(reason).slice(0, 200) : null;
            const { rows } = await query(
                `INSERT INTO evidence_ip_bans (ip_address, reason, created_at)
                 VALUES ($1, $2, NOW())
                 ON CONFLICT (ip_address)
                 DO UPDATE SET reason = EXCLUDED.reason, created_at = NOW()
                 RETURNING ip_address, reason, created_at`,
                [ipAddress, sanitizedReason]
            );

            return res.status(200).json({ ban: mapBan(rows[0]) });
        } catch (error) {
            console.error('Failed to add evidence IP ban:', error);
            return res.status(500).json({ message: 'Failed to ban IP address.' });
        }
    }

    if (req.method === 'DELETE') {
        const rawIp = (req.body && req.body.ipAddress) || (req.query && req.query.ipAddress);
        const ipAddress = normalizeIp(rawIp);

        if (!ipAddress) {
            return res.status(400).json({ message: 'IP address is required.' });
        }

        try {
            await query(
                `DELETE FROM evidence_ip_bans
                 WHERE ip_address = $1`,
                [ipAddress]
            );

            return res.status(204).end();
        } catch (error) {
            console.error('Failed to remove evidence IP ban:', error);
            return res.status(500).json({ message: 'Failed to unban IP address.' });
        }
    }

    res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
    return res.status(405).json({ message: 'Method Not Allowed' });
}
