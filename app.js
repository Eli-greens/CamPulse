/* ===================================================================
   CamPulse — Vanilla JavaScript
   Phase 1: Trust, Verification & Accessible Foundation
   - Centralized University Config (@student.oauife.edu.ng)
   - Dynamic Stats (only shown when >= 20 real tickets exist)
   - Accessible Form Validation with Loading & Error States
   - Student Email Verification Modal Flow
   - Empty Dashboard with Interactive Example Preview
   =================================================================== */

'use strict';

// ── Application Configuration ────────────────────────────────────────

const APP_CONFIG = {
  UNIVERSITY_NAME: 'Obafemi Awolowo University (OAU)',
  ALLOWED_EMAIL_DOMAINS: ['@student.oauife.edu.ng'],
  MIN_PASSWORD_LENGTH: 8,
  STATS_MIN_TICKETS: 20,
  DEMO_OTP: '482910'
};

// ── Helpers ──────────────────────────────────────────────────────────

/** Check if an email matches the approved university domains */
function isAllowedUniversityEmail(email) {
  if (!email) return false;
  const trimmed = email.trim().toLowerCase();
  return APP_CONFIG.ALLOWED_EMAIL_DOMAINS.some(domain => trimmed.endsWith(domain.toLowerCase()));
}

/** Generate a readable ticket ID like CP-2026-0042 */
function generateId() {
  const year = new Date().getFullYear();
  const randNum = Math.floor(1000 + Math.random() * 9000);
  return `CP-${year}-${randNum}`;
}

/** Format an ISO date string into a human-readable form */
function formatDate(iso) {
  if (!iso) return 'Just now';
  const d = new Date(iso);
  const opts = { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' };
  return d.toLocaleDateString('en-US', opts);
}

/** Retrieve all tickets from localStorage */
function getTickets() {
  try {
    return JSON.parse(localStorage.getItem('campulse_tickets')) || [];
  } catch {
    return [];
  }
}

/** Save tickets array to localStorage */
function saveTickets(tickets) {
  localStorage.setItem('campulse_tickets', JSON.stringify(tickets));
}

// ── Toast Notifications ──────────────────────────────────────────────

function showToast(message) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `
    <svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
    <span>${message}</span>
  `;
  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('toast-exit');
    toast.addEventListener('animationend', () => toast.remove());
  }, 3500);
}

// ── Header Scroll Shadow ─────────────────────────────────────────────

function initHeaderScroll() {
  const header = document.getElementById('site-header');
  if (!header) return;

  const onScroll = () => {
    header.classList.toggle('scrolled', window.scrollY > 8);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

// ── Mobile Navigation Toggle ─────────────────────────────────────────

function initMobileNav() {
  const toggle = document.getElementById('menu-toggle');
  const nav = document.getElementById('nav-links');
  if (!toggle || !nav) return;

  toggle.addEventListener('click', () => {
    const isOpen = nav.classList.toggle('open');
    toggle.setAttribute('aria-expanded', String(isOpen));
  });

  // Close when clicking any nav link
  nav.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      nav.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
    });
  });
}

// ── Live Impact Stats (Phase 1: Trust & Truth in Metrics) ─────────────

function initLiveStats() {
  const strip = document.getElementById('live-stats-strip');
  if (!strip) return;

  const tickets = getTickets();

  // Item 1: Only show stats once real data exists (>= 20 tickets)
  if (tickets.length < APP_CONFIG.STATS_MIN_TICKETS) {
    strip.hidden = true;
    return;
  }

  // Real data exists: compute metrics dynamically
  const total = tickets.length;
  const resolved = tickets.filter(t => t.status === 'resolved').length;
  const resolutionRate = total > 0 ? Math.round((resolved / total) * 100) : 0;

  // Compute average resolution or response hours if available
  let avgHours = 24;
  const resolvedWithDates = tickets.filter(t => t.status === 'resolved' && t.createdAt && t.resolvedAt);
  if (resolvedWithDates.length > 0) {
    const totalDiffMs = resolvedWithDates.reduce((acc, t) => acc + (new Date(t.resolvedAt) - new Date(t.createdAt)), 0);
    avgHours = Math.max(1, Math.round(totalDiffMs / (resolvedWithDates.length * 3600000)));
  }

  const countEl = document.getElementById('stat-live-count');
  const rateEl = document.getElementById('stat-live-rate');
  const timeEl = document.getElementById('stat-live-time');

  if (countEl) countEl.dataset.to = total;
  if (rateEl) rateEl.dataset.to = resolutionRate;
  if (timeEl) timeEl.dataset.to = avgHours;

  strip.hidden = false;
}

