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
        localStorage.setItem('auxstarUsers', JSON.stringify([]));
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
