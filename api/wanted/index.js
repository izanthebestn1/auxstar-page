import crypto from 'node:crypto';
import { ensureSchema, query } from '../_db.js';
import { requireAdmin } from '../_auth.js';

function mapWanted(row) {
    return {
        id: row.id,
        robloxUsername: row.roblox_username,
        avatarUrl: row.avatar_url,
        charges: row.charges,
        lawName: row.law_name,
        lawSection: row.law_section,
        status: row.status,
        rewardAmount: row.reward_amount,
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
                    `SELECT * FROM wanted_list ORDER BY created_at DESC`
                );

                return res.status(200).json({ wanted: rows.map(mapWanted) });
            }

            // Public view - only active wanted entries
            const { rows } = await query(
                `SELECT * FROM wanted_list 
                 WHERE status = 'wanted'
                 ORDER BY created_at DESC`
            );

            return res.status(200).json({ wanted: rows.map(mapWanted) });
        } catch (error) {
            console.error('Failed to fetch wanted list:', error);
            return res.status(500).json({ message: 'Failed to fetch wanted list.' });
        }
    }

    if (req.method === 'POST') {
        const session = await requireAdmin(req, res);
        if (!session) {
            return;
        }

        const {
            robloxUsername: rawUsername,
            avatarUrl: rawAvatarUrl,
            charges: rawCharges,
            lawName: rawLawName,
            lawSection: rawLawSection,
            status: rawStatus,
            rewardAmount: rawRewardAmount
        } = req.body || {};

        const robloxUsername = typeof rawUsername === 'string' ? rawUsername.trim() : '';
        const avatarUrl = typeof rawAvatarUrl === 'string' ? rawAvatarUrl.trim() : null;
        const charges = typeof rawCharges === 'string' ? rawCharges.trim() : '';
        const lawName = typeof rawLawName === 'string' ? rawLawName.trim() : null;
        const lawSection = typeof rawLawSection === 'string' ? rawLawSection.trim() : null;
        const status = typeof rawStatus === 'string' ? rawStatus.trim() : 'wanted';
        const rewardAmount = typeof rawRewardAmount === 'string' ? rawRewardAmount.trim() : null;

        if (!robloxUsername || !charges) {
            return res.status(400).json({ message: 'Roblox username and charges are required.' });
        }

        try {
            const id = crypto.randomUUID();

            await query(
                `INSERT INTO wanted_list 
                 (id, roblox_username, avatar_url, charges, law_name, law_section, status, reward_amount)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
                [id, robloxUsername, avatarUrl, charges, lawName, lawSection, status, rewardAmount]
            );

            const { rows } = await query(
                `SELECT * FROM wanted_list WHERE id = $1 LIMIT 1`,
                [id]
            );

            return res.status(201).json({ wanted: mapWanted(rows[0]) });
        } catch (error) {
            console.error('Failed to create wanted entry:', error);
            return res.status(500).json({ message: 'Failed to create wanted entry.' });
        }
    }

    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).json({ message: 'Method Not Allowed' });
}
