// Articles Page Script

let currentFilter = 'all';

document.addEventListener('DOMContentLoaded', () => {
    setupFilterButtons();
    loadArticles().catch((error) => {
        console.error('Failed to load articles:', error);
        const container = document.getElementById('articlesList');
        if (container) {
            container.innerHTML = '<div class="empty-state" style="grid-column: 1/-1;"><p>Unable to load articles right now.</p></div>';
        }
    });
});

function setupFilterButtons() {
    document.querySelectorAll('.filter-btn').forEach((button) => {
        button.addEventListener('click', async (event) => {
            document.querySelectorAll('.filter-btn').forEach((btn) => btn.classList.remove('active'));
            button.classList.add('active');
            currentFilter = button.dataset.filter || 'all';
            await loadArticles();
        });
    });
}

async function loadArticles() {
    const container = document.getElementById('articlesList');
    if (!container) {
        return;
    }

    container.innerHTML = '<div class="empty-state" style="grid-column: 1/-1;"><p>Loading articles...</p></div>';

    try {
        const [approvedResponse, publishedResponse] = await Promise.all([
            fetchArticles({ status: 'approved' }),
            fetchArticles({ status: 'published' })
        ]);

        const merged = [...(approvedResponse.articles || []), ...(publishedResponse.articles || [])];
        const unique = Array.from(new Map(merged.map((article) => [article.id, article])).values());

        const filtered = unique
            .filter((article) => ['approved', 'published'].includes((article.status || '').toLowerCase()))
            .filter((article) => article.category !== 'railroads')
            .filter((article) => currentFilter === 'all' || article.category === currentFilter)
            .sort((a, b) => {
                const aDate = new Date(a.publishedAt || a.updatedAt || a.createdAt || 0).getTime();
                const bDate = new Date(b.publishedAt || b.updatedAt || b.createdAt || 0).getTime();
                return bDate - aDate;
            });

        if (!filtered.length) {
            container.innerHTML = '<div class="empty-state" style="grid-column: 1/-1;"><p>📝 No articles available</p></div>';
            return;
        }

        container.innerHTML = filtered.map((article) => renderArticleCard(article)).join('');
    } catch (error) {
        console.error('Failed to fetch articles:', error);
        container.innerHTML = '<div class="empty-state" style="grid-column: 1/-1;"><p>Unable to load articles right now.</p></div>';
    }
}

function renderArticleCard(article) {
    const title = escapeHtml(article.title || 'Untitled');
    const category = article.category || 'news';
    const categoryLabel = escapeHtml(getCategoryLabel(category));
    const summarySource = article.summary || article.content || '';
    const excerpt = escapeHtml(truncateText(summarySource, 140));
    const author = escapeHtml(article.author || 'Auxstar');
    const dateDisplay = escapeHtml(formatDate(article.updatedAt || article.createdAt) || '');
    const imageMarkup = getArticleImageMarkup(article, title, category);
    const url = article.slug
        ? `article.html?slug=${encodeURIComponent(article.slug)}`
        : `article.html?id=${encodeURIComponent(article.id)}`;

    return `
        <a class="article-card" href="${url}">
            ${imageMarkup}
            <div class="article-content">
                <span class="article-category">${categoryLabel}</span>
                <h3 class="article-title">${title}</h3>
                <p class="article-excerpt">${excerpt}</p>
                <div class="article-meta">
                    <strong>${dateDisplay}</strong> by ${author}
                </div>
            </div>
        </a>
    `;
}

function getArticleImageMarkup(article, title, category) {
    const image = resolveArticleImage(article);

    if (image) {
        return `<div class="article-image"><img src="${image}" alt="${title}"></div>`;
    }

    return `<div class="article-image"><span>📰 ${escapeHtml(category.toUpperCase())}</span></div>`;
}

function resolveArticleImage(article) {
    if (!article) {
        return null;
    }

    const candidates = [];

    if (typeof article.thumbnail === 'string') {
        candidates.push(article.thumbnail);
    }
    if (typeof article.image === 'string') {
        candidates.push(article.image);
    }
    if (Array.isArray(article.media)) {
        for (const media of article.media) {
            if (media && typeof media.data === 'string') {
                candidates.push(media.data);
            }
        }
    }

    return candidates.find((value) => typeof value === 'string' && (value.startsWith('data:image') || /^https?:\/\//i.test(value))) || null;
}

function getCategoryLabel(category) {
    const labels = {
        news: '📰 News',
        update: '🔔 Update',
        evidence: '📋 Evidence',
        railroads: '🚂 Railroads'
    };
    return labels[category] || category;
}
