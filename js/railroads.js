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
        const { articles } = await fetchArticles({ status: 'approved' });
        const railroads = (articles || []).filter((article) => article.status === 'approved' && article.category === 'railroads');

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
    const excerpt = escapeHtml(truncateText(article.content || '', 100));
    const author = escapeHtml(article.author || 'Auxstar');
    const dateDisplay = escapeHtml(formatDate(article.updatedAt || article.createdAt) || '');
    const imageMarkup = buildRailroadImageMarkup(article.image, title);

    const url = `article.html?id=${encodeURIComponent(article.id)}`;

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

function buildRailroadImageMarkup(image, title) {
    if (typeof image === 'string' && image.startsWith('data:image')) {
        return `<div class="railroads-image"><img src="${image}" alt="${title}"></div>`;
    }

    return '<div class="railroads-image"><span>🚂 RAILROADS</span></div>';
}
