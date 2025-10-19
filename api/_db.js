import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL
    || process.env.POSTGRES_URL
    || process.env.POSTGRES_PRISMA_URL;

if (!connectionString) {
    throw new Error('Database connection string is missing. Set DATABASE_URL or POSTGRES_URL.');
}

const pool = new Pool({
    connectionString,
    ssl: {
        rejectUnauthorized: false
    }
});

let schemaReadyPromise = null;

export async function ensureSchema() {
    if (!schemaReadyPromise) {
        schemaReadyPromise = (async () => {
            await pool.query('CREATE EXTENSION IF NOT EXISTS pgcrypto;');

            await pool.query(`
                CREATE TABLE IF NOT EXISTS users (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    username TEXT NOT NULL,
                    password TEXT NOT NULL,
                    role TEXT NOT NULL DEFAULT 'editor',
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                );
            `);

            await pool.query(`
                CREATE UNIQUE INDEX IF NOT EXISTS users_username_unique
                ON users ((LOWER(username)));
            `);

            await pool.query(`
                CREATE TABLE IF NOT EXISTS sessions (
                    token UUID PRIMARY KEY,
                    username TEXT NOT NULL,
                    role TEXT NOT NULL,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    expires_at TIMESTAMPTZ NOT NULL
                );
            `);

            await pool.query(`
                CREATE TABLE IF NOT EXISTS articles (
                    id UUID PRIMARY KEY,
                    title TEXT NOT NULL,
                    category TEXT NOT NULL,
                    content TEXT NOT NULL,
                    image_data TEXT,
                    author TEXT,
                    status TEXT NOT NULL DEFAULT 'pending',
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                );
            `);

            await pool.query(`
                CREATE TABLE IF NOT EXISTS evidence (
                    id UUID PRIMARY KEY,
                    title TEXT NOT NULL,
                    description TEXT NOT NULL,
                    name TEXT,
                    email TEXT,
                    status TEXT NOT NULL DEFAULT 'submitted',
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                );
            `);

            await pool.query(`
                ALTER TABLE articles
                ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
            `);

            await pool.query(`
                ALTER TABLE evidence
                ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
            `);
        })()
            .catch((error) => {
                schemaReadyPromise = null;
                console.error('Schema initialization failed:', error);
                throw error;
            });
    }

    return schemaReadyPromise;
}

export async function query(text, params) {
    return pool.query(text, params);
}
