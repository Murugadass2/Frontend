const API_BASE = '/api/auth';

// Check if user is logged in
const token = localStorage.getItem('authToken');
const rawUser = localStorage.getItem('userData');
if (!token || !rawUser) {
    window.location.href = 'index.html';
}

const user = JSON.parse(rawUser);

// If user already has a role, skip to dashboard
if (user.user_role) {
    window.location.href = 'dashboard.html';
}

const cards = document.querySelectorAll('.role-card');
const continueBtn = document.getElementById('continue-btn');
const btnText = document.getElementById('btn-text');
const alertBox = document.getElementById('alert-box');

let selectedRole = null;

// Card click handler
cards.forEach(card => {
    card.addEventListener('click', () => {
        // Deselect all
        cards.forEach(c => c.classList.remove('selected'));
        // Select this one
        card.classList.add('selected');
        selectedRole = card.getAttribute('data-role');

        // Enable button
        continueBtn.disabled = false;
        continueBtn.style.opacity = '1';
        const roleName = selectedRole === 'job_seeker' ? 'Job Seeker' : 'Job Provider';
        btnText.textContent = `Continue as ${roleName}`;
    });
});

function showAlert(message, type = 'error') {
    alertBox.innerHTML = `
    <div class="alert alert-${type}">
      <span>${type === 'error' ? '❌' : '✅'}</span>
      ${message}
    </div>`;
}

function setLoading(loading) {
    if (loading) {
        continueBtn.classList.add('btn-loading');
        btnText.innerHTML = '<div class="spinner"></div> Saving...';
    } else {
        continueBtn.classList.remove('btn-loading');
        const roleName = selectedRole === 'job_seeker' ? 'Job Seeker' : 'Job Provider';
        btnText.textContent = `Continue as ${roleName}`;
    }
}

// Continue button
continueBtn.addEventListener('click', async () => {
    if (!selectedRole) return;

    setLoading(true);
    alertBox.innerHTML = '';

    try {
        const res = await fetch(`${API_BASE}/set-role`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ role: selectedRole })
        });

        const data = await res.json();

        if (data.success) {
            // Update local user data with role
            user.user_role = selectedRole;
            localStorage.setItem('userData', JSON.stringify(user));

            showAlert('Role saved! Redirecting...', 'success');
            const target = selectedRole === 'job_seeker' ? 'job-seeker-profile.html' : 'dashboard.html';
            setTimeout(() => { window.location.href = target; }, 600);
        } else {
            showAlert(data.message || 'Failed to save role.');
        }
    } catch (err) {
        showAlert('Cannot connect to server.');
    } finally {
        setLoading(false);
    }
});
