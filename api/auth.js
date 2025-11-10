import crypto from 'node:crypto';
import { ensureSchema, query } from './_db.js';
import { createSession, findUser, invalidateSession, safeCompare } from './_auth.js';

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

async function handleConfig(req, res) {
    if (req.method !== 'GET') {
        res.setHeader('Allow', ['GET']);
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    await ensureSchema();

    try {
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
    } catch (error) {
        console.error('Failed to generate evidence challenge:', error);
        return res.status(500).json({ message: 'Could not prepare verification challenge.' });
    }
}

async function handleLogin(req, res) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    const { username, password } = req.body || {};

    if (!username || !password) {
        return res.status(400).json({ message: 'Username and password are required.' });
    }

    await ensureSchema();

    const matchedUser = await findUser(username);

    if (!matchedUser) {
        return res.status(401).json({ message: 'Invalid username or password.' });
    }

    if (!matchedUser || !safeCompare(matchedUser.password_hash, password)) {
        return res.status(401).json({ message: 'Invalid username or password.' });
    }

    const sessionToken = await createSession(matchedUser.username, matchedUser.role);

    return res.status(200).json({
        username: matchedUser.username,
        role: matchedUser.role,
        token: sessionToken
    });
}

async function handleLogout(req, res) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    const header = req.headers.authorization || req.headers.Authorization;
    if (!header) {
        return res.status(200).json({ message: 'Logged out' });
    }

    const parts = header.split(' ');
    if (parts.length === 2 && parts[0] === 'Bearer') {
        const token = parts[1];
        await invalidateSession(token);
    }

    return res.status(200).json({ message: 'Logged out' });
}

export default async function handler(req, res) {
    const path = req.url.split('?')[0];

    if (path === '/api/auth/config' || path === '/api/auth/config/') {
        return handleConfig(req, res);
    }

    if (path === '/api/auth/login' || path === '/api/auth/login/') {
        return handleLogin(req, res);
    }

    if (path === '/api/auth/logout' || path === '/api/auth/logout/') {
        return handleLogout(req, res);
    }

    return res.status(404).json({ message: 'Not Found' });
}
