// Authentication and User Management

function ensureUserStore() {
    if (!localStorage.getItem('auxstarUsers')) {
        localStorage.setItem('auxstarUsers', JSON.stringify([]));
    }
}

function getCurrentUser() {
    const userStr = sessionStorage.getItem('auxstarUser');
    return userStr ? JSON.parse(userStr) : null;
}

function setCurrentUser(user) {
    sessionStorage.setItem('auxstarUser', JSON.stringify(user));
}

function clearCurrentUser() {
    sessionStorage.removeItem('auxstarUser');
}

async function loginUser(username, password) {
    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });

        const payload = await response.json().catch(() => ({}));

        if (!response.ok) {
            return {
                success: false,
                message: payload.message || 'Invalid credentials. Please try again.'
            };
        }

        if (!payload.username || !payload.role) {
            return {
                success: false,
                message: 'Login response is missing required fields.'
            };
        }

        setCurrentUser({
            username: payload.username,
            role: payload.role,
            token: payload.token || null
        });

        return {
            success: true,
            user: payload
        };
    } catch (error) {
        console.error('Login error:', error);
        return {
            success: false,
            message: 'Login service unavailable right now. Please try again in a moment.'
        };
    }
}

function isAuthenticated() {
    return getCurrentUser() !== null;
}

function isAdmin() {
    const user = getCurrentUser();
    return user && user.role === 'admin';
}

function isEditor() {
    const user = getCurrentUser();
    return user && (user.role === 'editor' || user.role === 'admin');
}

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
            }, { once: true });
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

ensureUserStore();
updateUserDisplay();
