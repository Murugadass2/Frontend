const API_BASE = '/api/admin';

// --- Auth Check ---
const token = localStorage.getItem('authToken');
const rawUser = localStorage.getItem('userData');

if (!token || !rawUser) {
    window.location.href = 'index.html';
}

const user = JSON.parse(rawUser);

// Ensure user is an admin or co-admin
if (user.user_role !== 'admin' && user.user_role !== 'co_admin') {
    alert("Unauthorized access!");
    window.location.href = 'dashboard.html';
}

// Populate Header
document.getElementById('admin-name').textContent = user.full_name || 'Admin';
const badge = document.getElementById('admin-role-badge');
if (user.user_role === 'co_admin') {
    badge.textContent = 'Co-Administrator';
    badge.style.background = 'rgba(239, 68, 68, 0.15)'; // Reddish for co-admin
    badge.style.color = '#ef4444';
} else {
    badge.textContent = 'Super Administrator';
}

// --- API Helpers ---
async function fetchAPI(endpoint, method = 'GET', body = null) {
    const options = {
        method,
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    };
    if (body) options.body = JSON.stringify(body);

    try {
        const response = await fetch(`${API_BASE}${endpoint}`, options);
        return await response.json();
    } catch (error) {
        console.error('API Error:', error);
        return { success: false, message: 'Network error.' };
    }
}

// --- Dashboard Init ---
async function loadDashboard() {
    const data = await fetchAPI('/stats');
    if (data.success) {
        document.getElementById('stat-jobs').textContent = data.stats.total_jobs;
        document.getElementById('stat-seekers').textContent = data.stats.total_seekers;
        document.getElementById('stat-providers').textContent = data.stats.total_providers;
    }

    loadRecentJobs();
}

async function loadRecentJobs() {
    const data = await fetchAPI('/jobs');
    const container = document.getElementById('recent-jobs-list');

    if (data.success && data.jobs.length > 0) {
        // Display top 5 recent jobs
        const recentJobs = data.jobs.slice(0, 5);
        container.innerHTML = recentJobs.map(job => `
            <div class="job-list-item">
                <div>
                    <div class="job-list-title">${job.title}</div>
                    <div class="job-list-company">${job.company} • ${job.location || 'N/A'}</div>
                </div>
                ${user.user_role === 'admin' ? `<button class="action-btn-danger" onclick="deleteJob(${job.id})">Delete</button>` : ''}
            </div>
        `).join('');
    } else {
        container.innerHTML = `<div style="text-align:center; color:#94a3b8; margin-top: 20px;">No recent jobs</div>`;
    }
}

// --- Screen Navigation Logic ---
function openScreen(id) {
    document.getElementById(id).classList.add('active');

    // Load specific data when screens open
    if (id === 'screen-manage-users' || id === 'screen-premium-control') {
        loadUsers('seeker', id);
    } else if (id === 'screen-co-admins') {
        loadCoAdmins();
    }
}

function closeScreen(id) {
    document.getElementById(id).classList.remove('active');
}

// --- Manage Users & Premium Control ---
async function loadUsers(role, screenId = 'screen-manage-users') {
    const data = await fetchAPI(`/users/${role}`);
    let containerId = screenId === 'screen-premium-control' ? 'premium-users-list' : 'users-list-container';
    const container = document.getElementById(containerId);

    if (data.success && data.users.length > 0) {
        container.innerHTML = data.users.map(u => `
            <div class="user-list-card">
                <div>
                    <div style="font-weight:700; color:#0f172a; font-size:14px;">${u.full_name} <span style="font-size:12px; color:#64748b;">(${u.email})</span></div>
                    <div style="font-size:12px; margin-top:4px;">
                        ${u.is_premium ? '👑 <span style="color:#eab308; font-weight:600;">Premium</span>' : 'Standard Account'}
                    </div>
                </div>
                ${screenId === 'screen-premium-control' ?
                `<label style="display:flex; align-items:center; gap:8px; cursor:pointer;">
                        <input type="checkbox" ${u.is_premium ? 'checked' : ''} onchange="togglePremium(${u.id}, this.checked)">
                        <span style="font-size:12px;">Premium</span>
                     </label>` :
                `<span style="color:#22c55e; font-size:12px; font-weight:bold;">Active</span>`
            }
            </div>
        `).join('');
    } else {
        container.innerHTML = `<p style="color:#64748b; text-align:center; margin-top:20px;">No ${role}s found.</p>`;
    }
}

async function togglePremium(userId, isPremium) {
    const data = await fetchAPI('/premium-toggle', 'POST', { userId, isPremium });
    if (!data.success) {
        alert(data.message);
    }
}

