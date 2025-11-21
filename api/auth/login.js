import bcrypt from 'bcryptjs';
import { ensureSchema } from '../_db.js';
import { createSession, findUser } from '../_auth.js';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    const { username, password } = req.body || {};

    if (!username || !password) {
        return res.status(400).json({ message: 'Username and password are required.' });
    }

    try {
        await ensureSchema();

        const matchedUser = await findUser(username);

        if (!matchedUser) {
            console.error('User not found:', username);
            return res.status(401).json({ message: 'Invalid username or password.' });
        }

        if (!matchedUser.password_hash) {
            console.error('User has no password hash:', username);
            return res.status(401).json({ message: 'Invalid username or password.' });
        }

        // Verify password with bcrypt
        const isValidPassword = await bcrypt.compare(password, matchedUser.password_hash);
        
        if (!isValidPassword) {
            console.error('Password mismatch for user:', username);
            return res.status(401).json({ message: 'Invalid username or password.' });
        }

        const sessionToken = await createSession(matchedUser.username, matchedUser.role);

        return res.status(200).json({
            username: matchedUser.username,
            role: matchedUser.role,
            token: sessionToken
        });
    } catch (error) {
        console.error('Login error:', error);
        return res.status(500).json({ message: 'Server error during login. Please try again.' });
    }
}
