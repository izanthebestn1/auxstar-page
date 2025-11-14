import crypto from 'node:crypto';
import { ensureSchema, query } from '../_db.js';
import { requireAdmin } from '../_auth.js';

function buildChallenge() {
    const a = Math.floor(Math.random() * 8) + 2; // 2 - 9
    const b = Math.floor(Math.random() * 8) + 2;
    const useSubtraction = Math.random() < 0.4 && a !== b;

    if (useSubtraction) {
        const bigger = Math.max(a, b);
        const smaller = Math.min(a, b);
        return {
            question: `How much is ${bigger} - ${smaller}?`,
            answer: String(bigger - smaller)
        };
    }

    return {
        question: `How much is ${a} + ${b}?`,
        answer: String(a + b)
    };
}

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

function getClientIp(req) {
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded && typeof forwarded === 'string') {
        const [first] = forwarded.split(',');
        const normalized = normalizeIp(first ? first.trim() : '');
        if (normalized) {
            return normalized;
        }
    }

    if (req.headers['x-real-ip']) {
        const normalized = normalizeIp(String(req.headers['x-real-ip']));
        if (normalized) {
            return normalized;
        }
    }

    if (req.socket && req.socket.remoteAddress) {
        return normalizeIp(req.socket.remoteAddress);
    }

    return null;
}

function normalizeIp(ip) {
    if (!ip) {
        return null;
    }

    let value = String(ip).trim();
    if (!value) {
        return null;
    }

    if (value.startsWith('::ffff:')) {
        value = value.slice(7);
    }

    if (value === '::1' || value === '::') {
        return '127.0.0.1';
    }

    return value.length > 64 ? value.slice(0, 64) : value;
}

async function validateChallenge(challengeId, answer) {
    if (!challengeId || typeof challengeId !== 'string') {
        return false;
    }

    const trimmedId = challengeId.trim();
    if (!trimmedId) {
        return false;
    }

    const normalizedAnswer = String(answer ?? '').trim().toLowerCase();
    if (!normalizedAnswer) {
        return false;
    }

    try {
        const { rows } = await query(
            `DELETE FROM evidence_challenges
             WHERE id = $1
               AND LOWER(answer) = LOWER($2)
             RETURNING id`,
            [trimmedId, normalizedAnswer]
        );

        const isValid = rows.length > 0;

        await query(
            `DELETE FROM evidence_challenges
             WHERE created_at < NOW() - INTERVAL '2 hours'`
        );

        return isValid;
    } catch (error) {
        console.error('Evidence challenge validation failed:', error);
        return false;
    }
}

async function hasRecentSubmission(ipAddress) {
    if (!ipAddress) {
        return false;
    }

    const { rows } = await query(
        `SELECT 1
         FROM evidence
         WHERE ip_address = $1
           AND created_at >= NOW() - INTERVAL '1 minute'
         LIMIT 1`,
        [ipAddress]
    );

    return rows.length > 0;
}

async function isDuplicateEvidence(title, description) {
    if (!title || !description) {
        return false;
    }

    const { rows } = await query(
        `SELECT id
         FROM evidence
         WHERE LOWER(title) = LOWER($1)
           AND LOWER(description) = LOWER($2)
           AND status != 'deleted'
         LIMIT 1`,
        [title, description]
    );

    return rows.length > 0;
}

export default async function handler(req, res) {
    await ensureSchema();

    if (req.method === 'GET') {
        try {
            const scope = req.query.scope;

            // Generate challenge for evidence submission
            if (scope === 'challenge') {
                await query(`
                    DELETE FROM evidence_challenges
                    WHERE created_at < NOW() - INTERVAL '2 hours'
                `);

                const id = crypto.randomUUID();
                const challenge = buildChallenge();

                await query(
                    `INSERT INTO evidence_challenges (id, answer)
                     VALUES ($1, $2)`,
                    [id, challenge.answer]
                );

                return res.status(200).json({
                    evidenceChallenge: {
                        id,
                        question: challenge.question
                    }
                });
            }

            if (scope === 'admin') {
                const session = await requireAdmin(req, res);
                if (!session) {
                    return;
                }

                const { rows } = await query(
                    `SELECT id, title, description, name, email, status, created_at, updated_at, ip_address
                     FROM evidence
                     ORDER BY updated_at DESC, created_at DESC`
                );

                return res.status(200).json({ evidence: rows.map((row) => mapEvidence(row, { includeSensitive: true })) });
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
        const {
            title: rawTitle,
            description: rawDescription,
            name: rawName,
            email: rawEmail,
            challengeId,
            challengeAnswer
        } = req.body || {};

        const title = typeof rawTitle === 'string' ? rawTitle.trim() : '';
        const description = typeof rawDescription === 'string' ? rawDescription.trim() : '';
        const name = typeof rawName === 'string' ? rawName.trim() : null;
        const email = typeof rawEmail === 'string' ? rawEmail.trim() : null;

        if (!title || !description) {
            return res.status(400).json({ message: 'Title and description are required.' });
        }

        const ipAddress = getClientIp(req);
        if (!ipAddress) {
            return res.status(400).json({ message: 'Unable to verify submission origin. Please try again later.' });
        }

        const challengeValid = await validateChallenge(challengeId, challengeAnswer);
        if (!challengeValid) {
            return res.status(400).json({ message: 'Verification answer incorrect or expired. Please try again.' });
        }

        try {
            if (await hasRecentSubmission(ipAddress)) {
                return res.status(429).json({ message: 'Please wait at least one minute before submitting again.' });
            }

            if (await isDuplicateEvidence(title, description)) {
                return res.status(409).json({ message: 'An identical piece of evidence has already been submitted.' });
            }
        } catch (error) {
            console.error('Pre-submission validation failed:', error);
            return res.status(500).json({ message: 'Unable to validate submission. Please try again later.' });
        }

        try {
            const id = crypto.randomUUID();

            await query(
                `INSERT INTO evidence (id, title, description, name, email, ip_address, status)
                 VALUES ($1, $2, $3, $4, $5, $6, 'submitted')`,
                [id, title, description, name || null, email || null, ipAddress]
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

    if (req.method === 'DELETE') {
        const session = await requireAdmin(req, res);
        if (!session) {
            return;
        }

        try {
            const { rows } = await query(
                `WITH ranked AS (
                    SELECT id,
                           ROW_NUMBER() OVER (
                               PARTITION BY LOWER(title), LOWER(description), COALESCE(LOWER(email), ''), COALESCE(ip_address, '')
                               ORDER BY created_at DESC
                           ) AS row_num
                    FROM evidence
                    WHERE status = 'submitted'
                ),
                deleted AS (
                    DELETE FROM evidence e
                    USING ranked r
                    WHERE e.id = r.id
                      AND r.row_num > 1
                    RETURNING e.id
                )
                SELECT COUNT(*) AS count FROM deleted;`
            );

            const removed = rows.length ? Number(rows[0].count || 0) : 0;
            return res.status(200).json({ removed });
        } catch (error) {
            console.error('Failed to clean duplicate evidence:', error);
            return res.status(500).json({ message: 'Failed to remove duplicate evidence.' });
        }
    }

    res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
    return res.status(405).json({ message: 'Method Not Allowed' });
}
