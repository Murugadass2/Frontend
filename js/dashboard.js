// Dashboard — retrieve user info from JWT/localStorage

const token = localStorage.getItem('authToken');
const rawUser = localStorage.getItem('userData');

if (!token || !rawUser) {
    window.location.href = 'index.html';
}

const user = JSON.parse(rawUser);

// If no role selected, redirect to role selection
if (!user.user_role) {
    window.location.href = 'role-selection.html';
}

// If job seeker but no profile, redirect to profile page
if (user.user_role === 'job_seeker' && !user.profile_completed) {
    window.location.href = 'job-seeker-profile.html';
}

// If job seeker with completed profile, redirect to job portal
if (user.user_role === 'job_seeker' && user.profile_completed) {
    window.location.href = 'job-portal.html';
}

// Populate UI
const welcomeTitle = document.getElementById('welcome-title');
const userAvatar = document.getElementById('user-avatar');
const infoName = document.getElementById('info-name');
const infoEmail = document.getElementById('info-email');
const infoSince = document.getElementById('info-since');
const infoRole = document.getElementById('info-role');

welcomeTitle.textContent = `Welcome, ${user.full_name}! 👋`;
userAvatar.textContent = user.full_name ? user.full_name.charAt(0).toUpperCase() : 'U';
infoName.textContent = user.full_name || '—';
infoEmail.textContent = user.email || '—';

// Display role
const roleLabel = user.user_role === 'job_seeker' ? '🔍 Job Seeker' : '🏢 Job Provider';
if (infoRole) infoRole.textContent = roleLabel;

// Decode JWT to get iat (issued at)
try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const date = new Date(payload.iat * 1000);
    infoSince.textContent = date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
} catch {
    infoSince.textContent = 'Today';
}

// Logout
document.getElementById('logout-btn').addEventListener('click', () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    sessionStorage.clear();
    window.location.href = 'index.html';
});
