const API_BASE = 'https://backend-production-4086.up.railway.app/api/auth';

const form = document.getElementById('signup-form');
const alertBox = document.getElementById('alert-box');
const signupBtn = document.getElementById('signup-btn');
const btnText = document.getElementById('btn-text');
const passwordInput = document.getElementById('password');
const confirmInput = document.getElementById('confirm_password');

function showAlert(message, type = 'error') {
    alertBox.innerHTML = `
    <div class="alert alert-${type}">
      <span>${type === 'error' ? '❌' : type === 'success' ? '✅' : 'ℹ️'}</span>
      ${message}
    </div>`;
}
function clearAlert() { alertBox.innerHTML = ''; }

function setLoading(loading) {
    if (loading) {
        signupBtn.classList.add('btn-loading');
        btnText.innerHTML = '<div class="spinner"></div> Sending OTP...';
    } else {
        signupBtn.classList.remove('btn-loading');
        btnText.textContent = 'Create Account & Send OTP';
    }
}

// Password strength
const segments = [
    document.getElementById('seg-1'),
    document.getElementById('seg-2'),
    document.getElementById('seg-3'),
    document.getElementById('seg-4')
];
const strengthLabel = document.getElementById('strength-label');
const colors = ['#ef4444', '#f59e0b', '#3b82f6', '#22c55e'];
const labels = ['Weak', 'Fair', 'Good', 'Strong'];

function calcStrength(pwd) {
    let score = 0;
    if (pwd.length >= 6) score++;
    if (pwd.length >= 10) score++;
    if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd) && /[^a-zA-Z0-9]/.test(pwd)) score++;
    return Math.max(0, Math.min(score, 4));
}

passwordInput.addEventListener('input', () => {
    const pwd = passwordInput.value;
    const strength = calcStrength(pwd);
    segments.forEach((s, i) => {
        s.style.background = i < strength ? colors[strength - 1] : 'var(--border)';
    });
    strengthLabel.textContent = pwd.length > 0 ? labels[strength - 1] || 'Weak' : '';
    strengthLabel.style.color = pwd.length > 0 ? colors[strength - 1] : 'var(--text-muted)';
});

// Toggle passwords
document.getElementById('toggle-pass').addEventListener('click', () => {
    const vis = passwordInput.type === 'text';
    passwordInput.type = vis ? 'password' : 'text';
    document.getElementById('toggle-pass').textContent = vis ? '👁️' : '🙈';
});
document.getElementById('toggle-confirm').addEventListener('click', () => {
    const vis = confirmInput.type === 'text';
    confirmInput.type = vis ? 'password' : 'text';
    document.getElementById('toggle-confirm').textContent = vis ? '👁️' : '🙈';
});

// Form submit
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearAlert();

    const full_name = document.getElementById('full_name').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = passwordInput.value;
    const confirm_password = confirmInput.value;

    if (!full_name || !email || !password || !confirm_password) {
        showAlert('All fields are required.');
        return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        showAlert('Please enter a valid email address.');
        return;
    }

    if (password.length < 6) {
        showAlert('Password must be at least 6 characters.');
        return;
    }

    if (password !== confirm_password) {
        showAlert('Passwords do not match.');
        return;
    }

    setLoading(true);

    try {
        const res = await fetch(`${API_BASE}/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ full_name, email, password })
        });

        const data = await res.json();

        if (data.success) {
            showAlert('OTP sent to your email! Redirecting...', 'success');
            // Save email for OTP page
            sessionStorage.setItem('pendingEmail', email);
            setTimeout(() => { window.location.href = 'verify-otp.html'; }, 1000);
        } else {
            showAlert(data.message || 'Signup failed. Please try again.');
        }
    } catch (err) {
        showAlert('Cannot connect to server. Make sure the backend is running.');
    } finally {
        setLoading(false);
    }
});
