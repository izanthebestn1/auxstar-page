// Railroads Page Script

document.addEventListener('DOMContentLoaded', () => {
    loadRailroads();
});

function loadRailroads() {
    const articles = JSON.parse(localStorage.getItem('auxstarArticles')) || [];
    const railroads = articles.filter(a => a.category === 'railroads' && a.status === 'approved');
    
    const container = document.getElementById('railroadsList');
    
    if (railroads.length === 0) {
        container.innerHTML = '<div class="empty-state" style="grid-column: 1/-1;"><p>🚂 No Railroads content available</p></div>';
        return;
    }
    
    container.innerHTML = railroads.map(article => `
        <div class="railroads-card">
            ${article.image ? `<div class="railroads-image"><img src="${article.image}" alt="${article.title}"></div>` : `<div class="railroads-image"><span>🚂 RAILROADS</span></div>`}
            <div class="railroads-content">
                <h3 class="railroads-title">${article.title}</h3>
                <p class="railroads-excerpt">${article.content.substring(0, 100)}...</p>
                <div class="article-meta">
                    <strong>${article.date}</strong> by ${article.author || 'Auxstar'}
                </div>
            </div>
        </div>
    `).join('');
}
