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
                    password_hash TEXT NOT NULL,
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
                    summary TEXT,
                    thumbnail_data TEXT,
                    slug TEXT,
                    status TEXT NOT NULL DEFAULT 'pending',
                    published_at TIMESTAMPTZ,
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
                    ip_address TEXT,
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

            await pool.query(`
                ALTER TABLE evidence
                ADD COLUMN IF NOT EXISTS ip_address TEXT;
            `);

            await pool.query(`
                CREATE INDEX IF NOT EXISTS evidence_ip_idx ON evidence (ip_address);
            `);

            await pool.query(`
                CREATE TABLE IF NOT EXISTS evidence_ip_bans (
                    ip_address TEXT PRIMARY KEY,
                    reason TEXT,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                );
            `);

            await pool.query(`
                CREATE TABLE IF NOT EXISTS evidence_challenges (
                    id UUID PRIMARY KEY,
                    answer TEXT NOT NULL,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                );
            `);

            await pool.query(`
                CREATE INDEX IF NOT EXISTS evidence_challenges_created_idx ON evidence_challenges (created_at);
            `);

            await pool.query(`
                ALTER TABLE articles
                ADD COLUMN IF NOT EXISTS summary TEXT;
            `);

            await pool.query(`
                ALTER TABLE articles
                ADD COLUMN IF NOT EXISTS thumbnail_data TEXT;
            `);

            await pool.query(`
                ALTER TABLE articles
                ADD COLUMN IF NOT EXISTS slug TEXT;
            `);

            await pool.query(`
                CREATE UNIQUE INDEX IF NOT EXISTS articles_slug_unique ON articles ((LOWER(slug))) WHERE slug IS NOT NULL;
            `);

            await pool.query(`
                ALTER TABLE articles
                ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;
            `);

            await pool.query(`
                ALTER TABLE articles
                ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending';
            `);

            await pool.query(`
                CREATE TABLE IF NOT EXISTS tags (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    name TEXT NOT NULL UNIQUE,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                );
            `);

            await pool.query(`
                CREATE TABLE IF NOT EXISTS article_tags (
                    article_id UUID NOT NULL REFERENCES articles (id) ON DELETE CASCADE,
                    tag_id UUID NOT NULL REFERENCES tags (id) ON DELETE CASCADE,
                    PRIMARY KEY (article_id, tag_id)
                );
            `);

            await pool.query(`
                CREATE TABLE IF NOT EXISTS article_media (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    article_id UUID NOT NULL REFERENCES articles (id) ON DELETE CASCADE,
                    media_type TEXT NOT NULL,
                    data TEXT NOT NULL,
                    caption TEXT,
                    sort_order INTEGER NOT NULL DEFAULT 0,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                );
            `);

            await pool.query(`
                CREATE INDEX IF NOT EXISTS article_media_article_idx ON article_media (article_id);
            `);

            await pool.query(`
                CREATE TABLE IF NOT EXISTS events (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    title TEXT NOT NULL,
                    description TEXT,
                    event_date TIMESTAMPTZ NOT NULL,
                    location TEXT,
                    status TEXT NOT NULL DEFAULT 'upcoming',
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                );
            `);

            await pool.query(`
                CREATE INDEX IF NOT EXISTS events_date_idx ON events (event_date);
            `);

            await pool.query(`
                CREATE TABLE IF NOT EXISTS wanted_list (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    roblox_username TEXT NOT NULL,
                    avatar_url TEXT,
                    charges TEXT NOT NULL,
                    law_name TEXT,
                    law_section TEXT,
                    status TEXT NOT NULL DEFAULT 'wanted',
                    reward_amount TEXT,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                );
            `);

            await pool.query(`
                CREATE INDEX IF NOT EXISTS wanted_list_status_idx ON wanted_list (status);
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
