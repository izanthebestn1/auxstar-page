// Authentication and User Management

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

async function logoutUser({ redirect = false } = {}) {
    const user = getCurrentUser();

    try {
        if (user && user.token) {
            await fetch('/api/auth/logout', {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${user.token}`
                }
            }).catch((error) => {
                console.error('Logout request failed:', error);
            });
        }
    } finally {
        clearCurrentUser();

        if (redirect) {
            const isAdminSection = window.location.pathname.includes('/admin/');
            window.location.href = isAdminSection ? 'login.html' : 'admin/login.html';
        }
    }
}

async function loginUser(username, password) {
    try {
        const response = await fetch('/api/auth/login', {
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
    return Boolean(user && typeof user.role === 'string' && user.role.toLowerCase() === 'admin');
}

function isEditor() {
    const user = getCurrentUser();
    if (!user || typeof user.role !== 'string') {
        return false;
    }

    const role = user.role.toLowerCase();
    return role === 'editor' || role === 'admin';
}

function updateUserDisplay() {
    const userDisplay = document.getElementById('userDisplay');
    const logoutBtn = document.getElementById('logoutBtn');
    const adminLink = document.getElementById('adminLink');
    const user = getCurrentUser();

    if (user) {
        if (userDisplay) {
            const roleLabel = typeof user.role === 'string' ? user.role.toUpperCase() : '';
            userDisplay.textContent = roleLabel ? `Welcome, ${user.username} (${roleLabel})` : `Welcome, ${user.username}`;
        }
        if (logoutBtn) {
            logoutBtn.style.display = 'block';
            logoutBtn.onclick = async () => {
                await logoutUser({ redirect: false });
                window.location.href = 'index.html';
            };
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

updateUserDisplay();
