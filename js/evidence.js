// Evidence Page Script

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('evidenceForm').addEventListener('submit', handleEvidenceSubmit);
    loadEvidence();
});

function handleEvidenceSubmit(e) {
    e.preventDefault();
    
    const title = document.getElementById('evidenceTitle').value;
    const description = document.getElementById('evidenceDescription').value;
    const name = document.getElementById('name').value || 'Anonymous';
    const email = document.getElementById('email').value || '';
    
    const evidence = {
        id: Date.now(),
        title,
        description,
        name,
        email,
        date: new Date().toLocaleDateString('en-US'),
        status: 'submitted'
    };
    
    // Get existing evidence
    const allEvidence = JSON.parse(localStorage.getItem('auxstarEvidence')) || [];
    allEvidence.unshift(evidence);
    localStorage.setItem('auxstarEvidence', JSON.stringify(allEvidence));
    
    document.getElementById('evidenceForm').reset();
    document.getElementById('filePreview').innerHTML = '';
    
    showNotification('Evidence submitted successfully!');
    loadEvidence();
}

function loadEvidence() {
    const evidence = JSON.parse(localStorage.getItem('auxstarEvidence')) || [];
    const container = document.getElementById('evidenceList');
    
    if (evidence.length === 0) {
        container.innerHTML = '<div class="empty-state"><p>📋 No evidence submitted yet</p></div>';
        return;
    }
    
    container.innerHTML = evidence.map(item => `
        <div class="evidence-card">
            <h3>${item.title}</h3>
            <p>${item.description.substring(0, 150)}...</p>
            <div class="evidence-meta">
                <span><strong>Submitted by:</strong> ${item.name}</span>
                <span><strong>Date:</strong> ${item.date}</span>
                <span class="status-badge">${item.status}</span>
            </div>
        </div>
    `).join('');
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