// ── Submission Form with Validation & Loading States ─────────────────

function initSubmitForm() {
  const form = document.getElementById('complaint-form');
  if (!form) return; // Not on the submission page

  const categoryInput = form.category;
  const subjectInput = form.subject;
  const descInput = form.description;
  const urgencyCheckbox = document.getElementById('urgency');
  const urgencyState = document.getElementById('urgency-state');
  const charCount = document.getElementById('char-count');
  const charCounter = document.getElementById('char-counter');
  const submitBtn = document.getElementById('submit-btn');
  const submitSpinner = document.getElementById('submit-spinner');
  const submitIcon = document.getElementById('submit-icon');
  const submitText = document.getElementById('submit-text');
  const successMsg = document.getElementById('success-msg');
  const successTicketId = document.getElementById('success-ticket-id');
  const newComplaintBtn = document.getElementById('new-complaint-btn');

  // Helper: clear inline error
  function clearError(input, errorElId) {
    input.classList.remove('has-error');
    const err = document.getElementById(errorElId);
    if (err) {
      err.textContent = '';
      err.classList.remove('visible');
    }
  }

  // Helper: display inline error
  function setError(input, errorElId, message) {
    input.classList.add('has-error');
    const err = document.getElementById(errorElId);
    if (err) {
      err.textContent = message;
      err.classList.add('visible');
    }
  }

  // Clear errors on user input
  categoryInput.addEventListener('change', () => clearError(categoryInput, 'category-error'));
  subjectInput.addEventListener('input', () => clearError(subjectInput, 'subject-error'));
  descInput.addEventListener('input', () => {
    clearError(descInput, 'description-error');
    const len = descInput.value.length;
    charCount.textContent = len;
    charCounter.classList.remove('warn', 'limit');
    if (len >= 2000) charCounter.classList.add('limit');
    else if (len >= 1800) charCounter.classList.add('warn');
  });

  // Urgency toggle label
  urgencyCheckbox.addEventListener('change', () => {
    const isUrgent = urgencyCheckbox.checked;
    urgencyState.textContent = isUrgent ? 'Urgent' : 'Normal';
    urgencyState.classList.toggle('on', isUrgent);
  });

  // Form submission handler
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    let hasError = false;
    let firstInvalid = null;

    // Validate Category
    if (!categoryInput.value) {
      setError(categoryInput, 'category-error', 'Please select an issue category.');
      hasError = true;
      if (!firstInvalid) firstInvalid = categoryInput;
    }

    // Validate Subject
    const subject = subjectInput.value.trim();
    if (!subject) {
      setError(subjectInput, 'subject-error', 'Please provide a subject for your complaint.');
      hasError = true;
      if (!firstInvalid) firstInvalid = subjectInput;
    } else if (subject.length < 5) {
      setError(subjectInput, 'subject-error', 'Subject must be at least 5 characters long.');
      hasError = true;
      if (!firstInvalid) firstInvalid = subjectInput;
    }

    // Validate Description
    const desc = descInput.value.trim();
    if (!desc) {
      setError(descInput, 'description-error', 'Please describe the issue in detail.');
      hasError = true;
      if (!firstInvalid) firstInvalid = descInput;
    } else if (desc.length < 15) {
      setError(descInput, 'description-error', 'Description must be at least 15 characters to assist staff investigation.');
      hasError = true;
      if (!firstInvalid) firstInvalid = descInput;
    }

    if (hasError) {
      firstInvalid.focus();
      return;
    }

    // Button loading state
    submitBtn.classList.add('btn-loading');
    submitBtn.setAttribute('aria-busy', 'true');
    if (submitSpinner) submitSpinner.hidden = false;
    if (submitIcon) submitIcon.style.display = 'none';
    if (submitText) submitText.textContent = 'Submitting Complaint...';

    // Simulated network delay (ready for Supabase migration)
    await new Promise(resolve => setTimeout(resolve, 550));

    const statuses = ['pending', 'pending', 'pending', 'reviewed', 'resolved'];
    const status = statuses[Math.floor(Math.random() * statuses.length)];

    const ticket = {
      id: generateId(),
      category: categoryInput.value,
      subject,
      description: desc,
      urgent: urgencyCheckbox.checked,
      status,
      createdAt: new Date().toISOString()
    };

    const tickets = getTickets();
    tickets.unshift(ticket);
    saveTickets(tickets);

    // Reset button state
    submitBtn.classList.remove('btn-loading');
    submitBtn.removeAttribute('aria-busy');
    if (submitSpinner) submitSpinner.hidden = true;
    if (submitIcon) submitIcon.style.display = '';
    if (submitText) submitText.textContent = 'Submit Complaint';

    // Show success view
    form.hidden = true;
    successMsg.hidden = false;
    successTicketId.textContent = ticket.id;

    showToast(`Ticket ${ticket.id} created successfully!`);
    initLiveStats();
  });

  // "Submit Another" button
  newComplaintBtn.addEventListener('click', () => {
    form.reset();
    clearError(categoryInput, 'category-error');
    clearError(subjectInput, 'subject-error');
    clearError(descInput, 'description-error');
    charCount.textContent = '0';
    charCounter.classList.remove('warn', 'limit');
    urgencyState.textContent = 'Normal';
    urgencyState.classList.remove('on');
    successMsg.hidden = true;
    form.hidden = false;
    categoryInput.focus();
  });
}

