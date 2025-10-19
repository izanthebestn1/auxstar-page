import { invalidateSession } from './_auth.js';

export default async function handler(req, res) {
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
