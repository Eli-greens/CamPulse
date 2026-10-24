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

// ── Submission Form with Location, Attachments & Anonymity (Phase 2) ─

function initSubmitForm() {
  const form = document.getElementById('complaint-form');
  if (!form) return; // Not on the submission page

  const categoryInput = form.category;
  const locationZoneInput = form.locationZone;
  const locationDetailsInput = form.locationDetails;
  const subjectInput = form.subject;
  const descInput = form.description;
  const urgencyCheckbox = document.getElementById('urgency');
  const urgencyState = document.getElementById('urgency-state');
  const anonymousCheckbox = document.getElementById('is-anonymous');
  const isPublicCheckbox = document.getElementById('is-public');
  const charCount = document.getElementById('char-count');
  const charCounter = document.getElementById('char-counter');
  const submitBtn = document.getElementById('submit-btn');
  const submitSpinner = document.getElementById('submit-spinner');
  const submitIcon = document.getElementById('submit-icon');
  const submitText = document.getElementById('submit-text');
  const successMsg = document.getElementById('success-msg');
  const successTicketId = document.getElementById('success-ticket-id');
  const newComplaintBtn = document.getElementById('new-complaint-btn');

  // Phase 3 elements: Category suggestion & Duplicate detection
  const categorySuggestionBadge = document.getElementById('category-suggestion-badge');
  const suggestedCategoryName = document.getElementById('suggested-category-name');
  const applyCategoryBtn = document.getElementById('apply-category-btn');
  const duplicateBox = document.getElementById('duplicate-preview-box');
  const duplicateList = document.getElementById('duplicate-cards-list');

  // Attachments elements (Phase 2 Item 8)
  const attachmentsInput = document.getElementById('attachments-input');
  const fileDropzone = document.getElementById('file-dropzone');
  const previewList = document.getElementById('attachments-preview-list');
  const attachmentsError = document.getElementById('attachments-error');

  let selectedFiles = [];

  // Helper: clear inline error
  function clearError(input, errorElId) {
    if (input) input.classList.remove('has-error');
    const err = document.getElementById(errorElId);
    if (err) {
      err.textContent = '';
      err.classList.remove('visible');
    }
  }

  // Helper: display inline error
  function setError(input, errorElId, message) {
    if (input) input.classList.add('has-error');
    const err = document.getElementById(errorElId);
    if (err) {
      err.textContent = message;
      err.classList.add('visible');
    }
  }

  // Format file size
  function formatBytes(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  }

  // Render attachment previews
  function renderAttachmentPreviews() {
    if (!previewList) return;
    previewList.innerHTML = '';

    selectedFiles.forEach((file, index) => {
      const chip = document.createElement('div');
      chip.className = 'preview-chip';

      const isImage = file.type.startsWith('image/');
      let thumbHtml = '';

      if (isImage) {
        const objectUrl = URL.createObjectURL(file);
        thumbHtml = `<img src="${objectUrl}" alt="Preview" class="preview-thumb" />`;
      } else {
        thumbHtml = `
          <div class="preview-doc-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
            </svg>
          </div>
        `;
      }

      chip.innerHTML = `
        ${thumbHtml}
        <div class="preview-info">
          <span class="preview-name" title="${file.name}">${file.name}</span>
          <span class="preview-size">${formatBytes(file.size)}</span>
        </div>
        <button type="button" class="preview-remove-btn" aria-label="Remove ${file.name}" data-index="${index}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" width="14" height="14">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      `;

      previewList.appendChild(chip);
    });

    // Remove buttons handler
    previewList.querySelectorAll('.preview-remove-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = parseInt(btn.dataset.index, 10);
        selectedFiles.splice(idx, 1);
        renderAttachmentPreviews();
        clearError(null, 'attachments-error');
      });
    });
  }

  // Validate and add files
  function handleFiles(files) {
    clearError(null, 'attachments-error');
    const newFiles = Array.from(files);

    if (selectedFiles.length + newFiles.length > 3) {
      setError(null, 'attachments-error', 'Maximum 3 files allowed per ticket. Please remove excess files.');
      return;
    }

    for (const file of newFiles) {
      if (file.size > 5 * 1024 * 1024) {
        setError(null, 'attachments-error', `"${file.name}" exceeds 5MB size limit. Please choose a smaller file.`);
        return;
      }
      const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
      if (!validTypes.includes(file.type) && !file.name.toLowerCase().endsWith('.pdf')) {
        setError(null, 'attachments-error', `"${file.name}" is not a supported format. Please upload JPG, PNG, WEBP, or PDF.`);
        return;
      }
      selectedFiles.push(file);
    }

    renderAttachmentPreviews();
  }

  // Setup file picker events
  if (fileDropzone && attachmentsInput) {
    fileDropzone.addEventListener('click', () => attachmentsInput.click());
    fileDropzone.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        attachmentsInput.click();
      }
    });

    attachmentsInput.addEventListener('change', () => {
      if (attachmentsInput.files.length) {
        handleFiles(attachmentsInput.files);
        attachmentsInput.value = ''; // Allow re-selecting same file
      }
    });

    // Drag and drop handlers
    fileDropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      fileDropzone.classList.add('dragover');
    });

    fileDropzone.addEventListener('dragleave', () => {
      fileDropzone.classList.remove('dragover');
    });

    fileDropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      fileDropzone.classList.remove('dragover');
      if (e.dataTransfer.files && e.dataTransfer.files.length) {
        handleFiles(e.dataTransfer.files);
      }
    });
  }

  // Clear errors on user input & Phase 3 integrations
  if (categoryInput) {
    categoryInput.addEventListener('change', () => {
      clearError(categoryInput, 'category-error');
      if (categorySuggestionBadge && suggestedCategoryName && categoryInput.value === suggestedCategoryName.textContent) {
        categorySuggestionBadge.hidden = true;
      }
      // Safety concerns are kept private by default unless student opts in (Phase 3 Item 14)
      if (categoryInput.value === 'Safety' && isPublicCheckbox) {
        isPublicCheckbox.checked = false;
        showToast('Safety & Security reports are private by default for your privacy.');
      }
    });
  }

  // Category auto-suggestion from description (Phase 3 Item 17)
  let suggestTimer = null;
  function triggerCategorySuggestion() {
    clearTimeout(suggestTimer);
    suggestTimer = setTimeout(() => {
      if (!descInput || !window.CamPulseDB) return;
      const text = descInput.value;
      if (!text || text.length < 6) {
        if (categorySuggestionBadge) categorySuggestionBadge.hidden = true;
        return;
      }
      const suggested = window.CamPulseDB.suggestCategory(text);
      if (suggested && (!categoryInput.value || categoryInput.value !== suggested)) {
        if (suggestedCategoryName) suggestedCategoryName.textContent = suggested;
        if (categorySuggestionBadge) categorySuggestionBadge.hidden = false;
      } else {
        if (categorySuggestionBadge) categorySuggestionBadge.hidden = true;
      }
    }, 300);
  }

  if (applyCategoryBtn) {
    applyCategoryBtn.addEventListener('click', () => {
      if (suggestedCategoryName && suggestedCategoryName.textContent) {
        categoryInput.value = suggestedCategoryName.textContent;
        clearError(categoryInput, 'category-error');
        if (categorySuggestionBadge) categorySuggestionBadge.hidden = true;
        showToast(`Category set to ${categoryInput.value}`);
      }
    });
  }

  // Duplicate detection debouncer (Phase 3 Item 16)
  let duplicateTimer = null;
  function triggerDuplicateSearch() {
    clearTimeout(duplicateTimer);
    duplicateTimer = setTimeout(async () => {
      if (!duplicateBox || !duplicateList || !window.CamPulseDB) return;
      const subj = subjectInput ? subjectInput.value.trim() : '';
      const desc = descInput ? descInput.value.trim() : '';
      const query = `${subj} ${desc}`.trim();
      const locZone = locationZoneInput ? locationZoneInput.value : '';

      if (query.length < 6) {
        duplicateBox.hidden = true;
        duplicateList.innerHTML = '';
        return;
      }

      const duplicates = await window.CamPulseDB.searchDuplicates(query, locZone);
      if (!duplicates || duplicates.length === 0) {
        duplicateBox.hidden = true;
        duplicateList.innerHTML = '';
        return;
      }

      duplicateBox.hidden = false;
      duplicateList.innerHTML = duplicates.map(t => {
        const hasUpvoted = window.CamPulseDB.hasUserUpvoted(t.id);
        return `
          <div class="duplicate-item-card" data-ticket-id="${t.id}">
            <div class="duplicate-item-info">
              <div class="duplicate-item-title">${t.subject}</div>
              <div class="duplicate-item-meta">
                <span>${t.id}</span>
                <span>•</span>
                <span>${t.category}</span>
                <span>•</span>
                <span>${t.locationZone || 'Campus'}</span>
              </div>
            </div>
            <div class="duplicate-item-actions">
              <button type="button" class="upvote-btn duplicate-upvote-btn ${hasUpvoted ? 'has-upvoted' : ''}" data-ticket-id="${t.id}" aria-label="Upvote this existing issue">
                <svg class="upvote-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/>
                </svg>
                <span class="upvote-text">Me Too</span>
                <span class="upvote-count">${t.upvotesCount || 0}</span>
              </button>
              <a href="ticket.html?id=${encodeURIComponent(t.id)}" class="btn btn-secondary btn-sm" target="_blank">View</a>
            </div>
          </div>
        `;
      }).join('');
    }, 350);
  }

  if (locationZoneInput) {
    locationZoneInput.addEventListener('change', () => {
      clearError(locationZoneInput, 'location-zone-error');
      triggerDuplicateSearch();
    });
  }
  if (subjectInput) {
    subjectInput.addEventListener('input', () => {
      clearError(subjectInput, 'subject-error');
      triggerDuplicateSearch();
    });
  }
  if (descInput) {
    descInput.addEventListener('input', () => {
      clearError(descInput, 'description-error');
      const len = descInput.value.length;
      charCount.textContent = len;
      charCounter.classList.remove('warn', 'limit');
      if (len >= 2000) charCounter.classList.add('limit');
      else if (len >= 1800) charCounter.classList.add('warn');
      triggerCategorySuggestion();
      triggerDuplicateSearch();
    });
  }

  // Urgency toggle label
  if (urgencyCheckbox && urgencyState) {
    urgencyCheckbox.addEventListener('change', () => {
      const isUrgent = urgencyCheckbox.checked;
      urgencyState.textContent = isUrgent ? 'Urgent' : 'Normal';
      urgencyState.classList.toggle('on', isUrgent);
    });
  }

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

    // Validate Location Zone (Phase 2 Item 9)
    if (!locationZoneInput.value) {
      setError(locationZoneInput, 'location-zone-error', 'Please select the campus building or hostel.');
      hasError = true;
      if (!firstInvalid) firstInvalid = locationZoneInput;
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
    if (submitText) submitText.textContent = 'Submitting & Routing Ticket...';

    try {
      const payload = {
        category: categoryInput.value,
        locationZone: locationZoneInput.value,
        locationDetails: locationDetailsInput ? locationDetailsInput.value : '',
        subject,
        description: desc,
        urgent: urgencyCheckbox ? urgencyCheckbox.checked : false,
        isAnonymous: anonymousCheckbox ? anonymousCheckbox.checked : false,
        isPublic: isPublicCheckbox ? isPublicCheckbox.checked : true
      };

      // Create ticket via database abstraction layer
      const createdTicket = await window.CamPulseDB.createTicket(payload, selectedFiles);

      // Reset button state
      submitBtn.classList.remove('btn-loading');
      submitBtn.removeAttribute('aria-busy');
      if (submitSpinner) submitSpinner.hidden = true;
      if (submitIcon) submitIcon.style.display = '';
      if (submitText) submitText.textContent = 'Submit Complaint';

      // Show success view
      form.hidden = true;
      successMsg.hidden = false;
      successTicketId.textContent = createdTicket.id;

      // Provide direct link to view the ticket
      const viewDashboardBtn = successMsg.querySelector('a.btn-primary');
      if (viewDashboardBtn) {
        viewDashboardBtn.href = `ticket.html?id=${encodeURIComponent(createdTicket.id)}`;
        viewDashboardBtn.textContent = 'Track Ticket Details →';
      }

      showToast(`Ticket ${createdTicket.id} created and routed successfully!`);
      initLiveStats();
    } catch (err) {
      console.error('[CamPulse] Ticket creation failed:', err);
      submitBtn.classList.remove('btn-loading');
      submitBtn.removeAttribute('aria-busy');
      if (submitSpinner) submitSpinner.hidden = true;
      if (submitIcon) submitIcon.style.display = '';
      if (submitText) submitText.textContent = 'Submit Complaint';
      showToast('Error submitting ticket. Please try again.');
    }
  });

  // "Submit Another" button
  newComplaintBtn.addEventListener('click', () => {
    form.reset();
    selectedFiles = [];
    renderAttachmentPreviews();
    if (isPublicCheckbox) isPublicCheckbox.checked = true;
    if (categorySuggestionBadge) categorySuggestionBadge.hidden = true;
    if (duplicateBox) {
      duplicateBox.hidden = true;
      duplicateList.innerHTML = '';
    }
    clearError(categoryInput, 'category-error');
    clearError(locationZoneInput, 'location-zone-error');
    clearError(subjectInput, 'subject-error');
    clearError(descInput, 'description-error');
    clearError(null, 'attachments-error');
    charCount.textContent = '0';
    charCounter.classList.remove('warn', 'limit');
    if (urgencyState) {
      urgencyState.textContent = 'Normal';
      urgencyState.classList.remove('on');
    }
    successMsg.hidden = true;
    form.hidden = false;
    categoryInput.focus();
  });
}

