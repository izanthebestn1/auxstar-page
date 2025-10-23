import crypto from 'node:crypto';
import { ensureSchema, query } from '../_db.js';
import { requireAdmin } from '../_auth.js';

const CAPTCHA_SECRET = process.env.EVIDENCE_CAPTCHA_SECRET || '';

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
        if (first) {
            return normalizeIp(first.trim());
        }
    }

    if (req.headers['x-real-ip']) {
        return normalizeIp(String(req.headers['x-real-ip']));
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

    let value = ip;
    if (value.startsWith('::ffff:')) {
        value = value.slice(7);
    }

    if (value === '::1') {
        return '127.0.0.1';
    }

    return value.length > 64 ? value.slice(0, 64) : value;
}

async function verifyCaptcha(token, ipAddress) {
    if (!CAPTCHA_SECRET) {
        throw new Error('Captcha verification is not configured. Set EVIDENCE_CAPTCHA_SECRET.');
    }

    if (!token) {
        return false;
    }

    const payload = new URLSearchParams();
    payload.set('secret', CAPTCHA_SECRET);
    payload.set('response', token);
    if (ipAddress) {
        payload.set('remoteip', ipAddress);
    }

    try {
        const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: payload.toString()
        });

        if (!response.ok) {
            console.error('Captcha verification request failed with status', response.status);
            return false;
        }

        const data = await response.json();
        return Boolean(data.success);
    } catch (error) {
        console.error('Captcha verification failed:', error);
        return false;
    }
}

async function isIpBanned(ipAddress) {
    if (!ipAddress) {
        return false;
    }

    const { rows } = await query(
        `SELECT 1 FROM evidence_ip_bans WHERE ip_address = $1 LIMIT 1`,
        [ipAddress]
    );

    return rows.length > 0;
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
            captchaToken
        } = req.body || {};

        const title = typeof rawTitle === 'string' ? rawTitle.trim() : '';
        const description = typeof rawDescription === 'string' ? rawDescription.trim() : '';
        const name = typeof rawName === 'string' ? rawName.trim() : null;
        const email = typeof rawEmail === 'string' ? rawEmail.trim() : null;

        if (!CAPTCHA_SECRET) {
            console.error('Evidence captcha secret is not configured.');
            return res.status(503).json({ message: 'Evidence submissions are temporarily disabled.' });
        }

        if (!title || !description) {
            return res.status(400).json({ message: 'Title and description are required.' });
        }

        const ipAddress = getClientIp(req);
        if (!ipAddress) {
            return res.status(400).json({ message: 'Unable to verify submission origin. Please try again later.' });
        }

        try {
            const captchaValid = await verifyCaptcha(captchaToken, ipAddress);
            if (!captchaValid) {
                return res.status(400).json({ message: 'Captcha verification failed. Please try again.' });
            }
        } catch (error) {
            console.error('Captcha verification error:', error);
            return res.status(503).json({ message: 'Captcha verification is unavailable. Please try again later.' });
        }

        try {
            if (await isIpBanned(ipAddress)) {
                return res.status(403).json({ message: 'Submissions from this IP address are blocked.' });
            }

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
                 VALUES ($1, $2, $3, $4, $5, $6, 'submitted')` ,
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

    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).json({ message: 'Method Not Allowed' });
}
