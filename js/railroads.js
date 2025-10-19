// Railroads Page Script

document.addEventListener('DOMContentLoaded', () => {
    loadRailroads().catch((error) => {
        console.error('Failed to load railroads content:', error);
        const container = document.getElementById('railroadsList');
        if (container) {
            container.innerHTML = '<div class="empty-state" style="grid-column: 1/-1;"><p>🚂 No Railroads content available</p></div>';
        }
    });
});

async function loadRailroads() {
    const container = document.getElementById('railroadsList');
    if (!container) {
        return;
    }

    container.innerHTML = '<div class="empty-state" style="grid-column: 1/-1;"><p>Loading railroads content...</p></div>';

    try {
        const [approvedResponse, publishedResponse] = await Promise.all([
            fetchArticles({ status: 'approved' }),
            fetchArticles({ status: 'published' })
        ]);

        const merged = [...(approvedResponse.articles || []), ...(publishedResponse.articles || [])];
        const unique = Array.from(new Map(merged.map((article) => [article.id, article])).values());

        const railroads = unique
            .filter((article) => ['approved', 'published'].includes((article.status || '').toLowerCase()))
            .filter((article) => article.category === 'railroads')
            .sort((a, b) => {
                const aDate = new Date(a.publishedAt || a.updatedAt || a.createdAt || 0).getTime();
                const bDate = new Date(b.publishedAt || b.updatedAt || b.createdAt || 0).getTime();
                return bDate - aDate;
            });

        if (!railroads.length) {
            container.innerHTML = '<div class="empty-state" style="grid-column: 1/-1;"><p>🚂 No Railroads content available</p></div>';
            return;
        }

        container.innerHTML = railroads.map((article) => renderRailroadCard(article)).join('');
    } catch (error) {
        console.error('Failed to fetch railroads articles:', error);
        container.innerHTML = '<div class="empty-state" style="grid-column: 1/-1;"><p>🚂 No Railroads content available</p></div>';
    }
}

function renderRailroadCard(article) {
    const title = escapeHtml(article.title || 'Untitled');
    const summarySource = article.summary || article.content || '';
    const excerpt = escapeHtml(truncateText(summarySource, 120));
    const author = escapeHtml(article.author || 'Auxstar');
    const dateDisplay = escapeHtml(formatDate(article.updatedAt || article.createdAt) || '');
    const imageMarkup = buildRailroadImageMarkup(article, title);

    const url = article.slug
        ? `article.html?slug=${encodeURIComponent(article.slug)}`
        : `article.html?id=${encodeURIComponent(article.id)}`;

    return `
        <a class="railroads-card" href="${url}">
            ${imageMarkup}
            <div class="railroads-content">
                <h3 class="railroads-title">${title}</h3>
                <p class="railroads-excerpt">${excerpt}</p>
                <div class="article-meta">
                    <strong>${dateDisplay}</strong> by ${author}
                </div>
            </div>
        </a>
    `;
}

function buildRailroadImageMarkup(article, title) {
    const image = resolveArticleImage(article);

    if (image) {
        return `<div class="railroads-image"><img src="${image}" alt="${title}"></div>`;
    }

    return '<div class="railroads-image"><span>🚂 RAILROADS</span></div>';
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
