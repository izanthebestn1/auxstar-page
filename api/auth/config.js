import crypto from 'node:crypto';
import { ensureSchema, query } from '../_db.js';

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

export default async function handler(req, res) {
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
