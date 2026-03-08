const API_BASE = '/api/auth';

// Auth check
const token = localStorage.getItem('authToken');
const rawUser = localStorage.getItem('userData');
if (!token || !rawUser) { window.location.href = 'index.html'; }
const user = JSON.parse(rawUser);

const form = document.getElementById('profile-form');
const alertBox = document.getElementById('alert-box');
const submitBtn = document.getElementById('submit-btn');
const btnText = document.getElementById('btn-text');

// ── Preferred Job Locations (Tags) ──
const tagInput = document.getElementById('job-location-input');
const addLocationBtn = document.getElementById('add-location-btn');
const tagsContainer = document.getElementById('tags-container');
let preferredLocations = [];

function renderTags() {
    tagsContainer.innerHTML = preferredLocations.map((loc, i) => `
    <span class="tag">
      ${loc}
      <button type="button" class="tag-remove" data-index="${i}">&times;</button>
    </span>
  `).join('');
}

function addLocation() {
    const val = tagInput.value.trim();
    if (val && !preferredLocations.includes(val)) {
        preferredLocations.push(val);
        renderTags();
        tagInput.value = '';
    }
    tagInput.focus();
}

addLocationBtn.addEventListener('click', addLocation);
tagInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); addLocation(); }
});
tagsContainer.addEventListener('click', (e) => {
    if (e.target.classList.contains('tag-remove')) {
        preferredLocations.splice(parseInt(e.target.dataset.index), 1);
        renderTags();
    }
});

// ── Phone Verification ──
const phoneInput = document.getElementById('phone');
const verifyPhoneBtn = document.getElementById('verify-phone-btn');
const phoneBadge = document.getElementById('phone-badge');
const phoneModal = document.getElementById('phone-modal');
const modalCloseBtn = document.getElementById('modal-close-btn');
const modalVerifyBtn = document.getElementById('modal-verify-btn');
const modalBtnText = document.getElementById('modal-btn-text');
const modalAlert = document.getElementById('modal-alert');
const modalSubtitle = document.getElementById('modal-subtitle');
let phoneVerified = false;

// OTP inputs in modal
const phoneOTPInputs = Array.from(document.querySelectorAll('#phone-otp-container .otp-input'));
phoneOTPInputs.forEach((input, index) => {
    input.addEventListener('input', (e) => {
        const val = e.target.value.replace(/\D/g, '');
        input.value = val;
        if (val && index < phoneOTPInputs.length - 1) phoneOTPInputs[index + 1].focus();
        input.classList.toggle('filled', !!val);
    });
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Backspace' && !input.value && index > 0) {
            phoneOTPInputs[index - 1].focus();
            phoneOTPInputs[index - 1].value = '';
            phoneOTPInputs[index - 1].classList.remove('filled');
        }
    });
    input.addEventListener('paste', (e) => {
        e.preventDefault();
        const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
        if (pasted.length === 6) {
            phoneOTPInputs.forEach((inp, i) => {
                inp.value = pasted[i] || '';
                inp.classList.toggle('filled', !!pasted[i]);
            });
            phoneOTPInputs[5].focus();
        }
    });
});

function getPhoneOTP() {
    return phoneOTPInputs.map(inp => inp.value).join('');
}

