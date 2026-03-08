const API_BASE = '/api/auth';

const form = document.getElementById('login-form');
const alertBox = document.getElementById('alert-box');
const loginBtn = document.getElementById('login-btn');
const btnText = document.getElementById('btn-text');
const togglePass = document.getElementById('toggle-pass');
const passwordInput = document.getElementById('password');

// If already logged in, redirect to dashboard
if (localStorage.getItem('authToken')) {
    window.location.href = 'dashboard.html';
}

// Toggle password visibility
let passVisible = false;
togglePass.addEventListener('click', () => {
    passVisible = !passVisible;
    passwordInput.type = passVisible ? 'text' : 'password';
    togglePass.textContent = passVisible ? '🙈' : '👁️';
});

// Show alert
function showAlert(message, type = 'error') {
    alertBox.innerHTML = `
    <div class="alert alert-${type}">
      <span>${type === 'error' ? '❌' : type === 'success' ? '✅' : 'ℹ️'}</span>
      ${message}
    </div>`;
}

function clearAlert() { alertBox.innerHTML = ''; }

// Set loading state
function setLoading(loading) {
    if (loading) {
        loginBtn.classList.add('btn-loading');
        btnText.innerHTML = '<div class="spinner"></div> Signing in...';
    } else {
        loginBtn.classList.remove('btn-loading');
        btnText.textContent = 'Sign In';
    }
}

// Form submit
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearAlert();

    const email = document.getElementById('email').value.trim();
    const password = passwordInput.value.trim();
    const remember = document.getElementById('remember').checked;

    if (!email || !password) {
        showAlert('Please fill in all fields.');
        return;
    }

    setLoading(true);

    try {
        const res = await fetch(`${API_BASE}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await res.json();

        if (data.success) {
            showAlert('Login successful! Redirecting...', 'success');

            // Store token and user info
            const storage = remember ? localStorage : sessionStorage;
            storage.setItem('authToken', data.token);
            storage.setItem('userData', JSON.stringify(data.user));
            // Always keep in localStorage for dashboard check
            localStorage.setItem('authToken', data.token);
            localStorage.setItem('userData', JSON.stringify(data.user));

            // Redirect based on role and profile completion
            let redirectPage = 'role-selection.html';
            if (data.user.user_role) {
                if (data.user.user_role === 'admin' || data.user.user_role === 'co_admin') {
                    redirectPage = 'admin-portal.html';
                } else if (data.user.user_role === 'job_seeker' && !data.user.profile_completed) {
                    redirectPage = 'job-seeker-profile.html';
                } else if (data.user.user_role === 'job_seeker' && data.user.profile_completed) {
                    redirectPage = 'job-portal.html';
                } else {
                    redirectPage = 'dashboard.html';
                }
            }
            setTimeout(() => { window.location.href = redirectPage; }, 800);
        } else {
            showAlert(data.message || 'Login failed. Please try again.');
        }
    } catch (err) {
        showAlert('Cannot connect to server. Make sure the backend is running.');
    } finally {
        setLoading(false);
    }
});
