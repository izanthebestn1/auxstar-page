// Shared Utilities

// Initialize storage
function initializeStorage() {
    if (!localStorage.getItem('auxstarArticles')) {
        localStorage.setItem('auxstarArticles', JSON.stringify([]));
    }
    if (!localStorage.getItem('auxstarEvidence')) {
        localStorage.setItem('auxstarEvidence', JSON.stringify([]));
    }
    if (!localStorage.getItem('auxstarUsers')) {
        const defaultUsers = [
            { username: 'admin', password: 'admin123', role: 'admin', joined: '2025-01-01' },
            { username: 'editor1', password: 'editor123', role: 'editor', joined: '2025-01-15' }
        ];
        localStorage.setItem('auxstarUsers', JSON.stringify(defaultUsers));
    }
}

// Show notification
function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.textContent = message;
    notification.className = `notification notification-${type}`;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);
    
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Initialize on load
document.addEventListener('DOMContentLoaded', initializeStorage);