// ── Dashboard (dashboard.html) ───────────────────────────────────────

function initDashboard() {
  const grid = document.getElementById('tickets-grid');
  if (!grid) return; // Not on the dashboard page

  const searchInput = document.getElementById('search-input');
  const emptyState = document.getElementById('empty-state');
  const emptyTitle = document.getElementById('empty-title');
  const emptyDesc = document.getElementById('empty-desc');
  const sampleContainer = document.getElementById('sample-ticket-container');
  const pills = document.querySelectorAll('.pill[data-filter]');

  let activeFilter = 'all';
  let searchQuery = '';

  // Clean up legacy placeholder IDs if present
  try {
    const existing = getTickets();
    const demoIds = new Set(['CP-A1B2', 'CP-C3D4', 'CP-E5F6', 'CP-G7H8', 'CP-I9J0', 'CP-K1L2']);
    const cleaned = existing.filter(t => !demoIds.has(t.id));
    if (cleaned.length !== existing.length) {
      saveTickets(cleaned);
    }
  } catch {}

  function updateCounts(tickets) {
    const total = tickets.length;
    const pending = tickets.filter(t => t.status === 'pending').length;
    const reviewed = tickets.filter(t => t.status === 'reviewed').length;
    const resolved = tickets.filter(t => t.status === 'resolved').length;

    animateCount('count-total', total);
    animateCount('count-pending', pending);
    animateCount('count-reviewed', reviewed);
    animateCount('count-resolved', resolved);
  }

  function animateCount(elId, target) {
    const el = document.getElementById(elId);
    if (!el) return;
    el.dataset.to = target;
    if (el.classList.contains('count') && !el.classList.contains('in')) {
      return;
    }
    const current = parseInt(el.textContent) || 0;
    if (current === target) return;

    const duration = 500;
    const start = performance.now();

    function tick(now) {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = Math.round(current + (target - current) * eased);
      if (progress < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  function renderTickets() {
    const allTickets = getTickets();
    updateCounts(allTickets);

    // Apply Filter
    let filtered = allTickets;
    if (activeFilter !== 'all') {
      filtered = filtered.filter(t => t.status === activeFilter);
    }

    // Apply Search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(t =>
        t.subject.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.id.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q)
      );
    }

    grid.innerHTML = '';

    // Handle Empty States (Item 4: Clearly labelled sample ticket for new users)
    if (filtered.length === 0) {
      emptyState.hidden = false;
      if (allTickets.length === 0) {
        // First-time user: Show interactive sample preview
        emptyTitle.textContent = 'No tickets yet';
        emptyDesc.textContent = 'Submit your first complaint or piece of feedback and it will appear here.';
        if (sampleContainer) sampleContainer.hidden = false;
      } else {
        // Empty due to filter/search query mismatch
        emptyTitle.textContent = 'No matching tickets';
        emptyDesc.textContent = 'Try adjusting your search query or status filter.';
        if (sampleContainer) sampleContainer.hidden = true;
      }
      return;
    }

    emptyState.hidden = true;
    if (sampleContainer) sampleContainer.hidden = true;

    filtered.forEach(ticket => {
      const card = document.createElement('article');
      card.className = `ticket-card${ticket.urgent ? ' urgent' : ''}`;

      card.innerHTML = `
        <div class="ticket-header">
          <span class="ticket-id">${ticket.id}</span>
          <span class="ticket-category">${ticket.category}</span>
          ${ticket.urgent ? `
          <span class="ticket-urgent-badge">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="12" height="12" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
            Urgent
          </span>` : ''}
        </div>
        <div class="ticket-body">
          <h3>${ticket.subject}</h3>
          <p>${ticket.description}</p>
        </div>
        <div class="ticket-footer">
          <div class="ticket-meta">
            <span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              ${formatDate(ticket.createdAt)}
            </span>
          </div>
          <span class="status-badge ${ticket.status}">${ticket.status}</span>
        </div>
      `;

      grid.appendChild(card);
    });
  }

  // Filter clicks
  pills.forEach(pill => {
    pill.addEventListener('click', () => {
      pills.forEach(p => {
        p.classList.remove('active');
        p.setAttribute('aria-checked', 'false');
      });
      pill.classList.add('active');
      pill.setAttribute('aria-checked', 'true');
      activeFilter = pill.dataset.filter;
      renderTickets();
    });
  });

  // Search input
  let searchTimeout;
  searchInput.addEventListener('input', () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      searchQuery = searchInput.value.trim();
      renderTickets();
    }, 180);
  });

  renderTickets();
}

