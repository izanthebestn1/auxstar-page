// Home Page Script

document.addEventListener('DOMContentLoaded', () => {
    loadFeaturedArticles();
    loadRecentArticles();
});

function loadFeaturedArticles() {
    const articles = JSON.parse(localStorage.getItem('auxstarArticles')) || [];
    const approvedArticles = articles.filter(a => a.status === 'approved').slice(0, 3);
    
    const container = document.getElementById('featuredArticles');
    
    if (approvedArticles.length === 0) {
        container.innerHTML = '<div class="empty-state"><p>📝 No articles yet</p></div>';
        return;
    }
    
    container.innerHTML = approvedArticles.map(article => `
        <div class="article-card">
            ${article.image ? `<div class="article-image"><img src="${article.image}" alt="${article.title}"></div>` : `<div class="article-image"><span>📰 ${article.category.toUpperCase()}</span></div>`}
            <div class="article-content">
                <span class="article-category">${getCategoryLabel(article.category)}</span>
                <h3 class="article-title">${article.title}</h3>
                <p class="article-excerpt">${article.content.substring(0, 100)}...</p>
                <div class="article-meta">
                    <strong>${article.date}</strong>
                </div>
            </div>
        </div>
    `).join('');
}

function loadRecentArticles() {
    const articles = JSON.parse(localStorage.getItem('auxstarArticles')) || [];
    const approvedArticles = articles.filter(a => a.status === 'approved').slice(0, 5);
    
    const container = document.getElementById('recentArticles');
    
    if (approvedArticles.length === 0) {
        container.innerHTML = '<div class="empty-state"><p>📰 No news available</p></div>';
        return;
    }
    
    container.innerHTML = approvedArticles.map(article => `
        <div class="article-list-item">
            <div class="item-content">
                <h4>${article.title}</h4>
                <p>${article.content.substring(0, 80)}...</p>
                <small>${article.date} • ${article.author || 'Auxstar'}</small>
            </div>
        </div>
    `).join('');
}

function getCategoryLabel(category) {
    const labels = {
        'news': '📰 News',
        'update': '🔔 Update',
        'evidence': '📋 Evidence',
        'railroads': '🚂 Railroads'
    };
    return labels[category] || category;
}
