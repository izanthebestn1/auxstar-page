import { ensureSchema } from '../_db.js';
import { createSession, findUser, safeCompare } from '../_auth.js';

export default async function handler(req, res) {
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
