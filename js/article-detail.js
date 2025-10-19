// Article Detail Page Script

document.addEventListener('DOMContentLoaded', () => {
    loadArticleDetail().catch((error) => {
        console.error('Failed to load article detail:', error);
        renderError('Unable to load this article right now.');
    });
});

function getArticleIdFromQuery() {
    const params = new URLSearchParams(window.location.search);
    return params.get('id');
}

async function loadArticleDetail() {
    const articleId = getArticleIdFromQuery();

    if (!articleId) {
        renderError('Article not found.');
        return;
    }

    const { article } = await fetchArticleById(articleId);
    if (!article) {
        renderError('Article not found.');
        return;
    }

    renderArticle(article);
}

function renderArticle(article) {
    const titleEl = document.getElementById('articleTitle');
    const metaEl = document.getElementById('articleMeta');
    const bodyEl = document.getElementById('articleContent');

    if (titleEl) {
        titleEl.textContent = article.title || 'Untitled Article';
    }

    if (metaEl) {
        const author = article.author ? escapeHtml(article.author) : 'Auxstar';
        const dateDisplay = formatDate(article.updatedAt || article.createdAt) || '';
        metaEl.textContent = dateDisplay ? `${dateDisplay} • ${author}` : author;
    }

    if (!bodyEl) {
        return;
    }

    const markdown = article.content || '';
    let parsedHtml = '';

    try {
        const html = marked.parse(markdown, { mangle: false, headerIds: false });
        parsedHtml = DOMPurify.sanitize(html);
    } catch (error) {
        console.error('Markdown parsing failed:', error);
        parsedHtml = `<p>${escapeHtml(markdown)}</p>`;
    }

    bodyEl.innerHTML = `
        <article>
            ${parsedHtml}
        </article>
    `;
}

function renderError(message) {
    const titleEl = document.getElementById('articleTitle');
    const metaEl = document.getElementById('articleMeta');
    const bodyEl = document.getElementById('articleContent');

    if (titleEl) {
        titleEl.textContent = 'Article unavailable';
    }

    if (metaEl) {
        metaEl.textContent = '';
    }

    if (bodyEl) {
        bodyEl.innerHTML = `<div class="empty-state"><p>${escapeHtml(message)}</p></div>`;
    }
}
