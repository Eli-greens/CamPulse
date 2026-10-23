/* ===================================================================
   CamPulse — Vanilla JavaScript
   Handles: form submission, localStorage persistence, dashboard
   rendering, filtering, search, toasts, and mobile nav.
   =================================================================== */

'use strict';

// ── Helpers ──────────────────────────────────────────────────────────

/** Generate a short readable ticket ID like CP-8A3F */
function generateId() {
  const hex = Math.random().toString(16).substring(2, 6).toUpperCase();
  return `CP-${hex}`;
}

/** Format an ISO date string into a human-readable form */
function formatDate(iso) {
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

  // Close when clicking a link
  nav.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      nav.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
    });
  });
}

// ── Submission Form (index.html) ─────────────────────────────────────

function initSubmitForm() {
  const form = document.getElementById('complaint-form');
  if (!form) return; // Not on the submit page

  const description = document.getElementById('description');
  const charCount = document.getElementById('char-count');
  const charCounter = document.getElementById('char-counter');
  const urgencyCheckbox = document.getElementById('urgency');
  const urgencyState = document.getElementById('urgency-state');
  const formCard = document.getElementById('form-card');
  const successMsg = document.getElementById('success-msg');
  const successTicketId = document.getElementById('success-ticket-id');
  const newComplaintBtn = document.getElementById('new-complaint-btn');

  // Character counter
  description.addEventListener('input', () => {
    const len = description.value.length;
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

  // Form submission
  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const category = form.category.value;
    const subject = form.subject.value.trim();
    const desc = form.description.value.trim();
    const urgent = form.urgency.checked;

    // Basic validation
    if (!category || !subject || !desc) {
      showToast('Please fill in all required fields.');
      return;
    }

    // Randomly assign a demo status (mostly Pending for realism)
    const statuses = ['pending', 'pending', 'pending', 'reviewed', 'resolved'];
    const status = statuses[Math.floor(Math.random() * statuses.length)];

    const ticket = {
      id: generateId(),
      category,
      subject,
      description: desc,
      urgent,
      status,
      createdAt: new Date().toISOString(),
    };

    const tickets = getTickets();
    tickets.unshift(ticket);
    saveTickets(tickets);

    // Show success state
    form.hidden = true;
    successMsg.hidden = false;
    successTicketId.textContent = ticket.id;

    showToast(`Ticket ${ticket.id} created successfully!`);
  });

  // "Submit another" button
  newComplaintBtn.addEventListener('click', () => {
    form.reset();
    charCount.textContent = '0';
    charCounter.classList.remove('warn', 'limit');
    urgencyState.textContent = 'Normal';
    urgencyState.classList.remove('on');
    successMsg.hidden = true;
    form.hidden = false;
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
  const pills = document.querySelectorAll('.pill[data-filter]');

  let activeFilter = 'all';
  let searchQuery = '';

  // ── Clean up legacy dummy/demo tickets if present ──
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
    // If not yet revealed by intersection observer, let io handle initial count animation
    if (el.classList.contains('count') && !el.classList.contains('in')) {
      return;
    }
    const current = parseInt(el.textContent) || 0;
    if (current === target) return;

    const duration = 500;
    const start = performance.now();

    function tick(now) {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      el.textContent = Math.round(current + (target - current) * eased);
      if (progress < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  function renderTickets() {
    const allTickets = getTickets();
    updateCounts(allTickets);

    // Filter
    let filtered = allTickets;
    if (activeFilter !== 'all') {
      filtered = filtered.filter(t => t.status === activeFilter);
    }

    // Search
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

    if (filtered.length === 0) {
      emptyState.hidden = false;
      if (searchQuery || activeFilter !== 'all') {
        emptyTitle.textContent = 'No matching tickets';
        emptyDesc.textContent = 'Try adjusting your search or filters.';
      } else {
        emptyTitle.textContent = 'No tickets yet';
        emptyDesc.textContent = 'Submit your first complaint or piece of feedback and it will appear here.';
      }
      return;
    }

    emptyState.hidden = true;

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

  // Filter pill clicks
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

  // Search
  let searchTimeout;
  searchInput.addEventListener('input', () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      searchQuery = searchInput.value.trim();
      renderTickets();
    }, 200);
  });

  // Initial render
  renderTickets();
}

// ── Auth Modal ───────────────────────────────────────────────────────

function initAuthModal() {
  const overlay = document.getElementById('auth-modal');
  const openBtn = document.getElementById('auth-open-btn');
  const closeBtn = document.getElementById('auth-close-btn');
  if (!overlay || !openBtn) return;

  const tabs = overlay.querySelectorAll('.auth-tab');
  const panels = overlay.querySelectorAll('.auth-panel');
  const adminToggle = document.getElementById('admin-toggle-btn');
  const adminFormContainer = document.getElementById('admin-form-container');

  // Helper: switch tab
  function switchTab(targetId) {
    tabs.forEach(t => {
      const isActive = t.id === targetId;
      t.classList.toggle('active', isActive);
      t.setAttribute('aria-selected', String(isActive));
    });
    panels.forEach(p => {
      p.classList.toggle('active', p.id === (targetId === 'tab-register' ? 'panel-register' : 'panel-login'));
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
    // Focus the first input in the active panel without triggering unwanted scroll jump
    setTimeout(() => {
      const activePanel = overlay.querySelector('.auth-panel.active');
      const firstInput = activePanel?.querySelector('input');
      if (firstInput) firstInput.focus({ preventScroll: true });
    }, 300);
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

  // Prevent wheel event from chaining to background document while scrolling inside modal panel
  const panel = overlay.querySelector('.modal-panel');
  if (panel) {
    panel.addEventListener('wheel', (e) => {
      e.stopPropagation();
    }, { passive: true });
  }

  // Close on overlay click (not panel)
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal();
  });

  // Close on Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && overlay.classList.contains('open')) {
      closeModal();
    }
  });

  // Tab switching
  tabs.forEach(tab => {
    tab.addEventListener('click', () => switchTab(tab.id));
  });

  // In-panel links "Sign in" / "Register"
  const switchToLogin = document.getElementById('switch-to-login');
  const switchToRegister = document.getElementById('switch-to-register');

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

  // Admin section toggle
  if (adminToggle && adminFormContainer) {
    adminToggle.addEventListener('click', () => {
      const isOpen = adminFormContainer.classList.toggle('active');
      adminToggle.textContent = isOpen ? 'Hide Admin Form' : 'Admin Sign In';
      if (isOpen) {
        // Re-add SVG icon to button
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
      // Swap icon
      btn.innerHTML = isPassword
        ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>'
        : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
    });
  });

  // Student Registration form
  const registerForm = document.getElementById('register-form');
  if (registerForm) {
    registerForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = registerForm.querySelector('#reg-name').value.trim();
      const matric = registerForm.querySelector('#reg-matric').value.trim();
      const email = registerForm.querySelector('#reg-email').value.trim();
      const password = registerForm.querySelector('#reg-password').value;

      if (!name || !matric || !email || !password) {
        showToast('Please fill in all registration fields.');
        return;
      }
      if (password.length < 8) {
        showToast('Password must be at least 8 characters.');
        return;
      }

      // Store user (demo — localStorage)
      const user = { name, matric, email, role: 'student', createdAt: new Date().toISOString() };
      localStorage.setItem('campulse_user', JSON.stringify(user));

      showToast(`Welcome, ${name}! Account created.`);
      closeModal();
      registerForm.reset();
    });
  }

  // Student Login form
  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const email = loginForm.querySelector('#login-email').value.trim();
      const password = loginForm.querySelector('#login-password').value;

      if (!email || !password) {
        showToast('Please enter your email and password.');
        return;
      }

      // Demo check
      const stored = JSON.parse(localStorage.getItem('campulse_user') || '{}');
      if (stored.email && stored.email === email) {
        showToast(`Welcome back, ${stored.name}!`);
      } else {
        showToast('Signed in successfully!');
      }
      closeModal();
      loginForm.reset();
    });
  }

  // Admin Login form
  const adminForm = document.getElementById('admin-login-form');
  if (adminForm) {
    adminForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const adminId = adminForm.querySelector('#admin-id').value.trim();
      const password = adminForm.querySelector('#admin-password').value;

      if (!adminId || !password) {
        showToast('Please enter your Admin ID and password.');
        return;
      }

      showToast(`Admin ${adminId} signed in successfully!`);
      closeModal();
      adminForm.reset();
      if (adminFormContainer) adminFormContainer.classList.remove('active');
    });
  }
}

// ── Reveal-on-scroll & animated counters ─────────────────────────────

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

// ── Interactive button glow (follows mouse) ──────────────────────────

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

// ── Init ─────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  initHeaderScroll();
  initMobileNav();
  initSubmitForm();
  initDashboard();
  initAuthModal();
  initRevealAnimations();
  initButtonGlow();
});
