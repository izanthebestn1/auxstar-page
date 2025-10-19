// Dashboard Script

let articlesFilter = 'all';

document.addEventListener('DOMContentLoaded', () => {
    initializeDashboard().catch((error) => {
        console.error('Failed to initialize dashboard:', error);
        showNotification('Could not load admin dashboard.');
    });
});

async function initializeDashboard() {
    if (!isAdmin()) {
        await logoutUser({ redirect: true });
        return;
    }

    updateAdminDisplay();
    setupNavigation();
    setupArticlesFilter();
    disableUserCreation();

    const logoutButton = document.getElementById('adminLogout');
    if (logoutButton) {
        logoutButton.addEventListener('click', async (event) => {
            event.preventDefault();
            await logoutUser({ redirect: true });
        });
    }

    const articleForm = document.getElementById('submitArticleForm');
    if (articleForm) {
        articleForm.addEventListener('submit', handleArticleSubmit);
    }

    await loadDashboardData();
}

function updateAdminDisplay() {
    const user = getCurrentUser();
    const nameEl = document.getElementById('adminName');

    if (user && nameEl) {
        nameEl.textContent = user.username;
    }
}

function setupNavigation() {
    document.querySelectorAll('.nav-link').forEach((link) => {
        link.addEventListener('click', async (event) => {
            event.preventDefault();

            const section = link.dataset.section;
            if (!section) {
                return;
            }

            document.querySelectorAll('.nav-link').forEach((item) => item.classList.remove('active'));
            link.classList.add('active');

            document.querySelectorAll('.admin-section').forEach((panel) => panel.classList.remove('active'));
            const target = document.getElementById(section);
            if (target) {
                target.classList.add('active');
            }

            try {
                if (section === 'articles') {
                    await loadArticlesManagement();
                } else if (section === 'evidence') {
                    await loadEvidenceManagement();
                } else if (section === 'users') {
                    await loadUsersManagement();
                } else if (section === 'dashboard') {
                    await loadDashboardData();
                }
            } catch (error) {
                console.error(`Failed to load ${section} section:`, error);
                showNotification('Unable to load the requested section.');
            }
        });
    });
}

function setupArticlesFilter() {
    const filterButtons = document.querySelectorAll('#articles .filter-btn');
    if (!filterButtons.length) {
        return;
    }

    filterButtons.forEach((button) => {
        button.addEventListener('click', async (event) => {
            event.preventDefault();

            const selected = button.dataset.filter || 'all';
            if (articlesFilter === selected) {
                return;
            }

            articlesFilter = selected;
            filterButtons.forEach((btn) => btn.classList.remove('active'));
            button.classList.add('active');

            try {
                await loadArticlesManagement();
            } catch (error) {
                console.error('Failed to apply article filter:', error);
            }
        });
    });
}

function disableUserCreation() {
    const addUserBtn = document.getElementById('addUserBtn');
    if (addUserBtn) {
        addUserBtn.style.display = 'none';
    }
}

async function loadDashboardData() {
    try {
        const stats = await fetchAdminStats();
        document.getElementById('totalArticles').textContent = stats.totalArticles || 0;
        document.getElementById('pendingArticles').textContent = stats.pendingArticles || 0;
        document.getElementById('totalEvidence').textContent = stats.totalEvidence || 0;
        document.getElementById('totalContributors').textContent = stats.totalContributors || 0;
    } catch (error) {
        console.error('Failed to load dashboard stats:', error);
        showNotification('Failed to load dashboard stats.');
    }
}

async function loadArticlesManagement() {
    const tbody = document.getElementById('articlesTableBody');
    if (!tbody) {
        return;
    }

    tbody.innerHTML = '<tr><td colspan="6" class="empty">Loading articles...</td></tr>';

    try {
    const statusParam = articlesFilter === 'all' ? undefined : articlesFilter;
    const { articles } = await fetchArticles({ scope: 'admin', status: statusParam, limit: 100 });
        renderArticlesTable(articles || []);
    } catch (error) {
        console.error('Failed to load articles:', error);
        tbody.innerHTML = '<tr><td colspan="6" class="empty">Unable to load articles</td></tr>';
        showNotification(error.message || 'Failed to load articles.');
    }
}

