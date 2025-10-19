// Login Page Script

document.addEventListener('DOMContentLoaded', () => {
    // If already logged in, redirect to dashboard
    if (isAuthenticated() && isAdmin()) {
        window.location.href = 'dashboard.html';
    }
    
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
});

async function handleLogin(e) {
    e.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const messageDiv = document.getElementById('loginMessage');

    messageDiv.textContent = 'Validating credentials...';
    messageDiv.className = 'message info';

    const result = await loginUser(username, password);

    if (result.success) {
        messageDiv.textContent = 'Login successful! Redirecting...';
        messageDiv.className = 'message success';
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 1000);
        return;
    }

    messageDiv.textContent = result.message || 'Login failed. Please verify your credentials or contact an administrator.';
    messageDiv.className = 'message error';
    document.getElementById('password').value = '';
}
