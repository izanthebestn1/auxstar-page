// Dashboard Script

let articlesFilter = 'all';

const MAX_MEDIA_FILE_SIZE = 6 * 1024 * 1024; // 6MB
const articleFormState = {
    mode: 'create',
    editingId: null,
    currentArticle: null,
    existingMedia: [],
    removedMediaIds: new Set(),
    newMedia: [],
    imageData: null,
    thumbnailData: null,
    imageChanged: false,
    thumbnailChanged: false
};

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
    setupArticleFormControls();
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

    tbody.innerHTML = '<tr><td colspan="7" class="empty">Loading articles...</td></tr>';

    try {
        const statusParam = articlesFilter === 'all' ? undefined : articlesFilter;
        const { articles } = await fetchArticles({ scope: 'admin', status: statusParam, limit: 100 });
        renderArticlesTable(articles || []);
    } catch (error) {
        console.error('Failed to load articles:', error);
        tbody.innerHTML = '<tr><td colspan="7" class="empty">Unable to load articles</td></tr>';
        showNotification(error.message || 'Failed to load articles.');
    }
}

function renderArticlesTable(articles) {
    const tbody = document.getElementById('articlesTableBody');
    if (!tbody) {
        return;
    }

    if (!articles.length) {
        tbody.innerHTML = '<tr><td colspan="7" class="empty">No articles found</td></tr>';
        return;
    }

    const rows = articles.map((article) => {
        const statusClass = `status-${(article.status || 'pending').replace(/[^a-z0-9_-]/gi, '')}`;
        const dateDisplay = formatDate(article.updatedAt || article.createdAt) || '';
        const tags = Array.isArray(article.tags) && article.tags.length
            ? article.tags.map((tag) => `<span class="tag-pill">${escapeHtml(tag)}</span>`).join(' ')
            : '<span class="muted">—</span>';

        const currentStatus = (article.status || '').toLowerCase();
        const actions = [];

        actions.push(`<button class="btn-small" data-article-action="edit" data-article-id="${escapeHtml(article.id)}">Edit</button>`);

        if (currentStatus !== 'approved' && currentStatus !== 'published') {
            actions.push(`<button class="btn-small btn-success" data-article-action="approve" data-article-id="${escapeHtml(article.id)}">Approve</button>`);
        }

        if (currentStatus !== 'published') {
            actions.push(`<button class="btn-small btn-success" data-article-action="publish" data-article-id="${escapeHtml(article.id)}">Publish</button>`);
        }

        if (currentStatus !== 'draft') {
            actions.push(`<button class="btn-small" data-article-action="draft" data-article-id="${escapeHtml(article.id)}">Mark Draft</button>`);
        }

    actions.push(`<button class="btn-small btn-danger" data-article-action="reject" data-article-id="${escapeHtml(article.id)}">Reject</button>`);

        return `
            <tr>
                <td>${escapeHtml(article.title || '')}</td>
                <td>${escapeHtml(article.author || 'System')}</td>
                <td>${escapeHtml(article.category || '')}</td>
                <td><span class="${statusClass}">${escapeHtml(article.status || 'pending')}</span></td>
                <td class="article-tags-cell">${tags}</td>
                <td>${escapeHtml(dateDisplay)}</td>
                <td class="actions">${actions.join(' ')}</td>
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
            const shouldRefresh = await handleArticleAction(articleId, action);
            if (shouldRefresh) {
                await Promise.all([loadArticlesManagement(), loadDashboardData()]);
            }
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
        return true;
    } else if (action === 'publish') {
        await updateArticle(articleId, { status: 'published' });
        showNotification('Article published.');
        return true;
    } else if (action === 'draft') {
        await updateArticle(articleId, { status: 'draft' });
        showNotification('Article marked as draft.');
        return true;
    } else if (action === 'reject') {
        await updateArticle(articleId, { status: 'rejected' });
        showNotification('Article rejected.');
        return true;
    } else if (action === 'edit') {
        await enterArticleEditMode(articleId);
        return false;
    }

    return false;
}

async function handleArticleSubmit(event) {
    event.preventDefault();

    const form = event.target;
    const title = document.getElementById('articleTitle').value.trim();
    const category = document.getElementById('articleCategory').value;
    const content = document.getElementById('articleContent').value.trim();
    const summaryInput = document.getElementById('articleSummary');
    const summary = summaryInput && typeof summaryInput.value === 'string' ? summaryInput.value.trim() : '';
    const tagsInputEl = document.getElementById('articleTags');
    const tagsInput = tagsInputEl && typeof tagsInputEl.value === 'string' ? tagsInputEl.value : '';
    const statusInput = document.getElementById('articleStatus');
    const publishedAtInput = document.getElementById('articlePublishedAt');
    const slugInput = document.getElementById('articleSlug');
    const submitButton = form.querySelector('button[type="submit"]');

    if (!title || !category || !content) {
        showNotification('Please complete all required fields.');
        return;
    }

    submitButton.disabled = true;

    try {
        const tagList = tagsInput
            .split(',')
            .map((tag) => tag.trim())
            .filter((tag) => tag.length > 0);

        const statusValue = statusInput && statusInput.value ? statusInput.value : 'pending';
        const publishDateValue = publishedAtInput && publishedAtInput.value ? publishedAtInput.value : null;

        if (statusValue === 'scheduled' && !publishDateValue) {
            showNotification('Please set a publish date for scheduled articles.');
            submitButton.disabled = false;
            return;
        }

        const payload = {
            title,
            category,
            content,
            summary: summary || null,
            tags: tagList,
            status: statusValue,
            publishedAt: publishDateValue
        };

        if (articleFormState.mode === 'create' || articleFormState.imageChanged) {
            payload.image = articleFormState.imageData;
        }

        if (articleFormState.mode === 'create' || articleFormState.thumbnailChanged) {
            payload.thumbnail = articleFormState.thumbnailData;
        }

        const retainedExisting = articleFormState.existingMedia
            .filter((item) => item && !articleFormState.removedMediaIds.has(item.id))
            .map((item, index) => ({
                type: item.type || item.media_type || 'image',
                data: item.data,
                caption: item.caption || null,
                sortOrder: index
            }));

        const newMedia = articleFormState.newMedia.map((item, index) => ({
            type: item.type || 'image',
            data: item.data,
            caption: item.caption || null,
            sortOrder: retainedExisting.length + index
        }));

        if (articleFormState.mode === 'edit') {
            payload.media = [...retainedExisting, ...newMedia];
        } else if (newMedia.length) {
            payload.media = newMedia;
        }

        if (slugInput) {
            const slugValue = slugInput.value.trim();
            if (slugValue || (articleFormState.mode === 'edit' && slugInput.dataset.original && slugValue === '')) {
                payload.slug = slugValue;
            }
        }

        let statusMessage = 'Article submitted.';

        if (articleFormState.mode === 'edit') {
            await updateArticle(articleFormState.editingId, payload);
            statusMessage = 'Article updated.';
            exitArticleEditMode({ silent: true });
        } else {
            await createArticle(payload);
            statusMessage = statusValue === 'draft'
                ? 'Article saved as draft.'
                : statusValue === 'scheduled'
                    ? 'Article scheduled for publication.'
                    : statusValue === 'published'
                        ? 'Article published.'
                        : 'Article submitted.';
            resetArticleForm();
        }

        showNotification(statusMessage);
        await Promise.all([loadArticlesManagement(), loadDashboardData()]);
    } catch (error) {
        console.error('Failed to submit article:', error);
        showNotification(error.message || 'Failed to save article.');
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

function setupArticleFormControls() {
    const imagePreview = getPreviewContainer('image');
    const thumbnailPreview = getPreviewContainer('thumbnail');
    const existingGallery = document.getElementById('articleExistingGallery');
    const newGallery = document.getElementById('articleGalleryPreview');

    setPreviewEmpty(imagePreview, 'No feature image selected.');
    setPreviewEmpty(thumbnailPreview, 'No thumbnail selected.');
    setPreviewEmpty(existingGallery, 'No existing gallery images.');
    setPreviewEmpty(newGallery, 'No new gallery files.');

    const imageInput = document.getElementById('articleImage');
    if (imageInput) {
        imageInput.addEventListener('change', () => handleSingleImageSelection('image'));
    }

    const thumbnailInput = document.getElementById('articleThumbnail');
    if (thumbnailInput) {
        thumbnailInput.addEventListener('change', () => handleSingleImageSelection('thumbnail'));
    }

    const galleryInput = document.getElementById('articleGallery');
    if (galleryInput) {
        galleryInput.addEventListener('change', async () => {
            await handleGallerySelection(galleryInput);
        });
    }

    const imageClear = document.getElementById('articleImageClear');
    if (imageClear) {
        imageClear.addEventListener('change', () => handleImageClear('image'));
    }

    const thumbnailClear = document.getElementById('articleThumbnailClear');
    if (thumbnailClear) {
        thumbnailClear.addEventListener('change', () => handleImageClear('thumbnail'));
    }

    const cancelEditBtn = document.getElementById('cancelArticleEdit');
    if (cancelEditBtn) {
        cancelEditBtn.addEventListener('click', () => exitArticleEditMode());
    }

    const clearFormBtn = document.getElementById('resetArticleForm');
    if (clearFormBtn) {
        clearFormBtn.addEventListener('click', () => {
            if (articleFormState.mode === 'edit') {
                exitArticleEditMode();
            } else {
                resetArticleForm();
                showNotification('Form cleared.');
            }
        });
    }

    const clearExistingGalleryBtn = document.getElementById('clearExistingGallery');
    if (clearExistingGalleryBtn) {
        clearExistingGalleryBtn.addEventListener('click', () => {
            articleFormState.existingMedia.forEach((item) => {
                if (item && item.id) {
                    articleFormState.removedMediaIds.add(item.id);
                }
            });
            refreshGalleryPreview();
        });
    }

    updateFormModeUI();
    refreshGalleryPreview();
}

async function enterArticleEditMode(articleId) {
    try {
        const { article } = await fetchArticleById(articleId);
        if (!article) {
            showNotification('Article not found.');
            return;
        }

        articleFormState.mode = 'edit';
        articleFormState.editingId = article.id;
        articleFormState.currentArticle = article;
        articleFormState.existingMedia = Array.isArray(article.media)
            ? article.media.map((item) => ({ ...item }))
            : [];
        articleFormState.removedMediaIds = new Set();
        articleFormState.newMedia = [];
        articleFormState.imageData = null;
        articleFormState.thumbnailData = null;
        articleFormState.imageChanged = false;
        articleFormState.thumbnailChanged = false;

        applyArticleToForm(article);
        updateFormModeUI(article);
        refreshGalleryPreview();
        restoreExistingSinglePreview('image');
        restoreExistingSinglePreview('thumbnail');

        showNotification('Article loaded for editing.');
    } catch (error) {
        console.error('Failed to load article for editing:', error);
        showNotification('Unable to load article for editing.');
    }
}

function exitArticleEditMode(options = {}) {
    resetArticleForm();
    if (!options.silent) {
        showNotification('Edit cancelled. Form reset.');
    }
}

function resetArticleForm() {
    resetArticleStateForCreate();

    const form = document.getElementById('submitArticleForm');
    if (form) {
        form.reset();
    }

    const slugInput = document.getElementById('articleSlug');
    if (slugInput) {
        delete slugInput.dataset.original;
    }

    const galleryInput = document.getElementById('articleGallery');
    if (galleryInput) {
        galleryInput.value = '';
    }

    updateFormModeUI();
    setPreviewEmpty(getPreviewContainer('image'), 'No feature image selected.');
    setPreviewEmpty(getPreviewContainer('thumbnail'), 'No thumbnail selected.');
    setPreviewEmpty(document.getElementById('articleExistingGallery'), 'No existing gallery images.');
    setPreviewEmpty(document.getElementById('articleGalleryPreview'), 'No new gallery files.');
}

function resetArticleStateForCreate() {
    articleFormState.mode = 'create';
    articleFormState.editingId = null;
    articleFormState.currentArticle = null;
    articleFormState.existingMedia = [];
    articleFormState.removedMediaIds = new Set();
    articleFormState.newMedia = [];
    articleFormState.imageData = null;
    articleFormState.thumbnailData = null;
    articleFormState.imageChanged = true;
    articleFormState.thumbnailChanged = true;
}

function applyArticleToForm(article) {
    const idInput = document.getElementById('articleId');
    if (idInput) {
        idInput.value = article.id;
    }

    const titleEl = document.getElementById('articleTitle');
    if (titleEl) {
        titleEl.value = article.title || '';
    }

    const categoryEl = document.getElementById('articleCategory');
    if (categoryEl) {
        categoryEl.value = article.category || '';
    }

    const contentEl = document.getElementById('articleContent');
    if (contentEl) {
        contentEl.value = article.content || '';
    }

    const summaryEl = document.getElementById('articleSummary');
    if (summaryEl) {
        summaryEl.value = article.summary || '';
    }

    const tagsEl = document.getElementById('articleTags');
    if (tagsEl) {
        tagsEl.value = Array.isArray(article.tags) ? article.tags.join(', ') : '';
    }

    const statusEl = document.getElementById('articleStatus');
    if (statusEl) {
        statusEl.value = article.status || 'pending';
    }

    const publishedEl = document.getElementById('articlePublishedAt');
    if (publishedEl) {
        publishedEl.value = article.publishedAt ? formatDateTimeLocal(article.publishedAt) : '';
    }

    const slugEl = document.getElementById('articleSlug');
    if (slugEl) {
        slugEl.value = article.slug || '';
        slugEl.dataset.original = article.slug || '';
    }

    const imageInput = document.getElementById('articleImage');
    if (imageInput) {
        imageInput.value = '';
    }

    const thumbnailInput = document.getElementById('articleThumbnail');
    if (thumbnailInput) {
        thumbnailInput.value = '';
    }

    const galleryInput = document.getElementById('articleGallery');
    if (galleryInput) {
        galleryInput.value = '';
    }
}

function updateFormModeUI(article = articleFormState.currentArticle) {
    const alert = document.getElementById('articleEditAlert');
    const message = document.getElementById('articleEditMessage');

    if (articleFormState.mode === 'edit') {
        if (alert) {
            alert.style.display = 'flex';
        }
        if (message) {
            const label = article?.title ? `"${article.title}"` : 'selected article';
            message.textContent = `Editing ${label}`;
        }
    } else {
        if (alert) {
            alert.style.display = 'none';
        }
        if (message) {
            message.textContent = '';
        }
    }

    const showImageClear = articleFormState.mode === 'edit' && !!(article?.image);
    const showThumbnailClear = articleFormState.mode === 'edit' && !!(article?.thumbnail);

    toggleInlineControl('articleImageClear', showImageClear);
    toggleInlineControl('articleThumbnailClear', showThumbnailClear);
}

async function handleSingleImageSelection(type) {
    const input = document.getElementById(type === 'image' ? 'articleImage' : 'articleThumbnail');
    const preview = getPreviewContainer(type);
    const clearControl = document.getElementById(type === 'image' ? 'articleImageClear' : 'articleThumbnailClear');

    if (!input || !preview) {
        return;
    }

    if (!input.files || !input.files.length) {
        if (articleFormState.mode === 'create') {
            if (type === 'image') {
                articleFormState.imageData = null;
                articleFormState.imageChanged = true;
            } else {
                articleFormState.thumbnailData = null;
                articleFormState.thumbnailChanged = true;
            }
            setPreviewEmpty(preview, getPreviewPlaceholder(type));
        } else {
            if (type === 'image') {
                articleFormState.imageData = null;
                articleFormState.imageChanged = false;
            } else {
                articleFormState.thumbnailData = null;
                articleFormState.thumbnailChanged = false;
            }
            restoreExistingSinglePreview(type);
        }
        return;
    }

    const file = input.files[0];
    if (!validateFileSize(file)) {
        input.value = '';
        return;
    }

    const data = await readFileAsDataUrl(file);
    if (type === 'image') {
        articleFormState.imageData = data;
        articleFormState.imageChanged = true;
    } else {
        articleFormState.thumbnailData = data;
        articleFormState.thumbnailChanged = true;
    }

    refreshSinglePreview(type, data, {
        allowRemove: true,
        label: file.name
    });

    if (clearControl) {
        clearControl.checked = false;
    }
}

function handleRemoveSinglePreview(type) {
    const input = document.getElementById(type === 'image' ? 'articleImage' : 'articleThumbnail');
    if (input) {
        input.value = '';
    }

    if (type === 'image') {
        articleFormState.imageData = null;
    } else {
        articleFormState.thumbnailData = null;
    }

    if (articleFormState.mode === 'edit') {
        if (type === 'image') {
            articleFormState.imageChanged = false;
        } else {
            articleFormState.thumbnailChanged = false;
        }
        restoreExistingSinglePreview(type);
    } else {
        if (type === 'image') {
            articleFormState.imageChanged = true;
        } else {
            articleFormState.thumbnailChanged = true;
        }
        setPreviewEmpty(getPreviewContainer(type), getPreviewPlaceholder(type));
    }
}

function handleImageClear(type) {
    const control = document.getElementById(type === 'image' ? 'articleImageClear' : 'articleThumbnailClear');
    const preview = getPreviewContainer(type);
    const input = document.getElementById(type === 'image' ? 'articleImage' : 'articleThumbnail');

    if (!control || !preview) {
        return;
    }

    if (control.checked) {
        if (input) {
            input.value = '';
        }
        if (type === 'image') {
            articleFormState.imageData = null;
            articleFormState.imageChanged = true;
        } else {
            articleFormState.thumbnailData = null;
            articleFormState.thumbnailChanged = true;
        }

        const message = type === 'image'
            ? 'Feature image will be removed on save.'
            : 'Thumbnail will be removed on save.';
        setPreviewEmpty(preview, message);
    } else {
        if (articleFormState.mode === 'edit') {
            restoreExistingSinglePreview(type);
            if (type === 'image') {
                articleFormState.imageChanged = false;
            } else {
                articleFormState.thumbnailChanged = false;
            }
        } else {
            setPreviewEmpty(preview, getPreviewPlaceholder(type));
        }
    }
}

async function handleGallerySelection(input) {
    if (!input || !input.files || !input.files.length) {
        return;
    }

    const files = Array.from(input.files);
    for (const file of files) {
        if (!validateFileSize(file)) {
            continue;
        }

        const data = await readFileAsDataUrl(file);
        articleFormState.newMedia.push({
            tempId: generateTempId(),
            type: 'image',
            data,
            caption: null
        });
    }

    input.value = '';
    refreshGalleryPreview();
}

function refreshGalleryPreview() {
    const existingContainer = document.getElementById('articleExistingGallery');
    const newContainer = document.getElementById('articleGalleryPreview');

    const remainingExisting = articleFormState.existingMedia.filter((item) => item && !articleFormState.removedMediaIds.has(item.id));

    if (existingContainer) {
        existingContainer.innerHTML = '';
        if (!remainingExisting.length) {
            setPreviewEmpty(existingContainer, 'No existing gallery images.');
        } else {
            existingContainer.classList.remove('empty');
            remainingExisting.forEach((item) => {
                existingContainer.appendChild(buildGalleryThumb(item, { existing: true }));
            });
        }
    }

    if (newContainer) {
        newContainer.innerHTML = '';
        if (!articleFormState.newMedia.length) {
            setPreviewEmpty(newContainer, 'No new gallery files.');
        } else {
            newContainer.classList.remove('empty');
            articleFormState.newMedia.forEach((item) => {
                newContainer.appendChild(buildGalleryThumb(item, { existing: false }));
            });
        }
    }

    const clearBtn = document.getElementById('clearExistingGallery');
    if (clearBtn) {
        clearBtn.style.display = remainingExisting.length ? 'inline-flex' : 'none';
    }
}

function buildGalleryThumb(item, { existing }) {
    const wrapper = document.createElement('div');
    wrapper.className = 'gallery-thumb';

    const img = document.createElement('img');
    img.src = item.data;
    img.alt = item.caption || 'Gallery media';
    wrapper.appendChild(img);

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'preview-remove';
    removeBtn.textContent = '×';
    removeBtn.setAttribute('aria-label', 'Remove');
    removeBtn.addEventListener('click', () => {
        if (existing) {
            removeExistingGalleryItem(item.id);
        } else {
            removeNewGalleryItem(item.tempId);
        }
    });
    wrapper.appendChild(removeBtn);

    if (item.caption) {
        const meta = document.createElement('div');
        meta.className = 'preview-meta';
        meta.textContent = item.caption;
        wrapper.appendChild(meta);
    }

    return wrapper;
}

function removeExistingGalleryItem(id) {
    if (!id) {
        return;
    }
    articleFormState.removedMediaIds.add(id);
    refreshGalleryPreview();
}

function removeNewGalleryItem(tempId) {
    articleFormState.newMedia = articleFormState.newMedia.filter((item) => item.tempId !== tempId);
    refreshGalleryPreview();
}

function refreshSinglePreview(type, data, options = {}) {
    const container = getPreviewContainer(type);
    if (!container) {
        return;
    }

    if (!data) {
        setPreviewEmpty(container, options.emptyLabel || getPreviewPlaceholder(type));
        return;
    }

    container.innerHTML = '';
    container.classList.remove('empty');

    const thumb = document.createElement('div');
    thumb.className = 'preview-thumb';

    const img = document.createElement('img');
    img.src = data;
    img.alt = options.label || `${type} preview`;
    thumb.appendChild(img);

    if (options.allowRemove) {
        const removeBtn = document.createElement('button');
        removeBtn.type = 'button';
        removeBtn.className = 'preview-remove';
        removeBtn.textContent = '×';
        removeBtn.setAttribute('aria-label', 'Remove');
        removeBtn.addEventListener('click', () => handleRemoveSinglePreview(type));
        thumb.appendChild(removeBtn);
    }

    container.appendChild(thumb);
}

function restoreExistingSinglePreview(type) {
    const article = articleFormState.currentArticle;
    const data = article ? (type === 'image' ? article.image : article.thumbnail) : null;
    if (data) {
        refreshSinglePreview(type, data, { allowRemove: false });
    } else {
        setPreviewEmpty(getPreviewContainer(type), getPreviewPlaceholder(type));
    }
}

function setPreviewEmpty(container, message) {
    if (!container) {
        return;
    }
    container.innerHTML = '';
    container.dataset.empty = message;
    container.classList.add('empty');
}

function getPreviewContainer(type) {
    if (type === 'image') {
        return document.getElementById('articleImagePreview');
    }
    if (type === 'thumbnail') {
        return document.getElementById('articleThumbnailPreview');
    }
    return null;
}

function getPreviewPlaceholder(type) {
    return type === 'image' ? 'No feature image selected.' : 'No thumbnail selected.';
}

function toggleInlineControl(controlId, visible) {
    const control = document.getElementById(controlId);
    if (!control) {
        return;
    }

    const wrapper = control.closest('.inline-control');
    if (wrapper) {
        wrapper.style.display = visible ? 'inline-flex' : 'none';
    }

    control.disabled = !visible;
    if (!visible) {
        control.checked = false;
    }
}

function validateFileSize(file) {
    if (!file) {
        return false;
    }

    if (file.size > MAX_MEDIA_FILE_SIZE) {
        const limitMb = Math.round(MAX_MEDIA_FILE_SIZE / 1024 / 1024);
        showNotification(`"${file.name}" exceeds the ${limitMb}MB limit.`);
        return false;
    }

    return true;
}

function formatDateTimeLocal(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return '';
    }

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function generateTempId() {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') {
        return window.crypto.randomUUID();
    }
    return `temp-${Date.now()}-${Math.random().toString(16).slice(2)}`;
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
