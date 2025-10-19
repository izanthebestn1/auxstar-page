import crypto from 'node:crypto';
import { ensureSchema, query } from '../_db.js';
import { requireAdmin } from '../_auth.js';

function mapArticle(row) {
    return {
        id: row.id,
        title: row.title,
        category: row.category,
        content: row.content,
        image: row.image_data,
        author: row.author,
        summary: row.summary,
        thumbnail: row.thumbnail_data,
        slug: row.slug,
        status: row.status,
        publishedAt: row.published_at,
        createdAt: row.created_at,
        updatedAt: row.updated_at
    };
}

function slugify(value) {
    if (!value) {
        return '';
    }

    const base = value
        .toString()
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');

    return base ? base : crypto.randomUUID().slice(0, 8);
}

async function ensureUniqueSlug(desiredSlug) {
    if (!desiredSlug) {
        return null;
    }

    let candidate = desiredSlug;
    let counter = 1;

    // eslint-disable-next-line no-constant-condition
    while (true) {
        const { rows } = await query(
            `SELECT 1 FROM articles WHERE slug IS NOT NULL AND LOWER(slug) = LOWER($1) LIMIT 1`,
            [candidate]
        );

        if (!rows.length) {
            return candidate;
        }

        counter += 1;
        candidate = `${desiredSlug}-${counter}`;
    }
}

function normalizeTagNames(tags) {
    if (!Array.isArray(tags)) {
        return [];
    }

    const unique = new Set();
    tags.forEach((tag) => {
        if (typeof tag !== 'string') {
            return;
        }
        const normalized = tag.trim();
        if (normalized) {
            unique.add(normalized);
        }
    });
    return Array.from(unique);
}

async function ensureTags(names) {
    const normalized = normalizeTagNames(names);
    if (!normalized.length) {
        return [];
    }

    const tagRecords = [];
    for (const name of normalized) {
        const { rows } = await query(
            `INSERT INTO tags (name)
             VALUES ($1)
             ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
             RETURNING id, name`,
            [name]
        );
        tagRecords.push(rows[0]);
    }
    return tagRecords;
}

async function upsertArticleTags(articleId, tagNames) {
    const tags = await ensureTags(tagNames);

    await query(`DELETE FROM article_tags WHERE article_id = $1`, [articleId]);

    if (!tags.length) {
        return [];
    }

    for (const tag of tags) {
        await query(
            `INSERT INTO article_tags (article_id, tag_id)
             VALUES ($1, $2)
             ON CONFLICT (article_id, tag_id) DO NOTHING`,
            [articleId, tag.id]
        );
    }

    return tags.map((tag) => tag.name);
}

async function upsertArticleMedia(articleId, mediaItems) {
    if (!Array.isArray(mediaItems)) {
        await query(`DELETE FROM article_media WHERE article_id = $1`, [articleId]);
        return [];
    }

    const sanitized = mediaItems
        .map((item, index) => ({
            type: typeof item?.type === 'string' ? item.type.trim().toLowerCase() : 'image',
            data: typeof item?.data === 'string' ? item.data : null,
            caption: typeof item?.caption === 'string' ? item.caption.trim() : null,
            sortOrder: Number.isFinite(item?.sortOrder) ? item.sortOrder : index
        }))
        .filter((item) => item.data);

    await query(`DELETE FROM article_media WHERE article_id = $1`, [articleId]);

    const inserted = [];
    for (const media of sanitized) {
        const { rows } = await query(
            `INSERT INTO article_media (article_id, media_type, data, caption, sort_order)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING id, media_type, data, caption, sort_order, created_at, updated_at`,
            [articleId, media.type || 'image', media.data, media.caption || null, media.sortOrder]
        );
        inserted.push({
            id: rows[0].id,
            type: rows[0].media_type,
            data: rows[0].data,
            caption: rows[0].caption,
            sortOrder: rows[0].sort_order,
            createdAt: rows[0].created_at,
            updatedAt: rows[0].updated_at
        });
    }

    inserted.sort((a, b) => a.sortOrder - b.sortOrder);
    return inserted;
}

async function attachRelations(articles) {
    if (!articles.length) {
        return articles;
    }

    const ids = articles.map((article) => article.id);

    const { rows: tagRows } = await query(
        `SELECT at.article_id, t.name
         FROM article_tags at
         INNER JOIN tags t ON t.id = at.tag_id
         WHERE at.article_id = ANY($1::uuid[])`
        ,
        [ids]
    );

    const tagMap = new Map();
    tagRows.forEach((row) => {
        if (!tagMap.has(row.article_id)) {
            tagMap.set(row.article_id, []);
        }
        tagMap.get(row.article_id).push(row.name);
    });

    const { rows: mediaRows } = await query(
        `SELECT id, article_id, media_type, data, caption, sort_order, created_at, updated_at
         FROM article_media
         WHERE article_id = ANY($1::uuid[])
         ORDER BY sort_order ASC, created_at ASC`,
        [ids]
    );

    const mediaMap = new Map();
    mediaRows.forEach((row) => {
        if (!mediaMap.has(row.article_id)) {
            mediaMap.set(row.article_id, []);
        }
        mediaMap.get(row.article_id).push({
            id: row.id,
            type: row.media_type,
            data: row.data,
            caption: row.caption,
            sortOrder: row.sort_order,
            createdAt: row.created_at,
            updatedAt: row.updated_at
        });
    });

    return articles.map((article) => ({
        ...article,
        tags: tagMap.get(article.id) || [],
        media: mediaMap.get(article.id) || []
    }));
}

