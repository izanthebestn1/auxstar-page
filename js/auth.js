// Authentication and User Management

// Default users (in a real app, this would be in a database)
const DEFAULT_USERS = [
    { username: 'admin', password: 'admin123', role: 'admin', joined: '2025-01-01' },
    { username: 'editor1', password: 'editor123', role: 'editor', joined: '2025-01-15' },
    { username: 'editor2', password: 'editor123', role: 'editor', joined: '2025-01-20' }
];

// Initialize users in localStorage
function initializeUsers() {
    if (!localStorage.getItem('auxstarUsers')) {
        localStorage.setItem('auxstarUsers', JSON.stringify(DEFAULT_USERS));
    }
}

// Get current logged-in user
function getCurrentUser() {
    const userStr = sessionStorage.getItem('auxstarUser');
    return userStr ? JSON.parse(userStr) : null;
}

// Set logged-in user
function setCurrentUser(user) {
    sessionStorage.setItem('auxstarUser', JSON.stringify(user));
}

// Clear logged-in user
function clearCurrentUser() {
    sessionStorage.removeItem('auxstarUser');
}

// Login user
function loginUser(username, password) {
    const users = JSON.parse(localStorage.getItem('auxstarUsers')) || DEFAULT_USERS;
    const user = users.find(u => u.username === username && u.password === password);
    
    if (user) {
        setCurrentUser({ username: user.username, role: user.role });
        return true;
    }
    return false;
}

// Check if user is authenticated
function isAuthenticated() {
    return getCurrentUser() !== null;
}

// Check if user is admin
function isAdmin() {
    const user = getCurrentUser();
    return user && user.role === 'admin';
}

// Check if user is editor
function isEditor() {
    const user = getCurrentUser();
    return user && (user.role === 'editor' || user.role === 'admin');
}

// Update user display
function updateUserDisplay() {
    const userDisplay = document.getElementById('userDisplay');
    const logoutBtn = document.getElementById('logoutBtn');
    const adminLink = document.getElementById('adminLink');
    const user = getCurrentUser();

    if (user) {
        if (userDisplay) {
            userDisplay.textContent = `Welcome, ${user.username}`;
        }
        if (logoutBtn) {
            logoutBtn.style.display = 'block';
            logoutBtn.addEventListener('click', () => {
                clearCurrentUser();
                window.location.href = 'index.html';
            });
        }
        if (adminLink && !isAdmin()) {
            adminLink.style.display = 'none';
        }
    } else {
        if (userDisplay) {
            userDisplay.textContent = '';
        }
        if (logoutBtn) {
            logoutBtn.style.display = 'none';
        }
    }
}

// Initialize auth system
initializeUsers();
updateUserDisplay();
