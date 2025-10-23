// Evidence Page Script

let captchaWidgetId = null;
let captchaEnabled = false;
let captchaScriptPromise = null;

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('evidenceForm');
    if (form) {
        form.addEventListener('submit', handleEvidenceSubmit);
    }

    initializeEvidenceCaptcha().catch((error) => {
        console.error('Captcha setup failed:', error);
    });

    loadEvidence().catch((error) => {
        console.error('Failed to load evidence:', error);
        const container = document.getElementById('evidenceList');
        if (container) {
            container.innerHTML = '<div class="empty-state"><p>📋 No evidence submitted yet</p></div>';
        }
    });
});

async function handleEvidenceSubmit(event) {
    event.preventDefault();

    const form = event.target;
    const title = document.getElementById('evidenceTitle').value.trim();
    const description = document.getElementById('evidenceDescription').value.trim();
    const nameValue = document.getElementById('name').value.trim();
    const emailValue = document.getElementById('email').value.trim();
    const preview = document.getElementById('filePreview');
    const submitButton = form.querySelector('button[type="submit"]');

    if (!title || !description) {
        showNotification('Title and description are required.');
        return;
    }

    if (!captchaEnabled) {
        showNotification('Evidence submissions are temporarily disabled. Please try again later.');
        return;
    }

    submitButton.disabled = true;

    try {
        let captchaToken = null;
        if (captchaEnabled) {
            captchaToken = await getCaptchaToken();
        }

        await submitEvidence({
            title,
            description,
            name: nameValue || null,
            email: emailValue || null,
            captchaToken: captchaToken || undefined
        });

        form.reset();
        if (preview) {
            preview.innerHTML = '';
        }

        if (captchaEnabled && typeof window.grecaptcha !== 'undefined' && captchaWidgetId !== null) {
            window.grecaptcha.reset(captchaWidgetId);
        }

        showNotification('Evidence submitted successfully!');
        await loadEvidence();
    } catch (error) {
        console.error('Evidence submission failed:', error);
        showNotification(error.message || 'Failed to submit evidence.');
    } finally {
        submitButton.disabled = false;
    }
}

async function loadEvidence() {
    const container = document.getElementById('evidenceList');
    if (!container) {
        return;
    }

    container.innerHTML = '<div class="empty-state"><p>Loading evidence...</p></div>';

    try {
        const { evidence } = await fetchEvidence();

        if (!evidence || evidence.length === 0) {
            container.innerHTML = '<div class="empty-state"><p>📋 No evidence submitted yet</p></div>';
            return;
        }

        container.innerHTML = evidence.map((item) => {
            const title = escapeHtml(item.title || 'Untitled');
            const description = escapeHtml(truncateText(item.description || '', 150));
            const nameLabel = escapeHtml(item.name || 'Anonymous');
            const dateDisplay = escapeHtml(formatDate(item.updatedAt || item.createdAt) || '');
            const statusClass = `status-${(item.status || 'submitted').replace(/[^a-z0-9_-]/gi, '')}`;

            return `
                <div class="evidence-card">
                    <h3>${title}</h3>
                    <p>${description}</p>
                    <div class="evidence-meta">
                        <span><strong>Submitted by:</strong> ${nameLabel}</span>
                        <span><strong>Date:</strong> ${dateDisplay}</span>
                        <span class="${statusClass}">${escapeHtml(item.status || 'submitted')}</span>
                    </div>
                </div>
            `;
        }).join('');
    } catch (error) {
        console.error('Failed to fetch evidence:', error);
        container.innerHTML = '<div class="empty-state"><p>Unable to load evidence submissions.</p></div>';
    }
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

async function initializeEvidenceCaptcha() {
    const container = document.getElementById('captchaContainer');
    if (!container) {
        return;
    }

    try {
        const config = await fetchPublicConfig();
        const siteKey = config && typeof config.evidenceCaptchaSiteKey === 'string'
            ? config.evidenceCaptchaSiteKey.trim()
            : '';

        if (!siteKey) {
            container.innerHTML = '<p class="captcha-disabled">Captcha is not configured.</p>';
            return;
        }

        await loadRecaptchaScript();

        if (typeof window.grecaptcha === 'undefined') {
            throw new Error('reCAPTCHA script did not load.');
        }

        await new Promise((resolve) => window.grecaptcha.ready(resolve));

        captchaWidgetId = window.grecaptcha.render(container, {
            sitekey: siteKey
        });

        captchaEnabled = true;
    } catch (error) {
        container.innerHTML = '<p class="captcha-disabled">Captcha unavailable. Please try again later.</p>';
        throw error;
    }
}

function loadRecaptchaScript() {
    if (typeof window !== 'undefined' && typeof window.grecaptcha !== 'undefined') {
        return Promise.resolve();
    }

    if (captchaScriptPromise) {
        return captchaScriptPromise;
    }

    captchaScriptPromise = new Promise((resolve, reject) => {
        const existing = document.querySelector('script[src*="https://www.google.com/recaptcha/api.js"]');
        if (existing) {
            existing.addEventListener('load', () => resolve());
            existing.addEventListener('error', () => reject(new Error('Failed to load reCAPTCHA script.')));
            return;
        }

        const script = document.createElement('script');
        script.src = 'https://www.google.com/recaptcha/api.js?render=explicit';
        script.async = true;
        script.defer = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Failed to load reCAPTCHA script.'));
        document.head.appendChild(script);
    });

    return captchaScriptPromise;
}

async function getCaptchaToken() {
    if (!captchaEnabled) {
        return null;
    }

    if (typeof window.grecaptcha === 'undefined' || captchaWidgetId === null) {
        throw new Error('Captcha is not ready yet.');
    }

    const token = window.grecaptcha.getResponse(captchaWidgetId);
    if (!token) {
        throw new Error('Please complete the captcha challenge.');
    }

    return token;
}
