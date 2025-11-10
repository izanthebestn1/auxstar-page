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

    const session = await requireAdmin(req, res);
    if (!session) {
        return;
    }

    const wantedId = req.query.id;

    if (!wantedId) {
        return res.status(400).json({ message: 'Wanted ID is required.' });
    }

    if (req.method === 'PATCH') {
        const {
            robloxUsername: rawUsername,
            avatarUrl: rawAvatarUrl,
            charges: rawCharges,
            lawName: rawLawName,
            lawSection: rawLawSection,
            status: rawStatus,
            rewardAmount: rawRewardAmount
        } = req.body || {};

        const updates = [];
        const params = [];
        let paramIndex = 1;

        if (typeof rawUsername === 'string') {
            const robloxUsername = rawUsername.trim();
            updates.push(`roblox_username = $${paramIndex++}`);
            params.push(robloxUsername);
        }

        if (typeof rawAvatarUrl === 'string') {
            const avatarUrl = rawAvatarUrl.trim();
            updates.push(`avatar_url = $${paramIndex++}`);
            params.push(avatarUrl);
        }

        if (typeof rawCharges === 'string') {
            const charges = rawCharges.trim();
            updates.push(`charges = $${paramIndex++}`);
            params.push(charges);
        }

        if (typeof rawLawName === 'string') {
            const lawName = rawLawName.trim();
            updates.push(`law_name = $${paramIndex++}`);
            params.push(lawName);
        }

        if (typeof rawLawSection === 'string') {
            const lawSection = rawLawSection.trim();
            updates.push(`law_section = $${paramIndex++}`);
            params.push(lawSection);
        }

        if (typeof rawStatus === 'string') {
            const status = rawStatus.trim();
            updates.push(`status = $${paramIndex++}`);
            params.push(status);
        }

        if (typeof rawRewardAmount === 'string') {
            const rewardAmount = rawRewardAmount.trim();
            updates.push(`reward_amount = $${paramIndex++}`);
            params.push(rewardAmount);
        }

        if (updates.length === 0) {
            return res.status(400).json({ message: 'No fields to update.' });
        }

        updates.push(`updated_at = NOW()`);
        params.push(wantedId);

        try {
            await query(
                `UPDATE wanted_list SET ${updates.join(', ')} WHERE id = $${paramIndex}`,
                params
            );

            const { rows } = await query(
                `SELECT * FROM wanted_list WHERE id = $1 LIMIT 1`,
                [wantedId]
            );

            if (rows.length === 0) {
                return res.status(404).json({ message: 'Wanted entry not found.' });
            }

            return res.status(200).json({ wanted: mapWanted(rows[0]) });
        } catch (error) {
            console.error('Failed to update wanted entry:', error);
            return res.status(500).json({ message: 'Failed to update wanted entry.' });
        }
    }

    if (req.method === 'DELETE') {
        try {
            const { rowCount } = await query(
                `DELETE FROM wanted_list WHERE id = $1`,
                [wantedId]
            );

            if (rowCount === 0) {
                return res.status(404).json({ message: 'Wanted entry not found.' });
            }

            return res.status(200).json({ message: 'Wanted entry deleted successfully.' });
        } catch (error) {
            console.error('Failed to delete wanted entry:', error);
            return res.status(500).json({ message: 'Failed to delete wanted entry.' });
        }
    }

    res.setHeader('Allow', ['PATCH', 'DELETE']);
    return res.status(405).json({ message: 'Method Not Allowed' });
}
