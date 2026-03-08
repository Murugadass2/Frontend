const API_BASE = '/api/auth';

const alertBox = document.getElementById('alert-box');
const otpSubtitle = document.getElementById('otp-subtitle');
const verifyBtn = document.getElementById('verify-btn');
const btnText = document.getElementById('btn-text');
const form = document.getElementById('otp-form');
const countdownEl = document.getElementById('countdown');
const timerText = document.getElementById('timer-text');
const resendBtn = document.getElementById('resend-btn');

// Get email from sessionStorage
const email = sessionStorage.getItem('pendingEmail');
if (!email) { window.location.href = 'signup.html'; }

otpSubtitle.textContent = `Enter the 6-digit code we sent to ${email}`;

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
        verifyBtn.classList.add('btn-loading');
        btnText.innerHTML = '<div class="spinner"></div> Verifying...';
    } else {
        verifyBtn.classList.remove('btn-loading');
        btnText.textContent = 'Verify OTP';
    }
}

// ── OTP Input Auto-advance ──
const otpInputs = Array.from(document.querySelectorAll('.otp-input'));

otpInputs.forEach((input, index) => {
    input.addEventListener('input', (e) => {
        const val = e.target.value.replace(/\D/g, '');
        input.value = val;
        if (val) {
            input.classList.add('filled');
            if (index < otpInputs.length - 1) otpInputs[index + 1].focus();
        } else {
            input.classList.remove('filled');
        }
    });

    input.addEventListener('keydown', (e) => {
        if (e.key === 'Backspace' && !input.value && index > 0) {
            otpInputs[index - 1].focus();
            otpInputs[index - 1].value = '';
            otpInputs[index - 1].classList.remove('filled');
        }
    });

    // Allow paste of full OTP
    input.addEventListener('paste', (e) => {
        e.preventDefault();
        const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
        if (pasted.length === 6) {
            otpInputs.forEach((inp, i) => {
                inp.value = pasted[i] || '';
                inp.classList.toggle('filled', !!pasted[i]);
            });
            otpInputs[5].focus();
        }
    });
});

// Get full OTP string
function getOTP() {
    return otpInputs.map(inp => inp.value).join('');
}

// Shake animation on error
function shakeInputs() {
    otpInputs.forEach(inp => {
        inp.classList.remove('shake');
        void inp.offsetWidth; // reflow
        inp.classList.add('shake');
    });
    setTimeout(() => { otpInputs.forEach(inp => inp.classList.remove('shake')); }, 500);
}

// ── Countdown Timer ──
let timerInterval;
let timeLeft = 120; // 2 minutes

function formatTime(secs) {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
}

function startTimer() {
    timeLeft = 120;
    countdownEl.textContent = formatTime(timeLeft);
    timerText.style.display = 'inline';
    resendBtn.style.display = 'none';

    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        timeLeft--;
        countdownEl.textContent = formatTime(timeLeft);
        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            timerText.style.display = 'none';
            resendBtn.style.display = 'inline';
        }
    }, 1000);
}

startTimer();

// ── Resend OTP ──
resendBtn.addEventListener('click', async () => {
    clearAlert();
    resendBtn.disabled = true;
    resendBtn.textContent = 'Sending...';

    try {
        const res = await fetch(`${API_BASE}/resend-otp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });
        const data = await res.json();
        if (data.success) {
            showAlert('New OTP sent to your email!', 'info');
            startTimer();
            otpInputs.forEach(inp => { inp.value = ''; inp.classList.remove('filled'); });
            otpInputs[0].focus();
        } else {
            showAlert(data.message || 'Failed to resend OTP.');
        }
    } catch {
        showAlert('Cannot connect to server.');
    } finally {
        resendBtn.disabled = false;
        resendBtn.textContent = 'Resend OTP';
    }
});

// ── Verify OTP ──
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearAlert();

    const otp = getOTP();
    if (otp.length !== 6) {
        showAlert('Please enter all 6 digits of the OTP.');
        shakeInputs();
        return;
    }

    setLoading(true);

    try {
        const res = await fetch(`${API_BASE}/verify-otp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, otp })
        });
        const data = await res.json();

        if (data.success) {
            clearInterval(timerInterval);
            showAlert('Email verified! Redirecting to login...', 'success');
            sessionStorage.removeItem('pendingEmail');
            setTimeout(() => { window.location.href = 'index.html'; }, 1200);
        } else {
            showAlert(data.message || 'Invalid OTP. Try again.');
            shakeInputs();
        }
    } catch {
        showAlert('Cannot connect to server.');
    } finally {
        setLoading(false);
    }
});

// Focus first input on load
window.addEventListener('load', () => { otpInputs[0].focus(); });
