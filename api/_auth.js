import crypto from 'node:crypto';
import { ensureSchema, query } from './_db.js';

const SESSION_TTL_HOURS = 24;
let envSeeded = false;

function parseEnvUsers() {
    const raw = process.env.AUTH_USERS_JSON;
    if (!raw) {
        return [];
    }

    try {
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) {
            console.error('AUTH_USERS_JSON must be an array of users.');
            return [];
        }

        return parsed
            .filter((user) => user && typeof user.username === 'string' && typeof user.password === 'string')
            .map((user) => ({
                username: user.username.trim(),
                password: user.password,
                role: user.role && typeof user.role === 'string' ? user.role : 'editor'
            }));
    } catch (error) {
        console.error('Failed to parse AUTH_USERS_JSON:', error);
        return [];
    }
}

function safeCompare(expected, actual) {
    const expectedBuffer = Buffer.from(expected);
    const actualBuffer = Buffer.from(actual);

    if (expectedBuffer.length !== actualBuffer.length) {
        return false;
    }

    return crypto.timingSafeEqual(expectedBuffer, actualBuffer);
}

async function seedUsersFromEnv() {
    if (envSeeded) {
        return;
    }

    envSeeded = true;

    const envUsers = parseEnvUsers();
    if (envUsers.length === 0) {
        return;
    }

    await ensureSchema();

    for (const user of envUsers) {
        await query(
            `
            INSERT INTO users (username, password, role)
            VALUES ($1, $2, $3)
            ON CONFLICT ((LOWER(username))) DO UPDATE
            SET password = EXCLUDED.password,
                role = EXCLUDED.role;
        `,
            [user.username, user.password, user.role]
        );
    }
}

export async function findUser(username) {
    if (!username) {
        return null;
    }

    await seedUsersFromEnv();

    const { rows } = await query(
        `SELECT username, password, role FROM users WHERE LOWER(username) = LOWER($1) LIMIT 1`,
        [username]
    );

    return rows[0] || null;
}

export async function createSession(username, role) {
    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + SESSION_TTL_HOURS * 60 * 60 * 1000);

    await query(
        `INSERT INTO sessions (token, username, role, expires_at) VALUES ($1, $2, $3, $4)` ,
        [token, username, role, expiresAt]
    );

    return token;
}

export async function invalidateSession(token) {
    if (!token) {
        return;
    }

    await query('DELETE FROM sessions WHERE token = $1', [token]);
}

export async function authenticateRequest(req) {
    const header = req.headers.authorization || req.headers.Authorization;
    if (!header || typeof header !== 'string') {
        return null;
    }

    const parts = header.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
        return null;
    }

    const token = parts[1];
    if (!token) {
        return null;
    }

    const { rows } = await query(
        `SELECT username, role FROM sessions WHERE token = $1 AND expires_at > NOW() LIMIT 1`,
        [token]
    );

    if (rows.length === 0) {
        return null;
    }

    return rows[0];
}

export async function requireAdmin(req, res) {
    const session = await authenticateRequest(req);
    if (!session || session.role !== 'admin') {
        res.status(401).json({ message: 'Unauthorized' });
        return null;
    }

    return session;
}

export { parseEnvUsers, safeCompare };
