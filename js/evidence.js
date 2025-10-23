// Evidence Page Script

let currentChallengeId = null;
let challengeReady = false;

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('evidenceForm');
    if (form) {
        form.addEventListener('submit', handleEvidenceSubmit);
    }

    loadEvidenceChallenge().catch((error) => {
        console.error('Verification setup failed:', error);
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
    const answerInput = document.getElementById('challengeAnswer');
    const submitButton = form.querySelector('button[type="submit"]');

    if (!title || !description) {
        showNotification('Title and description are required.');
        return;
    }

    if (!challengeReady || !currentChallengeId) {
        showNotification('Verification is unavailable right now. Please refresh the question and try again.');
        await loadEvidenceChallenge();
        return;
    }

    const challengeAnswer = answerInput ? answerInput.value.trim() : '';
    if (!challengeAnswer) {
        showNotification('Please answer the verification question.');
        return;
    }

    submitButton.disabled = true;

    try {
        await submitEvidence({
            title,
            description,
            name: nameValue || null,
            email: emailValue || null,
            challengeId: currentChallengeId,
            challengeAnswer
        });

        form.reset();
        if (preview) {
            preview.innerHTML = '';
        }

        if (answerInput) {
            answerInput.value = '';
        }

        await loadEvidenceChallenge();

        showNotification('Evidence submitted successfully!');
        await loadEvidence();
    } catch (error) {
        console.error('Evidence submission failed:', error);
        showNotification(error.message || 'Failed to submit evidence.');
        await loadEvidenceChallenge();
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

async function loadEvidenceChallenge() {
    const container = document.getElementById('challengeContainer');
    const questionEl = document.getElementById('challengeQuestion');
    const input = document.getElementById('challengeAnswer');

    if (!container || !questionEl || !input) {
        return;
    }

    challengeReady = false;
    currentChallengeId = null;
    questionEl.textContent = 'Preparing verification question...';
    input.value = '';
    input.disabled = true;

    try {
        const response = await fetchEvidenceChallenge();
        const challenge = response && response.evidenceChallenge;

        if (!challenge || !challenge.id || !challenge.question) {
            throw new Error('Invalid challenge payload.');
        }

        currentChallengeId = challenge.id;
        questionEl.textContent = challenge.question;
        input.disabled = false;
        challengeReady = true;
        input.focus();
    } catch (error) {
        console.error('Failed to load evidence challenge:', error);
        questionEl.textContent = 'Unable to generate a verification question. Please try again later.';
        challengeReady = false;
    }
}