export default async function handler(req, res) {
    await ensureSchema();

    if (req.method === 'GET') {
        try {
            const scope = req.query.scope;
            const slugParam = typeof req.query.slug === 'string' ? req.query.slug.trim() : '';

            if (slugParam) {
                const { rows } = await query(
                    `SELECT id, title, category, content, image_data, author, summary, thumbnail_data, slug, status, published_at, created_at, updated_at
                     FROM articles
                     WHERE slug IS NOT NULL AND LOWER(slug) = LOWER($1)
                     LIMIT 1`,
                    [slugParam]
                );

                if (!rows.length) {
                    return res.status(404).json({ message: 'Article not found.' });
                }

                const article = mapArticle(rows[0]);

                if (scope !== 'admin' && !['approved', 'published'].includes((article.status || '').toLowerCase())) {
                    return res.status(404).json({ message: 'Article not found.' });
                }

                const [enriched] = await attachRelations([article]);
                return res.status(200).json({ article: enriched });
            }

            const rawLimit = parseInt(req.query.limit, 10);
            const limit = Number.isFinite(rawLimit) && rawLimit > 0
                ? Math.min(rawLimit, scope === 'admin' ? 200 : 50)
                : scope === 'admin'
                    ? 50
                    : 12;

            const rawStatus = typeof req.query.status === 'string' ? req.query.status.trim() : '';
            const normalizedStatus = rawStatus.toLowerCase();
            const statusFilter = normalizedStatus && normalizedStatus !== 'all' ? normalizedStatus : null;

            if (scope === 'admin') {
                const session = await requireAdmin(req, res);
                if (!session) {
                    return;
                }

                const params = [];
                let filterSql = '';

                if (statusFilter) {
                    params.push(statusFilter);
                    filterSql = `WHERE status = $${params.length}`;
                }

                params.push(limit);

                const { rows } = await query(
                    `SELECT id, title, category, content, image_data, author, summary, thumbnail_data, slug, status, published_at, created_at, updated_at
                     FROM articles
                     ${filterSql}
                     ORDER BY updated_at DESC, created_at DESC
                     LIMIT $${params.length}`,
                    params
                );

                const articles = rows.map(mapArticle);
                const enriched = await attachRelations(articles);
                return res.status(200).json({ articles: enriched });
            }

            const publicStatus = statusFilter || 'approved';
            const { rows } = await query(
                `SELECT id, title, category, content, image_data, author, summary, thumbnail_data, slug, status, published_at, created_at, updated_at
                 FROM articles
                 WHERE status = $1
                 ORDER BY COALESCE(published_at, updated_at, created_at) DESC, created_at DESC
                 LIMIT $2`,
                [publicStatus, limit]
            );

            const articles = rows.map(mapArticle);
            const enriched = await attachRelations(articles);
            return res.status(200).json({ articles: enriched });
        } catch (error) {
            console.error('Failed to fetch articles:', error);
            return res.status(500).json({ message: 'Failed to fetch articles.' });
        }
    }

    if (req.method === 'POST') {
        const session = await requireAdmin(req, res);
        if (!session) {
            return;
        }

        const {
            title,
            category,
            content,
            image,
            summary,
            thumbnail,
            tags,
            media,
            status,
            publishedAt,
            slug: requestedSlug
        } = req.body || {};

        if (!title || !category || !content) {
            return res.status(400).json({ message: 'Title, category, and content are required.' });
        }

        try {
            const id = crypto.randomUUID();
            const articleStatus = status || 'pending';

            const baseSlug = slugify(requestedSlug || title);
            const effectiveSlug = await ensureUniqueSlug(baseSlug);

            let publishedAtValue = null;
            if (publishedAt) {
                const parsed = new Date(publishedAt);
                if (!Number.isNaN(parsed.getTime())) {
                    publishedAtValue = parsed.toISOString();
                }
            }

            if (!publishedAtValue && (articleStatus === 'published' || articleStatus === 'approved')) {
                publishedAtValue = new Date().toISOString();
            }

            const { rows } = await query(
                `INSERT INTO articles (id, title, category, content, image_data, author, summary, thumbnail_data, slug, status, published_at)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                 RETURNING id, title, category, content, image_data, author, summary, thumbnail_data, slug, status, published_at, created_at, updated_at` ,
                [
                    id,
                    title,
                    category,
                    content,
                    image || null,
                    session.username,
                    summary || null,
                    thumbnail || null,
                    effectiveSlug,
                    articleStatus,
                    publishedAtValue
                ]
            );

            const article = mapArticle(rows[0]);
            article.tags = await upsertArticleTags(id, tags);
            article.media = await upsertArticleMedia(id, media);

            return res.status(201).json({ article });
        } catch (error) {
            console.error('Failed to create article:', error);
            return res.status(500).json({ message: 'Failed to create article.' });
        }
    }

    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).json({ message: 'Method Not Allowed' });
}
