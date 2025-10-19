// Articles Page Script

let currentFilter = 'all';

document.addEventListener('DOMContentLoaded', () => {
    loadArticles();
    setupFilterButtons();
});

function setupFilterButtons() {
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            currentFilter = e.target.dataset.filter;
            loadArticles();
        });
    });
}

function loadArticles() {
    const articles = JSON.parse(localStorage.getItem('auxstarArticles')) || [];
    let filteredArticles = articles.filter(a => a.status === 'approved' && a.category !== 'railroads');
    
    if (currentFilter !== 'all') {
        filteredArticles = filteredArticles.filter(a => a.category === currentFilter);
    }
    
    const container = document.getElementById('articlesList');
    
    if (filteredArticles.length === 0) {
        container.innerHTML = '<div class="empty-state" style="grid-column: 1/-1;"><p>📝 No articles available</p></div>';
        return;
    }
    
    container.innerHTML = filteredArticles.map(article => `
        <div class="article-card">
            ${article.image ? `<div class="article-image"><img src="${article.image}" alt="${article.title}"></div>` : `<div class="article-image"><span>📰 ${article.category.toUpperCase()}</span></div>`}
            <div class="article-content">
                <span class="article-category">${getCategoryLabel(article.category)}</span>
                <h3 class="article-title">${article.title}</h3>
                <p class="article-excerpt">${article.content.substring(0, 100)}...</p>
                <div class="article-meta">
                    <strong>${article.date}</strong> by ${article.author || 'Auxstar'}
                </div>
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
