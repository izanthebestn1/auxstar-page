// Article Detail Page Script

document.addEventListener('DOMContentLoaded', () => {
    loadArticleDetail().catch((error) => {
        console.error('Failed to load article detail:', error);
        renderError('Unable to load this article right now.');
    });
});

function getArticleQuery() {
    const params = new URLSearchParams(window.location.search);
    return {
        id: params.get('id'),
        slug: params.get('slug')
    };
}

async function loadArticleDetail() {
    const { id, slug } = getArticleQuery();
    if (!id && !slug) {
        renderError('Article not found.');
        return;
    }

    try {
        let article = null;

        if (id) {
            const response = await fetchArticleById(id);
            article = response.article;
        } else if (slug) {
            const response = await fetchArticleBySlug(slug);
            article = response.article;
        }

        if (!article) {
            renderError('Article not found.');
            return;
        }

        renderArticle(article);
    } catch (error) {
        if (error && error.status === 404) {
            renderError('Article not found.');
            return;
        }

        throw error;
    }
}

function renderArticle(article) {
    if (article && article.title) {
        document.title = `${article.title} - Auxstar Media`;
    }

    const titleEl = document.getElementById('articleTitle');
    const metaEl = document.getElementById('articleMeta');
    const bodyEl = document.getElementById('articleContent');
    const heroEl = document.getElementById('articleHero');
    const summaryEl = document.getElementById('articleSummary');
    const tagsEl = document.getElementById('articleTags');
    const galleryEl = document.getElementById('articleGallery');

    if (titleEl) {
        titleEl.textContent = article.title || 'Untitled Article';
    }

    if (metaEl) {
        const author = article.author ? escapeHtml(article.author) : 'Auxstar';
        const dateDisplay = formatDate(article.publishedAt || article.updatedAt || article.createdAt) || '';
        metaEl.textContent = dateDisplay ? `${dateDisplay} • ${author}` : author;
    }

    if (heroEl) {
        let heroImage = article.thumbnail || article.image;

        if (!heroImage && Array.isArray(article.media)) {
            const fallbackMedia = article.media.find((item) => {
                if (!item || typeof item.data !== 'string') {
                    return false;
                }
                return item.data.startsWith('data:image') || /^https?:\/\//i.test(item.data);
            });
            if (fallbackMedia) {
                heroImage = fallbackMedia.data;
            }
        }

        if (heroImage && typeof heroImage === 'string' && (heroImage.startsWith('data:image') || /^https?:\/\//i.test(heroImage))) {
            heroEl.classList.add('has-hero');
            heroEl.style.backgroundImage = 'none';
            heroEl.innerHTML = `<img src="${heroImage}" alt="${escapeHtml(article.title || 'Article cover')}" loading="lazy">`;
        } else {
            heroEl.classList.remove('has-hero');
            heroEl.style.backgroundImage = 'none';
            heroEl.innerHTML = '<div class="article-hero-placeholder">📰 Auxstar Media</div>';
        }
    }

    if (summaryEl) {
        if (article.summary) {
            summaryEl.textContent = article.summary.trim();
            summaryEl.style.display = 'block';
        } else {
            summaryEl.textContent = '';
            summaryEl.style.display = 'none';
        }
    }

    if (tagsEl) {
        if (Array.isArray(article.tags) && article.tags.length) {
            tagsEl.innerHTML = article.tags
                .map((tag) => `<span class="tag-chip">${escapeHtml(tag)}</span>`)
                .join('');
            tagsEl.style.display = 'flex';
        } else {
            tagsEl.innerHTML = '';
            tagsEl.style.display = 'none';
        }
    }

    if (!bodyEl) {
        return;
    }

    const markdown = article.content || '';
    let parsedHtml = '';

    try {
        const html = marked.parse(markdown, { mangle: false, headerIds: false });
        parsedHtml = DOMPurify.sanitize(html);
    } catch (error) {
        console.error('Markdown parsing failed:', error);
        parsedHtml = `<p>${escapeHtml(markdown)}</p>`;
    }

    bodyEl.innerHTML = `
        <article>
            ${parsedHtml}
        </article>
    `;

    if (galleryEl) {
        const mediaItems = Array.isArray(article.media)
            ? article.media.filter((item) => item && typeof item.data === 'string' && item.data.startsWith('data:image'))
            : [];

        if (!mediaItems.length) {
            galleryEl.innerHTML = '';
            galleryEl.style.display = 'none';
        } else {
            galleryEl.style.display = 'grid';
            galleryEl.innerHTML = mediaItems.map((item) => {
                const caption = item.caption ? `<figcaption>${escapeHtml(item.caption)}</figcaption>` : '';
                return `
                    <figure>
                        <img src="${item.data}" alt="${escapeHtml(article.title || 'Article media')}" loading="lazy">
                        ${caption}
                    </figure>
                `;
            }).join('');
        }
    }
}

function renderError(message) {
    const titleEl = document.getElementById('articleTitle');
    const metaEl = document.getElementById('articleMeta');
    const bodyEl = document.getElementById('articleContent');
    const heroEl = document.getElementById('articleHero');
    const summaryEl = document.getElementById('articleSummary');
    const tagsEl = document.getElementById('articleTags');
    const galleryEl = document.getElementById('articleGallery');

    if (titleEl) {
        titleEl.textContent = 'Article unavailable';
    }

    if (metaEl) {
        metaEl.textContent = '';
    }

    if (heroEl) {
        heroEl.classList.remove('has-hero');
        heroEl.style.backgroundImage = 'none';
        heroEl.innerHTML = '<div class="article-hero-placeholder">📰 Article unavailable</div>';
    }

    if (summaryEl) {
        summaryEl.textContent = '';
        summaryEl.style.display = 'none';
    }

    if (tagsEl) {
        tagsEl.innerHTML = '';
        tagsEl.style.display = 'none';
    }

    if (bodyEl) {
        bodyEl.innerHTML = `<div class="empty-state"><p>${escapeHtml(message)}</p></div>`;
    }

    if (galleryEl) {
        galleryEl.innerHTML = '';
        galleryEl.style.display = 'none';
    }
}
