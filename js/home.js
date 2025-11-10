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
    const [approvedResponse, publishedResponse] = await Promise.all([
        fetchArticles({ status: 'approved', limit: 12 }),
        fetchArticles({ status: 'published', limit: 12 })
    ]);

    const merged = [...(approvedResponse.articles || []), ...(publishedResponse.articles || [])];
    const unique = Array.from(new Map(merged.map((article) => [article.id, article])).values());

    const publicArticles = unique
        .filter((article) => ['approved', 'published'].includes((article.status || '').toLowerCase()))
        .sort((a, b) => {
            const aDate = new Date(a.publishedAt || a.updatedAt || a.createdAt || 0).getTime();
            const bDate = new Date(b.publishedAt || b.updatedAt || b.createdAt || 0).getTime();
            return bDate - aDate;
        });

    renderFeaturedArticles(publicArticles.slice(0, 3));
    renderRecentArticles(publicArticles.slice(0, 5));
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
        const summarySource = article.summary || article.content || '';
        const excerpt = escapeHtml(truncateText(summarySource, 120));
        const dateDisplay = escapeHtml(formatDate(article.updatedAt || article.createdAt) || '');
        const imageMarkup = buildArticleImageMarkup(article, title, category);
        const url = article.slug
            ? `article.html?slug=${encodeURIComponent(article.slug)}`
            : `article.html?id=${encodeURIComponent(article.id)}`;

        // Check if article is scheduled
        const scheduledMarkup = buildScheduledMarkup(article);

        return `
            <a class="article-card ${scheduledMarkup ? 'scheduled' : ''}" href="${url}">
                ${imageMarkup}
                <div class="article-content">
                    <span class="article-category">${categoryLabel}</span>
                    <h3 class="article-title">${title}</h3>
                    <p class="article-excerpt">${excerpt}</p>
                    ${scheduledMarkup}
                    <div class="article-meta">
                        <strong>${dateDisplay}</strong>
                    </div>
                </div>
            </a>
        `;
    }).join('');

    // Start countdown timers
    startCountdownTimers();
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
        const summarySource = article.summary || article.content || '';
        const excerpt = escapeHtml(truncateText(summarySource, 90));
        const author = escapeHtml(article.author || 'Auxstar');
        const dateDisplay = escapeHtml(formatDate(article.updatedAt || article.createdAt) || '');
        const url = article.slug
            ? `article.html?slug=${encodeURIComponent(article.slug)}`
            : `article.html?id=${encodeURIComponent(article.id)}`;

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

function buildArticleImageMarkup(article, title, category) {
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

function buildScheduledMarkup(article) {
    if (!article.publishedAt) {
        return '';
    }

    const publishTime = new Date(article.publishedAt).getTime();
    const now = new Date().getTime();

    if (publishTime <= now) {
        return '';
    }

    const timeUntil = getTimeUntil(article.publishedAt);
    if (!timeUntil) {
        return '';
    }

    return `<div class="article-countdown" data-target="${article.publishedAt}">
        <span class="countdown-label">🕐 Publishes in:</span>
        <span class="countdown-time">${formatCountdown(timeUntil)}</span>
    </div>`;
}

function startCountdownTimers() {
    const countdowns = document.querySelectorAll('.article-countdown');
    if (!countdowns.length) {
        return;
    }

    const interval = setInterval(() => {
        let hasActive = false;

        countdowns.forEach((countdown) => {
            const target = countdown.dataset.target;
            if (!target) {
                return;
            }

            const timeUntil = getTimeUntil(target);
            if (!timeUntil) {
                countdown.querySelector('.countdown-time').textContent = 'Published!';
                setTimeout(() => location.reload(), 2000);
                return;
            }

            hasActive = true;
            countdown.querySelector('.countdown-time').textContent = formatCountdown(timeUntil);
        });

        if (!hasActive) {
            clearInterval(interval);
        }
    }, 1000);
}
