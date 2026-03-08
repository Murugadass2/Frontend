const API_BASE = '/api/auth';

// Auth check
const token = localStorage.getItem('authToken');
const rawUser = localStorage.getItem('userData');
if (!token || !rawUser) { window.location.href = 'index.html'; }
const user = JSON.parse(rawUser);

// Populate navbar
document.getElementById('nav-username').textContent = user.full_name || 'User';
document.getElementById('nav-avatar').textContent = user.full_name ? user.full_name.charAt(0).toUpperCase() : 'U';

// Logout
document.getElementById('logout-btn').addEventListener('click', () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    sessionStorage.clear();
    window.location.href = 'index.html';
});

// State
let allJobs = [];
let activeFilter = 'all';
let searchQuery = '';

const jobsGrid = document.getElementById('jobs-grid');
const jobsCount = document.getElementById('jobs-count');
const searchInput = document.getElementById('search-input');
const searchBtn = document.getElementById('search-btn');
const filterRow = document.getElementById('filter-row');

let isPremiumUser = false;
let hasMoreJobs = false;

// ── Fetch Jobs ──
async function loadJobs() {
    try {
        const res = await fetch(`${API_BASE}/jobs`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        const data = await res.json();
        if (data.success) {
            allJobs = data.jobs;
            isPremiumUser = data.isPremium;
            hasMoreJobs = data.hasMore;
            renderJobs(allJobs);
        } else {
            showError('Failed to load jobs.');
        }
    } catch {
        showError('Cannot connect to server.');
    }
}

// ── Render Jobs ──
function renderJobs(jobs) {
    if (jobs.length === 0) {
        jobsGrid.innerHTML = `
            <div class="no-results" style="grid-column: 1 / -1;">
                <div class="emoji-big">🔍</div>
                <h3>No jobs found</h3>
                <p>Try adjusting your search or filters</p>
            </div>
        `;
        jobsCount.textContent = '0 jobs found';
        return;
    }

    jobsCount.textContent = `${jobs.length} job${jobs.length !== 1 ? 's' : ''} found`;

    let jobsHtml = jobs.map((job, i) => `
        <div class="job-card" style="animation-delay: ${i * 0.08}s">
            <div class="job-card-top">
                <div class="job-logo">
                    ${job.logo && job.logo.startsWith('/') ? `<img src="${job.logo}" alt="logo" style="width:100%; height:100%; border-radius:12px; object-fit:cover;">` : job.logo}
                </div>
                <div class="job-info">
                    <div class="job-title">${job.title}</div>
                    <div class="job-company">${job.company}</div>
                </div>
            </div>

            <div class="job-meta">
                <span class="job-type-badge ${getBadgeClass(job.type)}">${job.type}</span>
                <span class="job-meta-item"><span class="emoji">📍</span>${job.location}</span>
                <span class="job-meta-item"><span class="emoji">💼</span>${job.experience}</span>
            </div>

            <div class="job-desc">${job.description}</div>

            <div class="job-skills">
                ${(job.skills || []).map(s => `<span class="skill-tag">${s}</span>`).join('')}
            </div>

            <div class="job-footer">
                <div>
                    <div class="job-salary">${job.salary}</div>
                    <div class="job-posted">${new Date(job.created_at).toLocaleDateString()}</div>
                </div>
                <button class="btn-apply" onclick="applyJob(${job.id})">${job.type === 'Ad' ? 'View Ad' : 'Apply Now'}</button>
            </div>
        </div>
    `).join('');

    if (hasMoreJobs && activeFilter === 'all' && !searchQuery) {
        jobsHtml += `
            <div class="job-card premium-upsell" style="animation-delay: 0.5s; text-align: center; border: 2px dashed #eab308; background: #fffdf2; grid-column: 1 / -1;">
                <div style="font-size: 30px; margin-bottom: 10px;">👑</div>
                <h3 style="color: #0f172a; margin-bottom: 8px;">Unlock More Opportunities</h3>
                <p style="color: #64748b; font-size: 14px; margin-bottom: 16px;">There are more jobs available! Upgrade to Premium to see unlimited jobs and contact employers directly.</p>
                <button class="btn btn-primary" onclick="alert('Proceeding to premium upgrade...')">Upgrade to Premium</button>
            </div>
        `;
    }

    jobsGrid.innerHTML = jobsHtml;
}

function getBadgeClass(type) {
    const map = {
        'Full-Time': 'badge-fulltime',
        'Remote': 'badge-remote',
        'Part-Time': 'badge-parttime',
        'Internship': 'badge-internship'
    };
    return map[type] || 'badge-fulltime';
}

function showError(msg) {
    jobsGrid.innerHTML = `
        <div class="no-results" style="grid-column: 1 / -1;">
            <div class="emoji-big">⚠️</div>
            <h3>${msg}</h3>
            <p>Please refresh the page or try again later</p>
        </div>
    `;
    jobsCount.textContent = '';
}

// ── Filter & Search ──
function applyFilters() {
    let filtered = [...allJobs];

    // Filter by type/location
    if (activeFilter !== 'all') {
        filtered = filtered.filter(job =>
            job.type === activeFilter ||
            job.location.toLowerCase().includes(activeFilter.toLowerCase())
        );
    }

    // Search
    if (searchQuery) {
        const q = searchQuery.toLowerCase();
        filtered = filtered.filter(job =>
            job.title.toLowerCase().includes(q) ||
            job.company.toLowerCase().includes(q) ||
            job.location.toLowerCase().includes(q) ||
            job.description.toLowerCase().includes(q) ||
            job.skills.some(s => s.toLowerCase().includes(q))
        );
    }

    renderJobs(filtered);
}

// Filter chip click
filterRow.addEventListener('click', (e) => {
    const chip = e.target.closest('.filter-chip');
    if (!chip) return;

    filterRow.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');

    activeFilter = chip.dataset.filter;
    applyFilters();
});

// Search
searchBtn.addEventListener('click', () => {
    searchQuery = searchInput.value.trim();
    applyFilters();
});

searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        searchQuery = searchInput.value.trim();
        applyFilters();
    }
});

// Live search (debounced)
let searchTimeout;
searchInput.addEventListener('input', () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
        searchQuery = searchInput.value.trim();
        applyFilters();
    }, 300);
});

// ── Apply Button ──
function applyJob(jobId) {
    const job = allJobs.find(j => j.id === jobId);
    if (job) {
        alert(`✅ Application submitted for "${job.title}" at ${job.company}!\n\nThis is a demo. In production, this would send your profile to the employer.`);
    }
}

// ── Init ──
loadJobs();
