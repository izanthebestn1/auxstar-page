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
        const { articles } = await fetchArticles({ status: 'approved' });
        const filtered = (articles || [])
            .filter((article) => article.status === 'approved' && article.category !== 'railroads')
            .filter((article) => currentFilter === 'all' || article.category === currentFilter);

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
    const excerpt = escapeHtml(truncateText(article.content || '', 100));
    const author = escapeHtml(article.author || 'Auxstar');
    const dateDisplay = escapeHtml(formatDate(article.updatedAt || article.createdAt) || '');
    const imageMarkup = getArticleImageMarkup(article.image, title, category);
    const url = `article.html?id=${encodeURIComponent(article.id)}`;

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

function getArticleImageMarkup(image, title, category) {
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
