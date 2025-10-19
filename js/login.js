// Login Page Script

document.addEventListener('DOMContentLoaded', () => {
    // If already logged in, redirect to dashboard
    if (isAuthenticated() && isAdmin()) {
        window.location.href = 'dashboard.html';
    }
    
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
});

function handleLogin(e) {
    e.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const messageDiv = document.getElementById('loginMessage');
    
    if (loginUser(username, password)) {
        messageDiv.textContent = 'Login successful! Redirecting...';
        messageDiv.className = 'message success';
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 1000);
    } else {
        messageDiv.textContent = 'Invalid username or password';
        messageDiv.className = 'message error';
        document.getElementById('password').value = '';
    }
}