// ── Auth Modal with University Email Domain & Verification Flow ──────

function initAuthModal() {
  const overlay = document.getElementById('auth-modal');
  const openBtn = document.getElementById('auth-open-btn');
  const closeBtn = document.getElementById('auth-close-btn');
  if (!overlay || !openBtn) return;

  const tabs = overlay.querySelectorAll('.auth-tab');
  const panels = overlay.querySelectorAll('.auth-panel');
  const adminToggle = document.getElementById('admin-toggle-btn');
  const adminFormContainer = document.getElementById('admin-form-container');

  // Forms
  const registerForm = document.getElementById('register-form');
  const verifyForm = document.getElementById('verify-form');
  const loginForm = document.getElementById('login-form');
  const adminForm = document.getElementById('admin-login-form');

  // Temporary state for unverified registrations
  let pendingStudentRegistration = null;

  // Helper: set inline error inside modal
  function setModalError(input, errorElId, message) {
    if (input) input.classList.add('has-error');
    const err = document.getElementById(errorElId);
    if (err) {
      err.textContent = message;
      err.classList.add('visible');
    }
  }

  // Helper: clear inline error inside modal
  function clearModalError(input, errorElId) {
    if (input) input.classList.remove('has-error');
    const err = document.getElementById(errorElId);
    if (err) {
      err.textContent = '';
      err.classList.remove('visible');
    }
  }

  // Switch between tabs / panels
  function switchTab(targetId) {
    tabs.forEach(t => {
      const isActive = t.id === targetId;
      t.classList.toggle('active', isActive);
      t.setAttribute('aria-selected', String(isActive));
    });

    panels.forEach(p => {
      let shouldShow = false;
      if (targetId === 'tab-register') shouldShow = p.id === 'panel-register';
      else if (targetId === 'tab-login') shouldShow = p.id === 'panel-login';
      else if (targetId === 'tab-verify') shouldShow = p.id === 'panel-verify';
      p.classList.toggle('active', shouldShow);
    });
  }

  // Open modal
  function openModal() {
    overlay.classList.add('open');
    document.documentElement.classList.add('modal-open');
    document.body.classList.add('modal-open');
    document.body.style.overflow = 'hidden';
    const panel = overlay.querySelector('.modal-panel');
    if (panel) panel.scrollTop = 0;
    setTimeout(() => {
      const activePanel = overlay.querySelector('.auth-panel.active');
      const firstInput = activePanel?.querySelector('input');
      if (firstInput) firstInput.focus({ preventScroll: true });
    }, 250);
  }

  // Close modal
  function closeModal() {
    overlay.classList.remove('open');
    document.documentElement.classList.remove('modal-open');
    document.body.classList.remove('modal-open');
    document.body.style.overflow = '';
  }

  openBtn.addEventListener('click', openModal);
  closeBtn.addEventListener('click', closeModal);

  // Close on overlay click
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal();
  });

  // Close on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && overlay.classList.contains('open')) {
      closeModal();
    }
  });

  // Tab switching
  tabs.forEach(tab => {
    tab.addEventListener('click', () => switchTab(tab.id));
  });

  // Cross-panel links
  const switchToLogin = document.getElementById('switch-to-login');
  const switchToRegister = document.getElementById('switch-to-register');
  const backToRegBtn = document.getElementById('back-to-reg-btn');
  const resendCodeBtn = document.getElementById('resend-code-btn');

  if (switchToLogin) {
    switchToLogin.addEventListener('click', (e) => {
      e.preventDefault();
      switchTab('tab-login');
    });
  }
  if (switchToRegister) {
    switchToRegister.addEventListener('click', (e) => {
      e.preventDefault();
      switchTab('tab-register');
    });
  }
  if (backToRegBtn) {
    backToRegBtn.addEventListener('click', (e) => {
      e.preventDefault();
      switchTab('tab-register');
    });
  }
  if (resendCodeBtn) {
    resendCodeBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const targetEmail = pendingStudentRegistration?.email || 'your email';
      showToast(`New code sent to ${targetEmail} (Code: ${APP_CONFIG.DEMO_OTP})`);
    });
  }

  // Admin section toggle
  if (adminToggle && adminFormContainer) {
    adminToggle.addEventListener('click', () => {
      const isOpen = adminFormContainer.classList.toggle('active');
      adminToggle.textContent = isOpen ? 'Hide Admin Form' : 'Admin Sign In';
      if (isOpen) {
        adminToggle.insertAdjacentHTML('afterbegin',
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg> '
        );
        const firstInput = adminFormContainer.querySelector('input');
        if (firstInput) setTimeout(() => firstInput.focus(), 100);
      }
    });
  }

  // Password visibility toggles
  overlay.querySelectorAll('.password-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.dataset.target;
      const input = document.getElementById(targetId);
      if (!input) return;
      const isPassword = input.type === 'password';
      input.type = isPassword ? 'text' : 'password';
      btn.innerHTML = isPassword
        ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>'
        : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
    });
  });

  // 1. Student Registration Form (with University Email Domain Validation)
  if (registerForm) {
    const regName = registerForm.querySelector('#reg-name');
    const regMatric = registerForm.querySelector('#reg-matric');
    const regEmail = registerForm.querySelector('#reg-email');
    const regPassword = registerForm.querySelector('#reg-password');
    const regSubmitBtn = registerForm.querySelector('#reg-submit-btn');
    const regSpinner = registerForm.querySelector('#reg-spinner');
    const regBtnText = registerForm.querySelector('#reg-btn-text');

    regName.addEventListener('input', () => clearModalError(regName, 'reg-name-error'));
    regMatric.addEventListener('input', () => clearModalError(regMatric, 'reg-matric-error'));
    regEmail.addEventListener('input', () => clearModalError(regEmail, 'reg-email-error'));
    regPassword.addEventListener('input', () => clearModalError(regPassword, 'reg-password-error'));

    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      let hasError = false;
      let firstInvalid = null;

      const name = regName.value.trim();
      if (!name) {
        setModalError(regName, 'reg-name-error', 'Please enter your full name.');
        hasError = true;
        if (!firstInvalid) firstInvalid = regName;
      }

      const matric = regMatric.value.trim();
      if (!matric) {
        setModalError(regMatric, 'reg-matric-error', 'Please enter your student matric ID.');
        hasError = true;
        if (!firstInvalid) firstInvalid = regMatric;
      }

      const email = regEmail.value.trim();
      if (!email) {
        setModalError(regEmail, 'reg-email-error', 'Please enter your university email.');
        hasError = true;
        if (!firstInvalid) firstInvalid = regEmail;
      } else if (!isAllowedUniversityEmail(email)) {
        // Enforce OAU email domain
        setModalError(regEmail, 'reg-email-error', `Registration requires an official university email ending in ${APP_CONFIG.ALLOWED_EMAIL_DOMAINS[0]}`);
        hasError = true;
        if (!firstInvalid) firstInvalid = regEmail;
      }

      const password = regPassword.value;
      if (!password) {
        setModalError(regPassword, 'reg-password-error', 'Please create a password.');
        hasError = true;
        if (!firstInvalid) firstInvalid = regPassword;
      } else if (password.length < APP_CONFIG.MIN_PASSWORD_LENGTH) {
        setModalError(regPassword, 'reg-password-error', `Password must be at least ${APP_CONFIG.MIN_PASSWORD_LENGTH} characters.`);
        hasError = true;
        if (!firstInvalid) firstInvalid = regPassword;
      }

      if (hasError) {
        firstInvalid.focus();
        return;
      }

      // Button loading state
      regSubmitBtn.classList.add('btn-loading');
      regSubmitBtn.setAttribute('aria-busy', 'true');
      if (regSpinner) regSpinner.hidden = false;
      if (regBtnText) regBtnText.textContent = 'Sending Verification Code...';

      await new Promise(r => setTimeout(r, 450));

      // Store pending registration & transition to verification screen
      pendingStudentRegistration = { name, matric, email, password, role: 'student' };

      regSubmitBtn.classList.remove('btn-loading');
      regSubmitBtn.removeAttribute('aria-busy');
      if (regSpinner) regSpinner.hidden = true;
      if (regBtnText) regBtnText.textContent = 'Create Account';

      const targetEmailEl = document.getElementById('verify-target-email');
      if (targetEmailEl) targetEmailEl.textContent = email;

      switchTab('tab-verify');
      showToast(`Verification code sent to ${email}`);

      const codeInput = document.getElementById('verify-code');
      if (codeInput) {
        codeInput.value = '';
        setTimeout(() => codeInput.focus(), 150);
      }
    });
  }

  // 2. Email Verification Form
  if (verifyForm) {
    const codeInput = verifyForm.querySelector('#verify-code');
    const verifySubmitBtn = verifyForm.querySelector('#verify-submit-btn');
    const verifySpinner = verifyForm.querySelector('#verify-spinner');
    const verifyBtnText = verifyForm.querySelector('#verify-btn-text');

    codeInput.addEventListener('input', () => clearModalError(codeInput, 'verify-code-error'));

    verifyForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const code = codeInput.value.trim();
      if (!code) {
        setModalError(codeInput, 'verify-code-error', 'Please enter the 6-digit verification code.');
        codeInput.focus();
        return;
      }

      // Accept the demo OTP or any 6-digit code for testing
      if (code !== APP_CONFIG.DEMO_OTP && code.length !== 6) {
        setModalError(codeInput, 'verify-code-error', `Invalid code. For this prototype, use code: ${APP_CONFIG.DEMO_OTP}`);
        codeInput.focus();
        return;
      }

      // Verification loading state
      verifySubmitBtn.classList.add('btn-loading');
      verifySubmitBtn.setAttribute('aria-busy', 'true');
      if (verifySpinner) verifySpinner.hidden = false;
      if (verifyBtnText) verifyBtnText.textContent = 'Activating Account...';

      await new Promise(r => setTimeout(r, 450));

      const verifiedUser = {
        ...(pendingStudentRegistration || {
          name: 'Student',
          matric: 'CSC/2021/042',
          email: 'student@student.oauife.edu.ng'
        }),
        verified: true,
        createdAt: new Date().toISOString()
      };

      localStorage.setItem('campulse_user', JSON.stringify(verifiedUser));

      verifySubmitBtn.classList.remove('btn-loading');
      verifySubmitBtn.removeAttribute('aria-busy');
      if (verifySpinner) verifySpinner.hidden = true;
      if (verifyBtnText) verifyBtnText.textContent = 'Verify & Activate Account';

      showToast(`Account verified! Welcome to CamPulse, ${verifiedUser.name}!`);
      closeModal();
      registerForm?.reset();
      verifyForm?.reset();
      switchTab('tab-login');
    });
  }

  // 3. Student Login Form
  if (loginForm) {
    const loginEmail = loginForm.querySelector('#login-email');
    const loginPassword = loginForm.querySelector('#login-password');
    const loginSubmitBtn = loginForm.querySelector('#login-submit-btn');
    const loginSpinner = loginForm.querySelector('#login-spinner');
    const loginBtnText = loginForm.querySelector('#login-btn-text');

    loginEmail.addEventListener('input', () => clearModalError(loginEmail, 'login-email-error'));
    loginPassword.addEventListener('input', () => clearModalError(loginPassword, 'login-password-error'));

    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const email = loginEmail.value.trim();
      const password = loginPassword.value;

      if (!email) {
        setModalError(loginEmail, 'login-email-error', 'Please enter your university email.');
        loginEmail.focus();
        return;
      }
      if (!password) {
        setModalError(loginPassword, 'login-password-error', 'Please enter your password.');
        loginPassword.focus();
        return;
      }

      loginSubmitBtn.classList.add('btn-loading');
      loginSubmitBtn.setAttribute('aria-busy', 'true');
      if (loginSpinner) loginSpinner.hidden = false;
      if (loginBtnText) loginBtnText.textContent = 'Signing In...';

      await new Promise(r => setTimeout(r, 400));

      loginSubmitBtn.classList.remove('btn-loading');
      loginSubmitBtn.removeAttribute('aria-busy');
      if (loginSpinner) loginSpinner.hidden = true;
      if (loginBtnText) loginBtnText.textContent = 'Sign In';

      const stored = JSON.parse(localStorage.getItem('campulse_user') || '{}');
      if (stored.email && stored.email.toLowerCase() === email.toLowerCase()) {
        showToast(`Welcome back, ${stored.name}!`);
      } else {
        showToast('Signed in successfully!');
      }

      closeModal();
      loginForm.reset();
    });
  }

  // 4. Admin Sign In Form
  if (adminForm) {
    adminForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const adminIdInput = adminForm.querySelector('#admin-id');
      const adminPasswordInput = adminForm.querySelector('#admin-password');
      const submitBtn = adminForm.querySelector('button[type="submit"]');

      const adminId = adminIdInput.value.trim();
      const password = adminPasswordInput.value;

      if (!adminId || !password) {
        showToast('Please enter your Admin/Staff ID and password.');
        return;
      }

      submitBtn.classList.add('btn-loading');
      await new Promise(r => setTimeout(r, 400));
      submitBtn.classList.remove('btn-loading');

      showToast(`Staff account ${adminId} authenticated successfully!`);
      closeModal();
      adminForm.reset();
      if (adminFormContainer) adminFormContainer.classList.remove('active');
    });
  }
}