function renderArticlesTable(articles) {
    const tbody = document.getElementById('articlesTableBody');
    if (!tbody) {
        return;
    }

    if (!articles.length) {
        tbody.innerHTML = '<tr><td colspan="6" class="empty">No articles found</td></tr>';
        return;
    }

    const rows = articles.map((article) => {
        const statusClass = `status-${(article.status || 'pending').replace(/[^a-z0-9_-]/gi, '')}`;
        const dateDisplay = formatDate(article.updatedAt || article.createdAt) || '';

        return `
            <tr>
                <td>${escapeHtml(article.title || '')}</td>
                <td>${escapeHtml(article.author || 'System')}</td>
                <td>${escapeHtml(article.category || '')}</td>
                <td><span class="${statusClass}">${escapeHtml(article.status || 'pending')}</span></td>
                <td>${escapeHtml(dateDisplay)}</td>
                <td class="actions">
                    <button class="btn-small btn-success" data-article-action="approve" data-article-id="${escapeHtml(article.id)}">Approve</button>
                    <button class="btn-small btn-danger" data-article-action="reject" data-article-id="${escapeHtml(article.id)}">Reject</button>
                </td>
            </tr>
        `;
    }).join('');

    tbody.innerHTML = rows;
    bindArticleActions(tbody);
}

function bindArticleActions(tbody) {
    if (tbody.dataset.bound === 'true') {
        return;
    }

    tbody.addEventListener('click', async (event) => {
        const button = event.target.closest('button[data-article-action]');
        if (!button) {
            return;
        }

        const articleId = button.getAttribute('data-article-id');
        const action = button.getAttribute('data-article-action');
        if (!articleId || !action) {
            return;
        }

        try {
            await handleArticleAction(articleId, action);
            await Promise.all([loadArticlesManagement(), loadDashboardData()]);
        } catch (error) {
            console.error('Article action failed:', error);
            showNotification(error.message || 'Unable to update article.');
        }
    });

    tbody.dataset.bound = 'true';
}

async function handleArticleAction(articleId, action) {
    if (action === 'approve') {
        await updateArticle(articleId, { status: 'approved' });
        showNotification('Article approved.');
    } else if (action === 'reject') {
        await updateArticle(articleId, { status: 'rejected' });
        showNotification('Article rejected.');
    }
}

async function handleArticleSubmit(event) {
    event.preventDefault();

    const form = event.target;
    const title = document.getElementById('articleTitle').value.trim();
    const category = document.getElementById('articleCategory').value;
    const content = document.getElementById('articleContent').value.trim();
    const imageInput = document.getElementById('articleImage');
    const preview = document.getElementById('articleImagePreview');
    const submitButton = form.querySelector('button[type="submit"]');

    if (!title || !category || !content) {
        showNotification('Please complete all required fields.');
        return;
    }

    submitButton.disabled = true;

    try {
        let imageData = null;

        if (imageInput && imageInput.files && imageInput.files[0]) {
            imageData = await readFileAsDataUrl(imageInput.files[0]);
        }

        await createArticle({
            title,
            category,
            content,
            image: imageData,
            status: 'approved'
        });

        form.reset();
        if (preview) {
            preview.innerHTML = '';
        }

        showNotification('Article published successfully.');
        await Promise.all([loadArticlesManagement(), loadDashboardData()]);
    } catch (error) {
        console.error('Failed to submit article:', error);
        showNotification(error.message || 'Failed to publish article.');
    } finally {
        submitButton.disabled = false;
    }
}

function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('Failed to read the selected file.'));

        reader.readAsDataURL(file);
    });
}

async function loadEvidenceManagement() {
    const container = document.getElementById('evidenceList');
    if (!container) {
        return;
    }

    container.innerHTML = '<div class="empty-state"><p>Loading evidence...</p></div>';

    try {
        const { evidence } = await fetchEvidence({ scope: 'admin' });
        renderEvidenceList(evidence || []);
    } catch (error) {
        console.error('Failed to load evidence:', error);
        container.innerHTML = '<div class="empty-state"><p>Unable to load evidence submissions</p></div>';
        showNotification(error.message || 'Failed to load evidence.');
    }
}