// ── Dashboard (dashboard.html) with Phase 2 Badges & Routing ─────────

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

  function updateCounts(tickets) {
    const total = tickets.length;
    const pending = tickets.filter(t => t.status === 'pending').length;
    const assigned = tickets.filter(t => t.status === 'assigned').length;
    const inProgress = tickets.filter(t => t.status === 'in_progress').length;
    const resolved = tickets.filter(t => t.status === 'resolved').length;

    animateCount('count-total', total);
    animateCount('count-pending', pending);
    animateCount('count-reviewed', assigned + inProgress); // Keep metric card active
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

    const duration = 450;
    const start = performance.now();

    function tick(now) {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = Math.round(current + (target - current) * eased);
      if (progress < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  async function renderTickets() {
    const allTickets = await window.CamPulseDB.fetchAllTickets();
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
        (t.subject && t.subject.toLowerCase().includes(q)) ||
        (t.description && t.description.toLowerCase().includes(q)) ||
        (t.id && t.id.toLowerCase().includes(q)) ||
        (t.category && t.category.toLowerCase().includes(q)) ||
        (t.locationZone && t.locationZone.toLowerCase().includes(q))
      );
    }

    grid.innerHTML = '';

    // Handle Empty States
    if (filtered.length === 0) {
      emptyState.hidden = false;
      if (allTickets.length === 0) {
        emptyTitle.textContent = 'No tickets yet';
        emptyDesc.textContent = 'Submit your first complaint or piece of feedback and it will appear here.';
        if (sampleContainer) sampleContainer.hidden = false;
      } else {
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

      const attachCount = Array.isArray(ticket.attachments) ? ticket.attachments.length : 0;
      const commentCount = Array.isArray(ticket.comments) ? ticket.comments.length : 0;

      card.innerHTML = `
        <div class="ticket-header">
          <div class="ticket-id-wrap">
            <span class="ticket-id">${ticket.id}</span>
          </div>
          <div style="display:flex;gap:.4rem;flex-wrap:wrap;align-items:center;">
            <span class="ticket-category">${ticket.category}</span>
            ${ticket.isAnonymous ? `
            <span class="ticket-anonymous-badge" title="Identity protected from department staff">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="12" height="12"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              Anonymous
            </span>` : ''}
            ${ticket.urgent ? `
            <span class="ticket-urgent-badge">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="12" height="12" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
              Urgent
            </span>` : ''}
          </div>
        </div>
        <div class="ticket-body">
          <h3><a href="ticket.html?id=${encodeURIComponent(ticket.id)}" style="color:inherit;text-decoration:none;">${ticket.subject}</a></h3>
          <p>${ticket.description}</p>
          <div class="ticket-card-chips">
            ${ticket.locationZone ? `<span class="card-chip">📍 ${ticket.locationZone}</span>` : ''}
            ${attachCount > 0 ? `<span class="card-chip">📎 ${attachCount} Evidence ${attachCount === 1 ? 'file' : 'files'}</span>` : ''}
            ${commentCount > 0 ? `<span class="card-chip">💬 ${commentCount} ${commentCount === 1 ? 'reply' : 'replies'}</span>` : ''}
          </div>
        </div>
        <div class="ticket-footer">
          <div class="ticket-meta">
            <span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              ${formatDate(ticket.createdAt)}
            </span>
          </div>
          <div style="display:flex;gap:.6rem;align-items:center;">
            <span class="status-badge ${ticket.status}">${ticket.status.replace('_', ' ')}</span>
            <a href="ticket.html?id=${encodeURIComponent(ticket.id)}" class="btn btn-secondary btn-sm" aria-label="View details for ${ticket.id}">
              Details &rarr;
            </a>
          </div>
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
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        searchQuery = searchInput.value.trim();
        renderTickets();
      }, 180);
    });
  }

  renderTickets();
}

// ── Ticket Detail Page (ticket.html) with Timeline, Comments & Rating ─

async function initTicketDetail() {
  const detailContainer = document.getElementById('ticket-detail-view');
  if (!detailContainer) return; // Not on the ticket detail page

  const loadingEl = document.getElementById('ticket-loading');
  const notFoundEl = document.getElementById('ticket-not-found');

  // Parse URL param ?id=... or ?demo=sample
  const params = new URLSearchParams(window.location.search);
  const ticketIdParam = params.get('id');
  const isDemoParam = params.get('demo') === 'sample';

  let ticket = null;

  if (isDemoParam) {
    // Generate realistic sample ticket with all Phase 2 features for demo & testing
    ticket = {
      id: 'CP-2026-0042',
      category: 'Facilities',
      department: 'Division of Works & Maintenance Services',
      locationZone: 'Fajuyi Hall (Male)',
      locationDetails: 'Block 2, Second Floor Riser Pipe',
      subject: 'Severe water supply disruption at Fajuyi Hall Block 2',
      description: 'Tap water supply has been completely unavailable on the 2nd and 3rd floors since Thursday morning. Students are currently carrying buckets from the ground floor pump station. Plumbing inspection and pressure valve repair are urgently required.',
      urgent: true,
      isAnonymous: true,
      studentName: 'Bamidele Adeyemi',
      studentMatric: 'CVE/2021/089',
      studentEmail: 'adeyemi@student.oauife.edu.ng',
      status: 'resolved',
      createdAt: new Date(Date.now() - 3600000 * 48).toISOString(),
      resolvedAt: new Date(Date.now() - 3600000 * 6).toISOString(),
      attachments: [
        {
          id: 'att-demo-1',
          name: 'dry_tap_block2.jpg',
          size: 1420000,
          type: 'image/jpeg',
          url: 'favicon-512x512.png'
        },
        {
          id: 'att-demo-2',
          name: 'water_maintenance_report.pdf',
          size: 480000,
          type: 'application/pdf',
          url: '#'
        }
      ],
      timeline: [
        {
          step: 'submitted',
          title: 'Complaint Submitted',
          timestamp: new Date(Date.now() - 3600000 * 48).toISOString(),
          actor: 'Anonymous Student',
          note: 'Logged with Urgent Priority. Identity secured for super-admin audit only.'
        },
        {
          step: 'assigned',
          title: 'Auto-Assigned to Works & Maintenance',
          timestamp: new Date(Date.now() - 3600000 * 47.5).toISOString(),
          actor: 'System Auto-Router',
          note: 'Categorized under Facilities. Urgent SLA threshold: 24 Hours.'
        },
        {
          step: 'in_progress',
          title: 'Maintenance Crew Dispatched',
          timestamp: new Date(Date.now() - 3600000 * 26).toISOString(),
          actor: 'Engr. O. Kolawole (Works Dept)',
          note: 'Inspection confirmed cracked riser valve on 2nd floor. Replacement parts requested from central store.'
        },
        {
          step: 'resolved',
          title: 'Valve Replaced & Water Restored',
          timestamp: new Date(Date.now() - 3600000 * 6).toISOString(),
          actor: 'Division of Works Desk Officer',
          note: 'High-pressure riser valve installed. Both 2nd and 3rd floor taps tested and pumping normally.'
        }
      ],
      comments: [
        {
          id: 'cm-1',
          authorName: 'Engr. O. Kolawole',
          authorRole: 'staff',
          message: 'Hello, our plumbing unit has inspected the riser near room 214. The main gate valve had seized. We have isolated the pipe and are installing a brass replacement today.',
          createdAt: new Date(Date.now() - 3600000 * 24).toISOString()
        },
        {
          id: 'cm-2',
          authorName: 'Anonymous Student',
          authorRole: 'student',
          message: 'Thank you for the quick inspection! Please also check the connection to the 3rd floor cisterns while working on it.',
          createdAt: new Date(Date.now() - 3600000 * 18).toISOString()
        },
        {
          id: 'cm-3',
          authorName: 'Division of Works Desk Officer',
          authorRole: 'staff',
          message: 'The work is now complete and water is flowing on both floors. Please verify and confirm if the issue is completely resolved.',
          createdAt: new Date(Date.now() - 3600000 * 6).toISOString()
        }
      ],
      rating: null,
      ratingComment: '',
      reopenCount: 0
    };
  } else if (ticketIdParam) {
    ticket = await window.CamPulseDB.fetchTicketById(ticketIdParam);
  }

  // Not found
  if (!ticket) {
    if (loadingEl) loadingEl.hidden = true;
    if (notFoundEl) notFoundEl.hidden = false;
    return;
  }

  // Found: hide loading, show content
  if (loadingEl) loadingEl.hidden = true;
  detailContainer.hidden = false;

  // Breadcrumb
  const breadcrumbId = document.getElementById('ticket-breadcrumb-id');
  if (breadcrumbId) breadcrumbId.textContent = ticket.id;

  // Header Elements
  const idEl = document.getElementById('ticket-view-id');
  const statusEl = document.getElementById('ticket-view-status');
  const urgentEl = document.getElementById('ticket-view-urgent');
  const dateEl = document.getElementById('ticket-view-date');
  const subjectEl = document.getElementById('ticket-view-subject');
  const categoryEl = document.getElementById('ticket-view-category');
  const deptEl = document.getElementById('ticket-view-dept');
  const locationEl = document.getElementById('ticket-view-location');
  const authorEl = document.getElementById('ticket-view-author');
  const descEl = document.getElementById('ticket-view-desc');
  const sidebarDeptName = document.getElementById('sidebar-dept-name');
  const sidebarDeptSla = document.getElementById('sidebar-dept-sla');
  const privacyText = document.getElementById('privacy-box-text');

  if (idEl) idEl.textContent = ticket.id;
  if (statusEl) {
    statusEl.textContent = ticket.status.replace('_', ' ');
    statusEl.className = `status-badge ${ticket.status}`;
  }
  if (urgentEl) urgentEl.hidden = !ticket.urgent;
  if (dateEl) dateEl.textContent = `Submitted ${formatDate(ticket.createdAt)}`;
  if (subjectEl) subjectEl.textContent = ticket.subject;
  if (categoryEl) categoryEl.textContent = ticket.category;
  if (deptEl) deptEl.textContent = ticket.department || 'Student Affairs';
  if (locationEl) {
    locationEl.textContent = ticket.locationZone + (ticket.locationDetails ? ` (${ticket.locationDetails})` : '');
  }

  // Submitter & Privacy (Phase 2 Item 7: Anonymous toggle)
  const currentUser = window.CamPulseDB.getCurrentUser();
  const isSuperAdmin = currentUser && currentUser.role === 'super_admin';

  if (authorEl) {
    if (ticket.isAnonymous) {
      if (isSuperAdmin) {
        authorEl.innerHTML = `
          <span style="color:var(--clr-urgent);font-weight:700;">[AUDIT ONLY]</span>
          ${ticket.studentName} (${ticket.studentMatric})
        `;
      } else {
        authorEl.innerHTML = `
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14" style="color:#4338ca;"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          Anonymous Student
        `;
      }
    } else {
      authorEl.textContent = ticket.studentName || 'Student';
    }
  }

  if (privacyText) {
    privacyText.textContent = ticket.isAnonymous
      ? 'Anonymous submission active. Department officers see "Anonymous Student". Identity is stored in encrypted logs visible only to super-admin for abuse prevention.'
      : 'Standard submission: Department officers can reach out to your registered student email if additional clarification is needed.';
  }

  if (sidebarDeptName) sidebarDeptName.textContent = ticket.department || 'Student Affairs';
  if (sidebarDeptSla) {
    sidebarDeptSla.innerHTML = ticket.urgent
      ? 'Urgent Priority SLA: <strong>24 Hours</strong>'
      : 'Standard Priority SLA: <strong>72 Hours</strong>';
  }

  if (descEl) descEl.textContent = ticket.description;

  // ── Attachments Gallery (Phase 2 Item 8) ──────────────────────────
  const attachGallery = document.getElementById('attachments-gallery');
  const noAttachNote = document.getElementById('no-attachments-note');
  const attachCountEl = document.getElementById('attachments-count');

  const attachments = Array.isArray(ticket.attachments) ? ticket.attachments : [];
  if (attachCountEl) attachCountEl.textContent = attachments.length;

  if (attachGallery) {
    attachGallery.innerHTML = '';
    if (attachments.length === 0) {
      if (noAttachNote) noAttachNote.hidden = false;
    } else {
      if (noAttachNote) noAttachNote.hidden = true;

      attachments.forEach(file => {
        const item = document.createElement('div');
        item.className = 'attachment-item';
        const isImage = file.type && file.type.startsWith('image/');

        if (isImage) {
          item.innerHTML = `
            <div class="attachment-thumb-wrap">
              <img src="${file.url}" alt="${file.name}" class="attachment-thumb-img" />
            </div>
            <div class="attachment-caption">
              <span class="attachment-title">${file.name}</span>
              <span class="attachment-meta">${formatBytes(file.size)} · Image (Click to enlarge)</span>
            </div>
          `;
          item.addEventListener('click', () => openLightbox(file.url, file.name));
        } else {
          item.innerHTML = `
            <div class="attachment-doc-wrap">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="32" height="32">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
              </svg>
              <span style="font-size:0.75rem;font-weight:700;">PDF DOCUMENT</span>
            </div>
            <div class="attachment-caption">
              <span class="attachment-title">${file.name}</span>
              <span class="attachment-meta">${formatBytes(file.size)} · Click to view</span>
            </div>
          `;
          item.addEventListener('click', () => {
            if (file.url && file.url !== '#') {
              window.open(file.url, '_blank');
            } else {
              showToast(`PDF document: ${file.name}`);
            }
          });
        }

        attachGallery.appendChild(item);
      });
    }
  }

  // ── Lightbox Handler ──────────────────────────────────────────────
  const lightboxModal = document.getElementById('lightbox-modal');
  const lightboxImg = document.getElementById('lightbox-img');
  const lightboxCaption = document.getElementById('lightbox-caption');
  const lightboxClose = document.getElementById('lightbox-close-btn');

  function openLightbox(url, name) {
    if (!lightboxModal) return;
    lightboxImg.src = url;
    lightboxCaption.textContent = name;
    lightboxModal.hidden = false;
  }

  function closeLightbox() {
    if (lightboxModal) lightboxModal.hidden = true;
  }

  if (lightboxClose) lightboxClose.addEventListener('click', closeLightbox);
  if (lightboxModal) {
    lightboxModal.addEventListener('click', (e) => {
      if (e.target === lightboxModal) closeLightbox();
    });
  }

  // ── Lifecycle Timeline (Phase 2 Item 10) ──────────────────────────
  const stepper = document.getElementById('timeline-stepper');
  if (stepper) {
    stepper.innerHTML = '';
    const timeline = Array.isArray(ticket.timeline) ? ticket.timeline : [];

    timeline.forEach((step, idx) => {
      const stepEl = document.createElement('div');
      const isLast = idx === timeline.length - 1;
      stepEl.className = `timeline-item ${isLast ? 'current' : 'completed'}`;

      stepEl.innerHTML = `
        <div class="timeline-dot" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </div>
        <div class="timeline-content">
          <h3 class="timeline-title">${step.title}</h3>
          <div class="timeline-time">${formatDate(step.timestamp)}</div>
          ${step.note ? `<p class="timeline-note">${step.note}</p>` : ''}
          ${step.actor ? `<div class="timeline-actor">By: ${step.actor}</div>` : ''}
        </div>
      `;
      stepper.appendChild(stepEl);
    });
  }

  // ── Two-Way Comments Thread (Phase 2 Item 11) ──────────────────────
  const commentsContainer = document.getElementById('comments-container');
  const commentForm = document.getElementById('comment-form');
  const commentText = document.getElementById('comment-text');
  const commentingUserName = document.getElementById('commenting-user-name');

  if (commentingUserName) {
    commentingUserName.textContent = ticket.isAnonymous ? 'Anonymous Student' : (currentUser?.name || 'Student');
  }

  function renderComments() {
    if (!commentsContainer) return;
    commentsContainer.innerHTML = '';
    const comments = Array.isArray(ticket.comments) ? ticket.comments : [];

    if (comments.length === 0) {
      commentsContainer.innerHTML = `
        <p style="font-size:var(--fs-sm);color:var(--clr-gray-500);font-style:italic;">
          No comments yet. Post a message below to communicate directly with university desk officers.
        </p>
      `;
      return;
    }

    comments.forEach(cm => {
      const isStaff = cm.authorRole === 'staff' || cm.authorRole === 'dept_admin';
      const bubble = document.createElement('div');
      bubble.className = `comment-bubble ${isStaff ? 'staff' : 'student'}`;

      bubble.innerHTML = `
        <div class="comment-meta-bar">
          <div class="comment-author-wrap">
            <span class="comment-author-name">${cm.authorName}</span>
            <span class="${isStaff ? 'badge-staff' : 'badge-student'}">${isStaff ? 'Staff Response' : 'Student'}</span>
          </div>
          <span class="comment-time">${formatDate(cm.createdAt)}</span>
        </div>
        <div class="comment-text">${cm.message}</div>
      `;
      commentsContainer.appendChild(bubble);
    });

    commentsContainer.scrollTop = commentsContainer.scrollHeight;
  }

  renderComments();

  if (commentForm) {
    commentForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const msg = commentText.value.trim();
      if (!msg) return;

      const userRole = (currentUser && currentUser.role) ? currentUser.role : 'student';
      const newComment = await window.CamPulseDB.addComment(ticket.id, msg, userRole);

      if (newComment) {
        if (!Array.isArray(ticket.comments)) ticket.comments = [];
        ticket.comments.push(newComment);
        renderComments();
        commentText.value = '';
        showToast('Comment posted successfully.');
      }
    });
  }

  // ── 7-Day Reopen Logic (Phase 2 Item 11) ───────────────────────────
  const reopenBanner = document.getElementById('reopen-banner');
  const reopenTicketBtn = document.getElementById('reopen-ticket-btn');
  const reopenFormBox = document.getElementById('reopen-form-box');
  const reopenForm = document.getElementById('reopen-form');
  const reopenReason = document.getElementById('reopen-reason');
  const cancelReopenBtn = document.getElementById('cancel-reopen-btn');

  if (ticket.status === 'resolved') {
    const resolvedTime = new Date(ticket.resolvedAt || ticket.createdAt).getTime();
    const daysSinceResolved = (Date.now() - resolvedTime) / (1000 * 3600 * 24);

    if (daysSinceResolved <= 7) {
      if (reopenBanner) reopenBanner.hidden = false;
    }
  }

  if (reopenTicketBtn && reopenFormBox) {
    reopenTicketBtn.addEventListener('click', () => {
      reopenFormBox.hidden = false;
      reopenReason.focus();
    });
  }

  if (cancelReopenBtn && reopenFormBox) {
    cancelReopenBtn.addEventListener('click', () => {
      reopenFormBox.hidden = true;
    });
  }

  if (reopenForm) {
    reopenForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const reason = reopenReason.value.trim();
      if (!reason) return;

      try {
        const updated = await window.CamPulseDB.reopenTicket(ticket.id, reason);
        ticket = updated;
        if (reopenBanner) reopenBanner.hidden = true;
        if (reopenFormBox) reopenFormBox.hidden = true;
        showToast('Ticket reopened. Department officers have been notified.');
        initTicketDetail(); // Re-render page
      } catch (err) {
        showToast(err.message || 'Failed to reopen ticket.');
      }
    });
  }

  // ── Satisfaction Star Rating (Phase 2 Item 12) ─────────────────────
  const ratingCard = document.getElementById('satisfaction-rating-card');
  const ratingFormWrap = document.getElementById('rating-form-wrap');
  const ratingSubmittedDisplay = document.getElementById('rating-submitted-display');
  const ratingForm = document.getElementById('rating-form');
  const starButtons = document.querySelectorAll('.star-btn');
  const ratingLabelDesc = document.getElementById('rating-label-desc');
  const submitRatingBtn = document.getElementById('submit-rating-btn');
  const ratingCommentInput = document.getElementById('rating-comment');
  const ratedStarsView = document.getElementById('rated-stars-view');
  const ratedCommentView = document.getElementById('rated-comment-view');
  const ratedTimestamp = document.getElementById('rated-timestamp');

  const ratingLabels = {
    1: '1 Star — Very Unsatisfied',
    2: '2 Stars — Unsatisfied',
    3: '3 Stars — Neutral',
    4: '4 Stars — Satisfied',
    5: '5 Stars — Very Satisfied'
  };

  if (ticket.status === 'resolved' || ticket.status === 'closed') {
    if (ratingCard) ratingCard.hidden = false;

    if (ticket.rating) {
      // Already rated
      if (ratingFormWrap) ratingFormWrap.hidden = true;
      if (ratingSubmittedDisplay) ratingSubmittedDisplay.hidden = false;
      if (ratedStarsView) ratedStarsView.textContent = '★'.repeat(ticket.rating) + '☆'.repeat(5 - ticket.rating);
      if (ratedCommentView) {
        ratedCommentView.textContent = ticket.ratingComment ? `"${ticket.ratingComment}"` : 'No additional comments provided.';
      }
      if (ratedTimestamp) ratedTimestamp.textContent = `Rated on ${formatDate(ticket.ratedAt)}`;
    } else {
      // Not yet rated: allow rating
      if (ratingFormWrap) ratingFormWrap.hidden = false;
      if (ratingSubmittedDisplay) ratingSubmittedDisplay.hidden = true;

      let selectedRating = 0;

      starButtons.forEach(btn => {
        const val = parseInt(btn.dataset.value, 10);

        btn.addEventListener('mouseenter', () => {
          starButtons.forEach(b => {
            const bVal = parseInt(b.dataset.value, 10);
            b.classList.toggle('hovered', bVal <= val);
          });
          if (ratingLabelDesc) ratingLabelDesc.textContent = ratingLabels[val];
        });

        btn.addEventListener('mouseleave', () => {
          starButtons.forEach(b => b.classList.remove('hovered'));
          if (ratingLabelDesc) {
            ratingLabelDesc.textContent = selectedRating ? ratingLabels[selectedRating] : 'Select a rating';
          }
        });

        btn.addEventListener('click', () => {
          selectedRating = val;
          starButtons.forEach(b => {
            const bVal = parseInt(b.dataset.value, 10);
            b.classList.toggle('active', bVal <= val);
          });
          if (ratingLabelDesc) ratingLabelDesc.textContent = ratingLabels[val];
          if (submitRatingBtn) submitRatingBtn.disabled = false;
        });
      });

      if (ratingForm) {
        ratingForm.addEventListener('submit', async (e) => {
          e.preventDefault();
          if (!selectedRating) return;

          const comment = ratingCommentInput ? ratingCommentInput.value : '';
          try {
            const updated = await window.CamPulseDB.rateTicket(ticket.id, selectedRating, comment);
            ticket = updated;
            showToast('Thank you for rating your resolution!');
            initTicketDetail(); // Re-render with submitted rating view
          } catch (err) {
            showToast(err.message || 'Failed to submit rating.');
          }
        });
      }
    }
  } else {
    if (ratingCard) ratingCard.hidden = true;
  }
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

// ── Trending Campus Issues (Phase 3 Item 18) ─────────────────────────
async function initTrendingIssues() {
  const container = document.getElementById('trending-issues-container');
  if (!container || !window.CamPulseDB) return;

  const trendingTickets = await window.CamPulseDB.getTrendingTickets(3);
  if (!trendingTickets || trendingTickets.length === 0) {
    container.innerHTML = '<p class="text-muted" style="font-size:var(--fs-sm);color:var(--clr-gray-500);grid-column:1/-1;">No open campus issues yet. Check back soon!</p>';
    return;
  }

  container.innerHTML = trendingTickets.map(t => {
    const hasUpvoted = window.CamPulseDB.hasUserUpvoted(t.id);
    return `
      <article class="trending-card${t.urgent ? ' urgent' : ''}" data-ticket-id="${t.id}">
        <div>
          <div class="trending-top">
            <span class="ticket-category">${t.category}</span>
            <span class="ticket-id" style="font-size:0.7rem;">${t.id}</span>
          </div>
          <h3 class="trending-title">
            <a href="ticket.html?id=${encodeURIComponent(t.id)}">${t.subject}</a>
          </h3>
          <p class="trending-desc">${t.description}</p>
        </div>
        <div>
          <div class="board-location-tag">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
            <span>${t.locationZone || 'Campus'}</span>
          </div>
          <div class="trending-footer">
            <button type="button" class="upvote-btn board-upvote-btn ${hasUpvoted ? 'has-upvoted' : ''}" data-ticket-id="${t.id}" aria-label="Upvote this complaint">
              <svg class="upvote-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/>
              </svg>
              <span class="upvote-text">Me Too</span>
              <span class="upvote-count">${t.upvotesCount || 0}</span>
            </button>
            <a href="ticket.html?id=${encodeURIComponent(t.id)}" class="btn btn-secondary btn-sm" style="padding:0.25rem 0.6rem;font-size:0.75rem;">
              Track &rarr;
            </a>
          </div>
        </div>
      </article>
    `;
  }).join('');
}

// ── Phase 3 Community Issue Board (issues.html) ───────────────────────
function initCommunityBoard() {
  const boardGrid = document.getElementById('board-issues-grid');
  if (!boardGrid) return; // Not on issues.html

  const searchInput = document.getElementById('board-search-input');
  const categoryFilter = document.getElementById('board-filter-category');
  const locationFilter = document.getElementById('board-filter-location');
  const sortBySelect = document.getElementById('board-sort-by');
  const statusPills = document.querySelectorAll('[data-board-status]');
  const countEl = document.getElementById('board-results-count');
  const emptyState = document.getElementById('board-empty-state');
  const resetBtn = document.getElementById('board-reset-btn');

  let activeStatus = 'all';
  let searchDebounce = null;

  async function loadBoardIssues() {
    if (!window.CamPulseDB) return;

    const category = categoryFilter ? categoryFilter.value : 'all';
    const location = locationFilter ? locationFilter.value : 'all';
    const sort = sortBySelect ? sortBySelect.value : 'upvotes';
    const search = searchInput ? searchInput.value.trim() : '';

    const issues = await window.CamPulseDB.getPublicTickets({
      category,
      location,
      status: activeStatus,
      sort,
      search
    });

    if (countEl) countEl.textContent = issues.length;

    if (issues.length === 0) {
      boardGrid.innerHTML = '';
      if (emptyState) emptyState.hidden = false;
      return;
    }

    if (emptyState) emptyState.hidden = true;

    boardGrid.innerHTML = issues.map(ticket => {
      const hasUpvoted = window.CamPulseDB.hasUserUpvoted(ticket.id);
      const commentCount = Array.isArray(ticket.comments) ? ticket.comments.length : 0;
      const statusText = formatStatusText(ticket.status);

      return `
        <article class="board-issue-card${ticket.urgent ? ' urgent' : ''}" data-ticket-id="${ticket.id}">
          <div>
            <div class="board-card-header">
              <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
                <span class="board-card-id">${ticket.id}</span>
                <span class="ticket-category">${ticket.category}</span>
                ${ticket.urgent ? `
                  <span class="ticket-urgent-badge" style="font-size:0.68rem;padding:0.15rem 0.45rem;">
                    Urgent
                  </span>` : ''}
              </div>
              <span class="status-badge ${ticket.status}">${statusText}</span>
            </div>

            <h3 class="board-card-title">
              <a href="ticket.html?id=${encodeURIComponent(ticket.id)}">${ticket.subject}</a>
            </h3>

            <p class="board-card-desc">${ticket.description}</p>
          </div>

          <div>
            <div class="board-location-tag">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
              <span>${ticket.locationZone || 'Campus'}</span>
            </div>

            <div class="board-card-footer">
              <button type="button" class="upvote-btn board-upvote-btn ${hasUpvoted ? 'has-upvoted' : ''}" data-ticket-id="${ticket.id}" aria-label="Add Me Too upvote to ticket ${ticket.id}">
                <svg class="upvote-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/>
                </svg>
                <span class="upvote-text">Me Too</span>
                <span class="upvote-count">${ticket.upvotesCount || 0}</span>
              </button>

              <div style="display:flex;align-items:center;gap:10px;">
                <span style="font-size:0.75rem;color:var(--clr-gray-500);display:inline-flex;align-items:center;gap:3px;" title="${commentCount} official comment(s)">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                  ${commentCount}
                </span>
                <a href="ticket.html?id=${encodeURIComponent(ticket.id)}" class="btn btn-secondary btn-sm" style="font-size:0.75rem;padding:0.25rem 0.65rem;">
                  View &rarr;
                </a>
              </div>
            </div>
          </div>
        </article>
      `;
    }).join('');
  }

  // Filter and Search Event Listeners
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      clearTimeout(searchDebounce);
      searchDebounce = setTimeout(loadBoardIssues, 250);
    });
  }

  if (categoryFilter) categoryFilter.addEventListener('change', loadBoardIssues);
  if (locationFilter) locationFilter.addEventListener('change', loadBoardIssues);
  if (sortBySelect) sortBySelect.addEventListener('change', loadBoardIssues);

  statusPills.forEach(pill => {
    pill.addEventListener('click', () => {
      statusPills.forEach(p => {
        p.classList.remove('active');
        p.setAttribute('aria-checked', 'false');
      });
      pill.classList.add('active');
      pill.setAttribute('aria-checked', 'true');
      activeStatus = pill.dataset.boardStatus || 'all';
      loadBoardIssues();
    });
  });

  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      if (searchInput) searchInput.value = '';
      if (categoryFilter) categoryFilter.value = 'all';
      if (locationFilter) locationFilter.value = 'all';
      if (sortBySelect) sortBySelect.value = 'upvotes';
      activeStatus = 'all';
      statusPills.forEach(p => {
        const isAll = p.dataset.boardStatus === 'all';
        p.classList.toggle('active', isAll);
        p.setAttribute('aria-checked', isAll ? 'true' : 'false');
      });
      loadBoardIssues();
    });
  }

  loadBoardIssues();
}

// ── Global "Me Too" Upvote Delegated Handler ──────────────────────────
function initGlobalUpvoteHandler() {
  document.addEventListener('click', async (e) => {
    const btn = e.target.closest('.upvote-btn');
    if (!btn) return;
    const ticketId = btn.dataset.ticketId;
    if (!ticketId || !window.CamPulseDB) return;

    e.preventDefault();
    e.stopPropagation();

    try {
      const res = await window.CamPulseDB.upvoteTicket(ticketId);
      // Synchronize all instances of this ticket's upvote button on page
      document.querySelectorAll(`.upvote-btn[data-ticket-id="${ticketId}"]`).forEach(b => {
        b.classList.toggle('has-upvoted', res.upvoted);
        const countSpan = b.querySelector('.upvote-count');
        if (countSpan) countSpan.textContent = res.count;
      });

      showToast(res.upvoted ? `Added "Me Too" upvote to ${ticketId}!` : `Removed upvote from ${ticketId}`);
    } catch (err) {
      console.error('[CamPulse] Upvote failed:', err);
    }
  });
}

function formatStatusText(status) {
  switch (status) {
    case 'pending': return 'Pending';
    case 'assigned': return 'Assigned';
    case 'in_progress': return 'In Progress';
    case 'resolved': return 'Resolved';
    case 'closed': return 'Closed';
    default: return status || 'Pending';
  }
}

// ── Phase 4: In-App Notification Center & Preferences (Items 19-21) ──
function initNotifications() {
  const bellBtn = document.getElementById('notif-bell-btn');
  const badge = document.getElementById('notif-badge');
  const dropdown = document.getElementById('notif-dropdown');
  const notifList = document.getElementById('notif-list');
  const unreadPill = document.getElementById('notif-unread-count-pill');
  const markAllBtn = document.getElementById('notif-mark-all-btn');
  const settingsOpenBtn = document.getElementById('notif-settings-open-btn');
  const settingsModal = document.getElementById('notif-settings-modal');
  const settingsCloseBtn = document.getElementById('notif-settings-close-btn');
  const settingsForm = document.getElementById('notif-settings-form');

  if (!bellBtn || !window.CamPulseDB) return;

  function updateBadge() {
    const unread = window.CamPulseDB.getUnreadNotifCount();
    if (badge) {
      badge.textContent = unread;
      badge.hidden = unread === 0;
    }
    if (unreadPill) {
      unreadPill.textContent = unread > 0 ? `${unread} new` : 'All read';
    }
  }

  function renderNotifItems() {
    if (!notifList) return;
    const notifs = window.CamPulseDB.getNotifications();

    if (!notifs || notifs.length === 0) {
      notifList.innerHTML = '<div class="notif-empty">No notifications yet. You will be alerted when ticket statuses update or staff reply.</div>';
      return;
    }

    notifList.innerHTML = notifs.map(n => `
      <div class="notif-item${n.read ? '' : ' unread'}" data-notif-id="${n.id}" data-ticket-id="${n.ticketId || ''}">
        <div class="notif-icon-circle ${n.type || 'status'}">
          ${n.type === 'comment' ? `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          ` : `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          `}
        </div>
        <div class="notif-body">
          <div class="notif-title-row">
            <span class="notif-item-title">${n.title}</span>
            <span class="notif-time">${timeAgo(n.createdAt)}</span>
          </div>
          <p class="notif-message">${n.message}</p>
        </div>
      </div>
    `).join('');

    // Attach click handlers to notification items
    notifList.querySelectorAll('.notif-item').forEach(item => {
      item.addEventListener('click', () => {
        const notifId = item.dataset.notifId;
        const ticketId = item.dataset.ticketId;
        if (notifId) window.CamPulseDB.markNotificationAsRead(notifId);
        item.classList.remove('unread');
        updateBadge();
        if (ticketId) {
          window.location.href = `ticket.html?id=${encodeURIComponent(ticketId)}`;
        }
      });
    });
  }

  // Toggle notification popover
  bellBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const isHidden = dropdown.hidden;
    dropdown.hidden = !isHidden;
    bellBtn.setAttribute('aria-expanded', isHidden ? 'true' : 'false');
    if (isHidden) {
      renderNotifItems();
    }
  });

  // Close when clicking outside
  document.addEventListener('click', (e) => {
    if (dropdown && !dropdown.hidden && !e.target.closest('#notif-wrapper')) {
      dropdown.hidden = true;
      bellBtn.setAttribute('aria-expanded', 'false');
    }
  });

  // Mark all read
  if (markAllBtn) {
    markAllBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      window.CamPulseDB.markAllNotificationsAsRead();
      updateBadge();
      renderNotifItems();
      showToast('All notifications marked as read.');
    });
  }

  // Open settings modal
  if (settingsOpenBtn && settingsModal) {
    settingsOpenBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      dropdown.hidden = true;
      settingsModal.hidden = false;
      document.body.classList.add('modal-open');

      // Populate current preferences
      const prefs = window.CamPulseDB.getNotificationPreferences();
      const inApp = document.getElementById('pref-in-app');
      const email = document.getElementById('pref-email');
      const whatsapp = document.getElementById('pref-whatsapp');
      const phone = document.getElementById('pref-phone');
      const statusEv = document.getElementById('pref-status');
      const commentsEv = document.getElementById('pref-comments');
      const slaEv = document.getElementById('pref-sla');

      if (inApp) inApp.checked = prefs.inAppEnabled !== false;
      if (email) email.checked = prefs.emailEnabled !== false;
      if (whatsapp) whatsapp.checked = Boolean(prefs.whatsappPreviewEnabled);
      if (phone) phone.value = prefs.phone || '';
      if (statusEv) statusEv.checked = prefs.events?.statusChange !== false;
      if (commentsEv) commentsEv.checked = prefs.events?.staffComment !== false;
      if (slaEv) slaEv.checked = prefs.events?.slaWarning !== false;
    });
  }

  // Close settings modal
  if (settingsCloseBtn && settingsModal) {
    settingsCloseBtn.addEventListener('click', () => {
      settingsModal.hidden = true;
      document.body.classList.remove('modal-open');
    });
  }

  // Save settings form
  if (settingsForm) {
    settingsForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const inApp = document.getElementById('pref-in-app')?.checked;
      const email = document.getElementById('pref-email')?.checked;
      const whatsapp = document.getElementById('pref-whatsapp')?.checked;
      const phone = document.getElementById('pref-phone')?.value.trim();
      const statusEv = document.getElementById('pref-status')?.checked;
      const commentsEv = document.getElementById('pref-comments')?.checked;
      const slaEv = document.getElementById('pref-sla')?.checked;

      const newPrefs = {
        inAppEnabled: inApp,
        emailEnabled: email,
        whatsappPreviewEnabled: whatsapp,
        phone,
        events: {
          statusChange: statusEv,
          staffComment: commentsEv,
          slaWarning: slaEv
        }
      };

      window.CamPulseDB.saveNotificationPreferences(newPrefs);
      settingsModal.hidden = true;
      document.body.classList.remove('modal-open');
      showToast('Notification preferences saved successfully!');
    });
  }

  // Real-time notification listener
  window.addEventListener('campulse:notification', (e) => {
    updateBadge();
    if (dropdown && !dropdown.hidden) {
      renderNotifItems();
    }
  });

  updateBadge();
}

// ── Phase 6: Dark Mode Theme Switcher (Item 30) ──────────────────────
function initDarkMode() {
  const toggleBtn = document.getElementById('theme-toggle-btn');
  if (!toggleBtn) return;

  const sunIcon = toggleBtn.querySelector('.sun-icon');
  const moonIcon = toggleBtn.querySelector('.moon-icon');

  function applyTheme(isDark) {
    if (isDark) {
      document.documentElement.setAttribute('data-theme', 'dark');
      if (sunIcon) sunIcon.style.display = 'none';
      if (moonIcon) moonIcon.style.display = 'block';
    } else {
      document.documentElement.removeAttribute('data-theme');
      if (sunIcon) sunIcon.style.display = 'block';
      if (moonIcon) moonIcon.style.display = 'none';
    }
    localStorage.setItem('campulse_theme', isDark ? 'dark' : 'light');
  }

  // Determine initial state
  const savedTheme = localStorage.getItem('campulse_theme');
  const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  const isDarkInitial = savedTheme ? savedTheme === 'dark' : prefersDark;

  applyTheme(isDarkInitial);

  toggleBtn.addEventListener('click', () => {
    const isCurrentlyDark = document.documentElement.getAttribute('data-theme') === 'dark';
    applyTheme(!isCurrentlyDark);
    showToast(!isCurrentlyDark ? 'Dark mode enabled' : 'Light mode enabled');
  });
}

// Helper: Relative time formatting
function timeAgo(isoString) {
  if (!isoString) return '';
  const now = Date.now();
  const past = new Date(isoString).getTime();
  const diffSec = Math.floor((now - past) / 1000);

  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Date(isoString).toLocaleDateString();
}

// ── Legal & Policy Modals (Phase 6 Item 31) ──────────────────────────
function initLegalModals() {
  document.querySelectorAll('.footer-modal-trigger').forEach(trigger => {
    trigger.addEventListener('click', (e) => {
      e.preventDefault();
      const modalId = trigger.getAttribute('data-modal');
      if (!modalId) return;
      const modal = document.getElementById(modalId);
      if (modal) {
        modal.hidden = false;
        modal.classList.add('open');
        document.body.classList.add('modal-open');
      }
    });
  });

  document.querySelectorAll('.legal-modal-close').forEach(btn => {
    btn.addEventListener('click', () => {
      const modal = btn.closest('.modal-overlay');
      if (modal) {
        modal.hidden = true;
        modal.classList.remove('open');
        document.body.classList.remove('modal-open');
      }
    });
  });

  document.querySelectorAll('#about-modal, #privacy-modal, #terms-modal, #contact-modal').forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.hidden = true;
        modal.classList.remove('open');
        document.body.classList.remove('modal-open');
      }
    });
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      document.querySelectorAll('#about-modal, #privacy-modal, #terms-modal, #contact-modal, #notif-settings-modal').forEach(modal => {
        if (!modal.hidden) {
          modal.hidden = true;
          modal.classList.remove('open');
          document.body.classList.remove('modal-open');
        }
      });
    }
  });
}

// ── User Authentication State Display in Nav ─────────────────────────
function initUserAuthDisplay() {
  const authBtn = document.getElementById('auth-open-btn');
  if (!authBtn) return;

  const storedUserRaw = localStorage.getItem('campulse_user');
  if (!storedUserRaw) return;

  try {
    const user = JSON.parse(storedUserRaw);
    if (user && user.name) {
      const firstName = user.name.split(' ')[0] || 'Student';
      const labelSpan = authBtn.querySelector('span');
      if (labelSpan) {
        labelSpan.textContent = `${firstName} (Sign Out)`;
        authBtn.title = `Signed in as ${user.name} (${user.matric || user.email}). Click to sign out.`;
      }
      authBtn.addEventListener('click', (e) => {
        if (localStorage.getItem('campulse_user')) {
          e.preventDefault();
          e.stopPropagation();
          if (confirm(`Signed in as ${user.name} (${user.matric || user.email}). Do you want to sign out?`)) {
            localStorage.removeItem('campulse_user');
            showToast('Signed out successfully.');
            if (labelSpan) labelSpan.textContent = 'Register / Sign In';
            authBtn.removeAttribute('title');
            setTimeout(() => window.location.reload(), 400);
          }
        }
      }, { capture: true });
    }
  } catch (err) {
    console.error('Failed to parse user auth state:', err);
  }
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
  initTrendingIssues();
  initCommunityBoard();
  initGlobalUpvoteHandler();
  initNotifications();
  initDarkMode();
  initDashboard();
  initTicketDetail();
  initAuthModal();
  initLegalModals();
  initUserAuthDisplay();
  initRevealAnimations();
  initButtonGlow();
});