// --- Create Job ---
document.getElementById('create-job-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = document.getElementById('job-title').value;
    const company = document.getElementById('job-company').value;
    const location = document.getElementById('job-location').value;
    const salary = document.getElementById('job-salary').value;
    const description = document.getElementById('job-desc').value;

    const data = await fetchAPI('/jobs', 'POST', {
        title, company, location, type: 'Full-Time', experience: '0-2 Years', salary, description, skills: [], logo: '📄'
    });

    if (data.success) {
        alert("Job created successfully!");
        document.getElementById('create-job-form').reset();
        closeScreen('screen-create-job');
        loadDashboard(); // Refresh stats and list
    } else {
        alert(data.message || 'Failed to create job');
    }
});

async function deleteJob(id) {
    if (!confirm('Are you sure you want to delete this job?')) return;

    // Safety check just in case UI showed it for co_admin
    if (user.user_role !== 'admin') {
        alert("Permission denied. Only Super Admin can delete.");
        return;
    }

    const data = await fetchAPI(`/jobs/${id}`, 'DELETE');
    if (data.success) {
        alert("Job deleted.");
        loadDashboard();
    } else {
        alert(data.message);
    }
}

// --- Co Admins ---
document.getElementById('create-coadmin-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btn-create-coadmin');
    const alertBox = document.getElementById('coadmin-alert');

    if (user.user_role !== 'admin') {
        alertBox.innerHTML = '<p style="color:red; font-size:13px;">Only Super Admin can create Co-Admins.</p>';
        return;
    }

    const full_name = document.getElementById('coadmin-name').value;
    const email = document.getElementById('coadmin-email').value;
    const password = document.getElementById('coadmin-password').value;

    btn.disabled = true;
    btn.textContent = 'Creating...';

    const data = await fetchAPI('/co-admins', 'POST', { full_name, email, password });

    if (data.success) {
        alertBox.innerHTML = '<p style="color:green; font-size:13px;">Co-admin created successfully!</p>';
        document.getElementById('create-coadmin-form').reset();
        loadCoAdmins();
    } else {
        alertBox.innerHTML = `<p style="color:red; font-size:13px;">${data.message}</p>`;
    }

    btn.disabled = false;
    btn.textContent = 'Create Co-Admin';
});

async function loadCoAdmins() {
    const data = await fetchAPI('/co-admins');
    const container = document.getElementById('coadmin-list');

    if (data.success && data.coAdmins.length > 0) {
        container.innerHTML = data.coAdmins.map(c => `
            <div class="user-list-card">
                <div>
                    <div style="font-weight:700; color:#0f172a; font-size:14px;">${c.full_name}</div>
                    <div style="font-size:12px; color:#64748b;">${c.email}</div>
                </div>
            </div>
        `).join('');
    } else {
        container.innerHTML = `<p style="color:#64748b; font-size:13px;">No co-admins found.</p>`;
    }
}

// --- Templates ---
function setTemplateBg(imgElement) {
    document.querySelectorAll('.sample-img').forEach(el => el.classList.remove('active'));
    imgElement.classList.add('active');
    document.getElementById('template-canvas').src = imgElement.src;
}

function uploadTemplateBg(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function (e) {
            document.querySelectorAll('.sample-img').forEach(el => el.classList.remove('active'));
            document.getElementById('template-canvas').src = e.target.result;
        };
        reader.readAsDataURL(file);
    }
}

async function postAdvertisement() {
    const title = document.getElementById('template-text-input').value;
    const description = document.getElementById('template-desc-input').value;
    const imgSrc = document.getElementById('template-canvas').src;
    const btn = document.getElementById('btn-post-ad');

    if (!title || !description) {
        alert("Please provide both title and description.");
        return;
    }

    btn.disabled = true;
    btn.textContent = 'Posting...';

    // Post to jobs endpoint as an Advertisement
    const data = await fetchAPI('/jobs', 'POST', {
        title: "[AD] " + title,
        company: "Advertisement",
        location: "Global",
        type: "Ad",
        experience: "N/A",
        salary: "-",
        description: description,
        skills: [],
        logo: imgSrc
    });

    if (data.success) {
        alert("Advertisement posted successfully!");
        document.getElementById('template-desc-input').value = "";
        closeScreen('screen-templates');
        loadDashboard();
    } else {
        alert(data.message || "Failed to post advertisement.");
    }

    btn.disabled = false;
    btn.textContent = 'Post Advertisement';
}

// Start
loadDashboard();
