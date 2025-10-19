// Home Page Script

document.addEventListener('DOMContentLoaded', () => {
    loadHomeArticles().catch((error) => {
        console.error('Failed to load home articles:', error);
        const featuredContainer = document.getElementById('featuredArticles');
        const recentContainer = document.getElementById('recentArticles');
        if (featuredContainer) {
            featuredContainer.innerHTML = '<div class="empty-state"><p>📝 No articles yet</p></div>';
        }
        if (recentContainer) {
            recentContainer.innerHTML = '<div class="empty-state"><p>📰 No news available</p></div>';
        }
    });
});

async function loadHomeArticles() {
    const { articles } = await fetchArticles({ status: 'approved', limit: 12 });
    const approved = (articles || []).filter((article) => article.status === 'approved');

    renderFeaturedArticles(approved.slice(0, 3));
    renderRecentArticles(approved.slice(0, 5));
}

function renderFeaturedArticles(articles) {
    const container = document.getElementById('featuredArticles');
    if (!container) {
        return;
    }

    if (!articles.length) {
        container.innerHTML = '<div class="empty-state"><p>📝 No articles yet</p></div>';
        return;
    }

    container.innerHTML = articles.map((article) => {
        const title = escapeHtml(article.title || 'Untitled');
        const category = article.category || 'news';
        const categoryLabel = escapeHtml(getCategoryLabel(category));
        const excerpt = escapeHtml(truncateText(article.content || '', 100));
        const dateDisplay = escapeHtml(formatDate(article.updatedAt || article.createdAt) || '');
        const imageMarkup = buildArticleImageMarkup(article.image, title, category);
        const url = `article.html?id=${encodeURIComponent(article.id)}`;

        return `
            <a class="article-card" href="${url}">
                ${imageMarkup}
                <div class="article-content">
                    <span class="article-category">${categoryLabel}</span>
                    <h3 class="article-title">${title}</h3>
                    <p class="article-excerpt">${excerpt}</p>
                    <div class="article-meta">
                        <strong>${dateDisplay}</strong>
                    </div>
                </div>
            </a>
        `;
    }).join('');
}

function renderRecentArticles(articles) {
    const container = document.getElementById('recentArticles');
    if (!container) {
        return;
    }

    if (!articles.length) {
        container.innerHTML = '<div class="empty-state"><p>📰 No news available</p></div>';
        return;
    }

    container.innerHTML = articles.map((article) => {
        const title = escapeHtml(article.title || 'Untitled');
        const excerpt = escapeHtml(truncateText(article.content || '', 80));
        const author = escapeHtml(article.author || 'Auxstar');
        const dateDisplay = escapeHtml(formatDate(article.updatedAt || article.createdAt) || '');
        const url = `article.html?id=${encodeURIComponent(article.id)}`;

        return `
            <a class="article-list-item" href="${url}">
                <div class="item-content">
                    <h4>${title}</h4>
                    <p>${excerpt}</p>
                    <small>${dateDisplay} • ${author}</small>
                </div>
            </a>
        `;
    }).join('');
}

function buildArticleImageMarkup(image, title, category) {
    if (typeof image === 'string' && image.startsWith('data:image')) {
        return `<div class="article-image"><img src="${image}" alt="${title}"></div>`;
    }

    return `<div class="article-image"><span>📰 ${escapeHtml(category.toUpperCase())}</span></div>`;
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
