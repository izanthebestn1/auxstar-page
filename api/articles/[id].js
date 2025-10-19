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

async function ensureUniqueSlug(desiredSlug, excludeArticleId = null) {
    if (!desiredSlug) {
        return null;
    }

    let candidate = desiredSlug;
    let counter = 1;

    // eslint-disable-next-line no-constant-condition
    while (true) {
        const params = [candidate];
        let where = `slug IS NOT NULL AND LOWER(slug) = LOWER($1)`;

        if (excludeArticleId) {
            params.push(excludeArticleId);
            where += ` AND id <> $${params.length}`;
        }

        const { rows } = await query(
            `SELECT 1 FROM articles WHERE ${where} LIMIT 1`,
            params
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

async function fetchArticleTags(articleId) {
    const { rows } = await query(
        `SELECT t.name
         FROM article_tags at
         INNER JOIN tags t ON t.id = at.tag_id
         WHERE at.article_id = $1
         ORDER BY t.name ASC`,
        [articleId]
    );
    return rows.map((row) => row.name);
}

async function fetchArticleMedia(articleId) {
    const { rows } = await query(
        `SELECT id, media_type, data, caption, sort_order, created_at, updated_at
         FROM article_media
         WHERE article_id = $1
         ORDER BY sort_order ASC, created_at ASC`,
        [articleId]
    );

    return rows.map((row) => ({
        id: row.id,
        type: row.media_type,
        data: row.data,
        caption: row.caption,
        sortOrder: row.sort_order,
        createdAt: row.created_at,
        updatedAt: row.updated_at
    }));
}

export default async function handler(req, res) {
    await ensureSchema();

    const {
        query: { id }
    } = req;

    if (!id) {
        return res.status(400).json({ message: 'Article id is required.' });
    }

    if (req.method === 'PATCH') {
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

        if (!title && !category && !content && !image && !summary && !thumbnail && !status && !tags && !media && !publishedAt && !requestedSlug) {
            return res.status(400).json({ message: 'No fields provided to update.' });
        }

        try {
            const fields = [];
            const values = [];
            let index = 1;

            if (title !== undefined) {
                fields.push(`title = $${index}`);
                values.push(title);
                index += 1;
            }

            if (category !== undefined) {
                fields.push(`category = $${index}`);
                values.push(category);
                index += 1;
            }

            if (content !== undefined) {
                fields.push(`content = $${index}`);
                values.push(content);
                index += 1;
            }

            if (image !== undefined) {
                fields.push(`image_data = $${index}`);
                values.push(image);
                index += 1;
            }

            if (summary !== undefined) {
                fields.push(`summary = $${index}`);
                values.push(summary);
                index += 1;
            }

            if (thumbnail !== undefined) {
                fields.push(`thumbnail_data = $${index}`);
                values.push(thumbnail);
                index += 1;
            }

            let normalizedStatus = null;

            if (status !== undefined) {
                fields.push(`status = $${index}`);
                values.push(status);
                index += 1;
                if (typeof status === 'string') {
                    normalizedStatus = status.toLowerCase();
                }
            }

            if (publishedAt !== undefined) {
                let publishedAtValue = null;
                if (publishedAt) {
                    const parsed = new Date(publishedAt);
                    if (!Number.isNaN(parsed.getTime())) {
                        publishedAtValue = parsed.toISOString();
                    }
                }

                if (!publishedAtValue && (status === 'published' || status === 'approved')) {
                    publishedAtValue = new Date().toISOString();
                }

                fields.push(`published_at = $${index}`);
                values.push(publishedAtValue);
                index += 1;
            } else if (normalizedStatus) {
                if (normalizedStatus === 'published' || normalizedStatus === 'approved') {
                    fields.push('published_at = COALESCE(published_at, NOW())');
                } else if (['draft', 'pending', 'rejected'].includes(normalizedStatus)) {
                    fields.push('published_at = NULL');
                }
            }

            if (requestedSlug !== undefined) {
                const baseSlug = slugify(requestedSlug || title || '');
                const uniqueSlug = await ensureUniqueSlug(baseSlug, id);
                fields.push(`slug = $${index}`);
                values.push(uniqueSlug);
                index += 1;
            }

            fields.push(`updated_at = NOW()`);

            const { rows } = await query(
                `UPDATE articles
                 SET ${fields.join(', ')}
                 WHERE id = $${index}
                 RETURNING id, title, category, content, image_data, author, summary, thumbnail_data, slug, status, published_at, created_at, updated_at`,
                [...values, id]
            );

            if (!rows[0]) {
                return res.status(404).json({ message: 'Article not found.' });
            }

            const article = mapArticle(rows[0]);

            if (tags !== undefined) {
                article.tags = await upsertArticleTags(id, tags);
            } else {
                article.tags = await fetchArticleTags(id);
            }

            if (media !== undefined) {
                article.media = await upsertArticleMedia(id, media);
            } else {
                article.media = await fetchArticleMedia(id);
            }

            return res.status(200).json({ article });
        } catch (error) {
            console.error('Failed to update article:', error);
            return res.status(500).json({ message: 'Failed to update article.' });
        }
    }

    if (req.method === 'DELETE') {
        const session = await requireAdmin(req, res);
        if (!session) {
            return;
        }

        try {
            await query('DELETE FROM articles WHERE id = $1', [id]);
            return res.status(204).end();
        } catch (error) {
            console.error('Failed to delete article:', error);
            return res.status(500).json({ message: 'Failed to delete article.' });
        }
    }

    if (req.method === 'GET') {
        try {
            const { rows } = await query(
                `SELECT id, title, category, content, image_data, author, summary, thumbnail_data, slug, status, published_at, created_at, updated_at
                 FROM articles WHERE id = $1 LIMIT 1`,
                [id]
            );

            if (!rows[0]) {
                return res.status(404).json({ message: 'Article not found.' });
            }

            const article = mapArticle(rows[0]);
            article.tags = await fetchArticleTags(id);
            article.media = await fetchArticleMedia(id);

            return res.status(200).json({ article });
        } catch (error) {
            console.error('Failed to fetch article:', error);
            return res.status(500).json({ message: 'Failed to fetch article.' });
        }
    }

    res.setHeader('Allow', ['GET', 'PATCH', 'DELETE']);
    return res.status(405).json({ message: 'Method Not Allowed' });
}
