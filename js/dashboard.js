// Dashboard Script

document.addEventListener('DOMContentLoaded', () => {
    // Check if user is admin
    if (!isAdmin()) {
        window.location.href = 'login.html';
        return;
    }
    
    updateAdminDisplay();
    setupNavigation();
    loadDashboardData();
    
    // Setup form submissions
    document.getElementById('submitArticleForm').addEventListener('submit', handleArticleSubmit);
    document.getElementById('adminLogout').addEventListener('click', () => {
        clearCurrentUser();
        window.location.href = 'login.html';
    });
});

function updateAdminDisplay() {
    const user = getCurrentUser();
    document.getElementById('adminName').textContent = user.username;
}

function setupNavigation() {
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const section = link.dataset.section;
            
            // Update active link
            document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
            link.classList.add('active');
            
            // Update active section
            document.querySelectorAll('.admin-section').forEach(s => s.classList.remove('active'));
            document.getElementById(section).classList.add('active');
            
            // Load section-specific content
            if (section === 'articles') {
                loadArticlesManagement();
            } else if (section === 'evidence') {
                loadEvidenceManagement();
            } else if (section === 'users') {
                loadUsersManagement();
            }
        });
    });
}

function loadDashboardData() {
    const articles = JSON.parse(localStorage.getItem('auxstarArticles')) || [];
    const evidence = JSON.parse(localStorage.getItem('auxstarEvidence')) || [];
    const users = JSON.parse(localStorage.getItem('auxstarUsers')) || [];
    
    document.getElementById('totalArticles').textContent = articles.length;
    document.getElementById('pendingArticles').textContent = articles.filter(a => a.status === 'pending').length;
    document.getElementById('totalEvidence').textContent = evidence.length;
    document.getElementById('totalContributors').textContent = users.filter(u => u.role === 'editor').length;
}

function loadArticlesManagement() {
    const articles = JSON.parse(localStorage.getItem('auxstarArticles')) || [];
    const tbody = document.getElementById('articlesTableBody');
    
    if (articles.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="empty">No articles</td></tr>';
        return;
    }
    
    tbody.innerHTML = articles.map(article => `
        <tr>
            <td>${article.title}</td>
            <td>${article.author || 'System'}</td>
            <td>${article.category}</td>
            <td><span class="status-${article.status}">${article.status}</span></td>
            <td>${article.date}</td>
            <td class="actions">
                <button onclick="approveArticle(${article.id})" class="btn-small btn-success">Approve</button>
                <button onclick="rejectArticle(${article.id})" class="btn-small btn-danger">Reject</button>
            </td>
        </tr>
    `).join('');
}

function loadEvidenceManagement() {
    const evidence = JSON.parse(localStorage.getItem('auxstarEvidence')) || [];
    const container = document.getElementById('evidenceList');
    
    if (evidence.length === 0) {
        container.innerHTML = '<div class="empty-state"><p>📋 No evidence submitted</p></div>';
        return;
    }
    
    container.innerHTML = evidence.map(item => `
        <div class="evidence-card admin-evidence">
            <h3>${item.title}</h3>
            <p>${item.description}</p>
            <div class="evidence-meta">
                <span><strong>From:</strong> ${item.name} (${item.email})</span>
                <span><strong>Date:</strong> ${item.date}</span>
            </div>
            <div class="evidence-actions">
                <button onclick="reviewEvidence(${item.id}, 'reviewed')" class="btn-small btn-success">Mark Reviewed</button>
                <button onclick="deleteEvidence(${item.id})" class="btn-small btn-danger">Delete</button>
            </div>
        </div>
    `).join('');
}

function loadUsersManagement() {
    const users = JSON.parse(localStorage.getItem('auxstarUsers')) || [];
    const tbody = document.getElementById('usersTableBody');
    
    if (users.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="empty">No users</td></tr>';
        return;
    }
    
    tbody.innerHTML = users.map(user => `
        <tr>
            <td>${user.username}</td>
            <td>${user.role}</td>
            <td><span class="status-active">Active</span></td>
            <td>${user.joined}</td>
            <td class="actions">
                <button onclick="deleteUser('${user.username}')" class="btn-small btn-danger">Delete</button>
            </td>
        </tr>
    `).join('');
}

function handleArticleSubmit(e) {
    e.preventDefault();
    
    const title = document.getElementById('articleTitle').value;
    const category = document.getElementById('articleCategory').value;
    const content = document.getElementById('articleContent').value;
    const imageInput = document.getElementById('articleImage');
    const user = getCurrentUser();
    
    const article = {
        id: Date.now(),
        title,
        category,
        content,
        image: null,
        author: user.username,
        date: new Date().toLocaleDateString('en-US'),
        status: 'approved' // Admin articles are auto-approved
    };
    
    if (imageInput.files.length > 0) {
        const reader = new FileReader();
        reader.onload = (event) => {
            article.image = event.target.result;
            saveArticle(article);
        };
        reader.readAsDataURL(imageInput.files[0]);
    } else {
        saveArticle(article);
    }
}

function saveArticle(article) {
    const articles = JSON.parse(localStorage.getItem('auxstarArticles')) || [];
    articles.unshift(article);
    localStorage.setItem('auxstarArticles', JSON.stringify(articles));
    
    document.getElementById('submitArticleForm').reset();
    document.getElementById('articleImagePreview').innerHTML = '';
    
    showNotification('Article published successfully!');
    loadDashboardData();
}

function approveArticle(id) {
    const articles = JSON.parse(localStorage.getItem('auxstarArticles')) || [];
    const article = articles.find(a => a.id === id);
    if (article) {
        article.status = 'approved';
        localStorage.setItem('auxstarArticles', JSON.stringify(articles));
        loadArticlesManagement();
        loadDashboardData();
        showNotification('Article approved!');
    }
}

function rejectArticle(id) {
    const articles = JSON.parse(localStorage.getItem('auxstarArticles')) || [];
    const article = articles.find(a => a.id === id);
    if (article) {
        article.status = 'rejected';
        localStorage.setItem('auxstarArticles', JSON.stringify(articles));
        loadArticlesManagement();
        loadDashboardData();
        showNotification('Article rejected');
    }
}

function deleteEvidence(id) {
    if (confirm('Delete this evidence?')) {
        const evidence = JSON.parse(localStorage.getItem('auxstarEvidence')) || [];
        const filtered = evidence.filter(e => e.id !== id);
        localStorage.setItem('auxstarEvidence', JSON.stringify(filtered));
        loadEvidenceManagement();
        showNotification('Evidence deleted');
    }
}

function reviewEvidence(id, status) {
    const evidence = JSON.parse(localStorage.getItem('auxstarEvidence')) || [];
    const item = evidence.find(e => e.id === id);
    if (item) {
        item.status = status;
        localStorage.setItem('auxstarEvidence', JSON.stringify(evidence));
        loadEvidenceManagement();
        showNotification('Evidence status updated');
    }
}

function deleteUser(username) {
    if (confirm(`Delete user ${username}?`)) {
        const users = JSON.parse(localStorage.getItem('auxstarUsers')) || [];
        const filtered = users.filter(u => u.username !== username);
        localStorage.setItem('auxstarUsers', JSON.stringify(filtered));
        loadUsersManagement();
        showNotification('User deleted');
    }
}

function showNotification(message) {
    const notification = document.createElement('div');
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #7B6B43;
        color: #F7E4BC;
        padding: 15px 25px;
        border-radius: 6px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        z-index: 2000;
        animation: slideIn 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}