// Send phone OTP
verifyPhoneBtn.addEventListener('click', async () => {
    const phone = phoneInput.value.trim();
    if (!phone || phone.length < 10) {
        showAlert('Please enter a valid phone number.'); return;
    }
    verifyPhoneBtn.disabled = true;
    verifyPhoneBtn.textContent = 'Sending...';

    try {
        const res = await fetch(`${API_BASE}/send-phone-otp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ phone })
        });
        const data = await res.json();
        if (data.success) {
            modalSubtitle.textContent = `Enter the OTP for ${phone}`;
            modalAlert.innerHTML = data.message.includes('OTP:')
                ? `<div class="alert alert-info"><span>📋</span>${data.message}</div>` : '';
            phoneModal.classList.add('active');
            phoneOTPInputs[0].focus();
        } else {
            showAlert(data.message || 'Failed to send OTP.');
        }
    } catch { showAlert('Cannot connect to server.'); }
    finally { verifyPhoneBtn.disabled = false; verifyPhoneBtn.textContent = 'Verify Phone'; }
});

// Verify phone OTP
modalVerifyBtn.addEventListener('click', async () => {
    const otp = getPhoneOTP();
    if (otp.length !== 6) {
        modalAlert.innerHTML = '<div class="alert alert-error"><span>❌</span>Enter all 6 digits.</div>';
        return;
    }
    modalBtnText.innerHTML = '<div class="spinner"></div> Verifying...';

    try {
        const res = await fetch(`${API_BASE}/verify-phone-otp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ phone: phoneInput.value.trim(), otp })
        });
        const data = await res.json();
        if (data.success) {
            phoneVerified = true;
            phoneModal.classList.remove('active');
            phoneBadge.style.display = 'flex';
            verifyPhoneBtn.textContent = '✅ Verified';
            verifyPhoneBtn.disabled = true;
            phoneInput.readOnly = true;
            showAlert('Phone number verified!', 'success');
        } else {
            modalAlert.innerHTML = `<div class="alert alert-error"><span>❌</span>${data.message}</div>`;
            phoneOTPInputs.forEach(inp => { inp.classList.add('shake'); });
            setTimeout(() => phoneOTPInputs.forEach(inp => inp.classList.remove('shake')), 500);
        }
    } catch { modalAlert.innerHTML = '<div class="alert alert-error"><span>❌</span>Server error.</div>'; }
    finally { modalBtnText.textContent = 'Verify OTP'; }
});

modalCloseBtn.addEventListener('click', () => { phoneModal.classList.remove('active'); });

// ── Alerts ──
function showAlert(message, type = 'error') {
    alertBox.innerHTML = `<div class="alert alert-${type}"><span>${type === 'error' ? '❌' : '✅'}</span>${message}</div>`;
    alertBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
}
function clearAlert() { alertBox.innerHTML = ''; }

function setLoading(loading) {
    if (loading) {
        submitBtn.classList.add('btn-loading');
        btnText.innerHTML = '<div class="spinner"></div> Saving...';
    } else {
        submitBtn.classList.remove('btn-loading');
        btnText.textContent = 'Submit Profile';
    }
}

// ── Form Submit ──
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearAlert();

    const full_name = document.getElementById('full_name').value.trim();
    const dob = document.getElementById('dob').value;
    const phone = phoneInput.value.trim();

    if (!full_name) { showAlert('Full name is required.'); return; }
    if (!dob) { showAlert('Date of birth is required.'); return; }
    if (!phone) { showAlert('Phone number is required.'); return; }
    if (!phoneVerified) { showAlert('Please verify your phone number first.'); return; }

    const profileData = {
        full_name,
        date_of_birth: dob,
        father_name: document.getElementById('father_name').value.trim(),
        highest_qualification: document.getElementById('qualification').value,
        current_location: document.getElementById('current_location').value.trim(),
        country: document.getElementById('country').value.trim(),
        state: document.getElementById('state').value.trim(),
        district: document.getElementById('district').value.trim(),
        full_address: document.getElementById('full_address').value.trim(),
        company_name: document.getElementById('company_name').value.trim(),
        preferred_job_locations: preferredLocations,
        phone_number: phone,
        phone_verified: phoneVerified
    };

    setLoading(true);

    try {
        const res = await fetch(`${API_BASE}/save-profile`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify(profileData)
        });
        const data = await res.json();
        if (data.success) {
            showAlert('Profile saved successfully! Redirecting...', 'success');
            // Update local storage
            user.profile_completed = true;
            localStorage.setItem('userData', JSON.stringify(user));
            setTimeout(() => { window.location.href = 'job-portal.html'; }, 1000);
        } else {
            showAlert(data.message || 'Failed to save profile.');
        }
    } catch { showAlert('Cannot connect to server.'); }
    finally { setLoading(false); }
});

// Pre-fill name from registration
if (user.full_name) document.getElementById('full_name').value = user.full_name;