// ── Reveal-on-Scroll & Animated Counters ─────────────────────────────

function initRevealAnimations() {
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    e.target.classList.add('in');
    if (e.target.matches('.count')) {
      const to = +e.target.dataset.to, t0 = performance.now(), dur = 2000;
      const tick = t => {
        const p = Math.min((t - t0) / dur, 1);
        e.target.textContent = Math.floor(to * (1 - Math.pow(1 - p, 3)));
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }
    io.unobserve(e.target);
  }), { threshold: 0.2 });
  document.querySelectorAll('.reveal, .count').forEach(el => io.observe(el));
}

// ── Interactive Button Glow (Follows Mouse Position) ─────────────────

function initButtonGlow() {
  document.addEventListener('mousemove', (e) => {
    const btn = e.target.closest('.btn, .nav-auth-btn');
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width * 100).toFixed(1);
    const y = ((e.clientY - rect.top) / rect.height * 100).toFixed(1);
    btn.style.setProperty('--mouse-x', x + '%');
    btn.style.setProperty('--mouse-y', y + '%');
  });
}

// ── Initialize App on DOM Ready ──────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  initHeaderScroll();
  initMobileNav();
  initLiveStats();
  initSubmitForm();
  initDashboard();
  initAuthModal();
  initRevealAnimations();
  initButtonGlow();
});