function renderEvidenceList(items) {
    const container = document.getElementById('evidenceList');
    if (!container) {
        return;
    }

    const activeItems = items.filter((item) => item.status !== 'deleted');
    if (!activeItems.length) {
        container.innerHTML = '<div class="empty-state"><p>📋 No evidence submitted</p></div>';
        return;
    }

    container.innerHTML = activeItems.map((item) => {
        const submittedBy = item.name ? escapeHtml(item.name) : 'Anonymous';
        const emailLabel = item.email ? ` (${escapeHtml(item.email)})` : '';
        const description = truncateText(item.description || '', 160);
        const dateDisplay = formatDate(item.updatedAt || item.createdAt) || '';
        const statusClass = `status-${(item.status || 'submitted').replace(/[^a-z0-9_-]/gi, '')}`;

        return `
            <div class="evidence-card admin-evidence" data-evidence-id="${escapeHtml(item.id)}">
                <h3>${escapeHtml(item.title || '')}</h3>
                <p>${escapeHtml(description)}</p>
                <div class="evidence-meta">
                    <span><strong>From:</strong> ${submittedBy}${emailLabel}</span>
                    <span><strong>Date:</strong> ${escapeHtml(dateDisplay)}</span>
                    <span class="${statusClass}">${escapeHtml(item.status || 'submitted')}</span>
                </div>
                <div class="evidence-actions">
                    <button class="btn-small btn-success" data-evidence-action="status" data-status="reviewed" data-evidence-id="${escapeHtml(item.id)}">Mark Reviewed</button>
                    <button class="btn-small btn-danger" data-evidence-action="delete" data-evidence-id="${escapeHtml(item.id)}">Delete</button>
                </div>
            </div>
        `;
    }).join('');

    bindEvidenceActions(container);
}

function bindEvidenceActions(container) {
    if (container.dataset.bound === 'true') {
        return;
    }

    container.addEventListener('click', async (event) => {
        const button = event.target.closest('button[data-evidence-action]');
        if (!button) {
            return;
        }

        const evidenceId = button.getAttribute('data-evidence-id');
        const action = button.getAttribute('data-evidence-action');

        if (!evidenceId || !action) {
            return;
        }

        try {
            if (action === 'delete') {
                const confirmed = window.confirm('Delete this evidence?');
                if (!confirmed) {
                    return;
                }
                await handleEvidenceAction(evidenceId, action);
                showNotification('Evidence deleted.');
            } else if (action === 'status') {
                const status = button.getAttribute('data-status') || 'reviewed';
                await handleEvidenceAction(evidenceId, action, status);
                showNotification('Evidence status updated.');
            }

            await Promise.all([loadEvidenceManagement(), loadDashboardData()]);
        } catch (error) {
            console.error('Evidence action failed:', error);
            showNotification(error.message || 'Unable to update evidence.');
        }
    });

    container.dataset.bound = 'true';
}

async function handleEvidenceAction(evidenceId, action, status) {
    if (action === 'delete') {
        await deleteEvidenceItem(evidenceId);
    } else if (action === 'status') {
        await updateEvidence(evidenceId, { status });
    }
}

async function loadUsersManagement() {
    const tbody = document.getElementById('usersTableBody');
    if (!tbody) {
        return;
    }

    tbody.innerHTML = '<tr><td colspan="5" class="empty">Loading users...</td></tr>';

    try {
        const { users } = await fetchAdminUsers();
        renderUsersTable(users || []);
    } catch (error) {
        console.error('Failed to load users:', error);
        tbody.innerHTML = '<tr><td colspan="5" class="empty">Unable to load users</td></tr>';
        showNotification(error.message || 'Failed to load users.');
    }
}

function renderUsersTable(users) {
    const tbody = document.getElementById('usersTableBody');
    if (!tbody) {
        return;
    }

    if (!users.length) {
        tbody.innerHTML = '<tr><td colspan="5" class="empty">No users found</td></tr>';
        return;
    }

    const rows = users.map((user) => {
        const roleValue = user.role || 'editor';
        const roleLabel = escapeHtml(roleValue);
        const joined = formatDate(user.joinedAt) || '';
        const statusLabel = roleValue.toLowerCase() === 'admin' ? 'Admin' : 'Active';

        return `
            <tr>
                <td>${escapeHtml(user.username || '')}</td>
                <td>${roleLabel}</td>
                <td><span class="status-active">${escapeHtml(statusLabel)}</span></td>
                <td>${escapeHtml(joined)}</td>
                <td class="actions">Managed by platform administrators</td>
            </tr>
        `;
    }).join('');

    tbody.innerHTML = rows;
}

function showNotification(message) {
    const notification = document.createElement('div');
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #6F5B3C;
        color: #F2E4D0;
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
