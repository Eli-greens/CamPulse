/**
 * CamPulse — Department Admin & Staff Console Controller
 * Phase 5: Role-based queue, SLA countdowns, bulk actions, internal notes, and analytics.
 */

'use strict';

document.addEventListener('DOMContentLoaded', async () => {
  if (!window.CamPulseDB) return;

  // Active state
  let currentRole = 'super_admin';
  let currentDept = '';
  let currentStaff = '';
  let activeTickets = [];
  let selectedTicketIds = new Set();
  let currentDrawerTicket = null;

  // DOM Elements
  const tbody = document.getElementById('admin-tickets-tbody');
  const emptyState = document.getElementById('adm-empty-state');
  const searchInput = document.getElementById('adm-search-input');
  const filterStatus = document.getElementById('adm-filter-status');
  const filterCategory = document.getElementById('adm-filter-category');
  const filterSla = document.getElementById('adm-filter-sla');
  const sortBySelect = document.getElementById('adm-sort-by');
  const checkSelectAll = document.getElementById('check-select-all');
  const bulkStrip = document.getElementById('bulk-actions-strip');
  const bulkSelectedCount = document.getElementById('bulk-selected-count');
  const bulkStatusSelect = document.getElementById('bulk-status-select');
  const bulkApplyBtn = document.getElementById('bulk-apply-btn');
  const btnExportCsv = document.getElementById('btn-export-csv');
  const btnResetDemo = document.getElementById('btn-reset-demo');
  const roleAuditNote = document.getElementById('role-audit-note');
  const roleButtons = document.querySelectorAll('.role-btn');

  // Drawer Elements
  const drawer = document.getElementById('ticket-drawer');
  const drawerCloseBtn = document.getElementById('drawer-close-btn');
  const drawerTicketId = document.getElementById('drawer-ticket-id');
  const drawerTicketCategory = document.getElementById('drawer-ticket-category');
  const drawerSlaBadge = document.getElementById('drawer-sla-badge');
  const drawerTicketTitle = document.getElementById('drawer-ticket-title');
  const drawerStatusSelect = document.getElementById('drawer-status-select');
  const drawerUpdateStatusBtn = document.getElementById('drawer-update-status-btn');
  const drawerModBtn = document.getElementById('drawer-mod-btn');
  const drawerDescription = document.getElementById('drawer-description');
  const drawerMetaInfo = document.getElementById('drawer-meta-info');
  const drawerAttachmentsList = document.getElementById('drawer-attachments-list');
  const drawerCommentsList = document.getElementById('drawer-comments-list');
  const drawerCommentForm = document.getElementById('drawer-comment-form');
  const drawerCommentInput = document.getElementById('drawer-comment-input');
  const drawerInternalNotesList = document.getElementById('drawer-internal-notes-list');
  const drawerInternalNoteForm = document.getElementById('drawer-internal-note-form');
  const drawerInternalNoteInput = document.getElementById('drawer-internal-note-input');
  const internalNotesCount = document.getElementById('internal-notes-count');
  const drawerTabs = document.querySelectorAll('.drawer-tab');

  // ── Role Switcher Handler (Phase 5 Item 22) ─────────────────────────
  roleButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      roleButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      currentRole = btn.dataset.role || 'super_admin';
      currentDept = btn.dataset.dept || '';
      currentStaff = btn.dataset.staff || '';

      if (currentRole === 'super_admin') {
        roleAuditNote.textContent = 'Viewing all departments with full safety audit & identity privileges.';
      } else if (currentRole === 'dept_admin') {
        roleAuditNote.textContent = `Scattered view restricted strictly to ${currentDept}.`;
      } else {
        roleAuditNote.textContent = `Field staff view: ${currentStaff} (${currentDept}).`;
      }

      selectedTicketIds.clear();
      updateBulkToolbar();
      loadQueue();
    });
  });

  // ── Compute SLA Timing (Phase 5 Item 25) ─────────────────────────────
  function getSlaInfo(ticket) {
    const isResolved = ticket.status === 'resolved' || ticket.status === 'closed';
    const now = Date.now();
    const created = new Date(ticket.createdAt).getTime();
    const ageHours = (now - created) / 3600000;
    const slaLimit = ticket.urgent ? 24 : 72;
    const remaining = slaLimit - ageHours;

    if (isResolved) {
      return {
        badgeClass: 'ontime',
        label: 'Resolved within SLA',
        isOverdue: false,
        remainingHours: 0
      };
    }

    if (remaining < 0) {
      const overHours = Math.abs(Math.round(remaining));
      return {
        badgeClass: 'overdue',
        label: `Overdue (+${overHours}h)`,
        isOverdue: true,
        remainingHours: remaining
      };
    }

    if (remaining <= 12) {
      return {
        badgeClass: 'warning',
        label: `${Math.round(remaining)}h left`,
        isOverdue: false,
        remainingHours: remaining
      };
    }

    return {
      badgeClass: 'ontime',
      label: `${Math.round(remaining)}h remaining`,
      isOverdue: false,
      remainingHours: remaining
    };
  }

  // ── Load Queue & Filter/Sort ─────────────────────────────────────────
  async function loadQueue() {
    activeTickets = await window.CamPulseDB.getRoleTickets(currentRole, currentDept, currentStaff);
    renderAnalytics();

    let filtered = [...activeTickets];

    // Status filter
    const statusVal = filterStatus.value;
    if (statusVal !== 'all') {
      filtered = filtered.filter(t => t.status === statusVal);
    }

    // Category filter
    const catVal = filterCategory.value;
    if (catVal !== 'all') {
      filtered = filtered.filter(t => t.category.toLowerCase() === catVal.toLowerCase());
    }

    // SLA Urgency filter
    const slaVal = filterSla.value;
    if (slaVal === 'urgent') {
      filtered = filtered.filter(t => t.urgent);
    } else if (slaVal === 'overdue') {
      filtered = filtered.filter(t => getSlaInfo(t).isOverdue);
    }

    // Search query
    const q = searchInput.value.trim().toLowerCase();
    if (q) {
      filtered = filtered.filter(t =>
        (t.id && t.id.toLowerCase().includes(q)) ||
        (t.subject && t.subject.toLowerCase().includes(q)) ||
        (t.description && t.description.toLowerCase().includes(q)) ||
        (t.studentName && t.studentName.toLowerCase().includes(q)) ||
        (t.studentMatric && t.studentMatric.toLowerCase().includes(q)) ||
        (t.locationZone && t.locationZone.toLowerCase().includes(q))
      );
    }

    // Sort
    const sortVal = sortBySelect.value;
    filtered.sort((a, b) => {
      if (sortVal === 'newest') return new Date(b.createdAt) - new Date(a.createdAt);
      if (sortVal === 'oldest') return new Date(a.createdAt) - new Date(b.createdAt);
      if (sortVal === 'upvotes') return (b.upvotesCount || 0) - (a.upvotesCount || 0);
      if (sortVal === 'sla') return getSlaInfo(a).remainingHours - getSlaInfo(b).remainingHours;
      return 0;
    });

    renderTableRows(filtered);
  }

  // ── Render Table Rows (Phase 5 Item 24) ──────────────────────────────
  function renderTableRows(tickets) {
    if (tickets.length === 0) {
      tbody.innerHTML = '';
      emptyState.hidden = false;
      return;
    }

    emptyState.hidden = true;

    tbody.innerHTML = tickets.map(ticket => {
      const isSelected = selectedTicketIds.has(ticket.id);
      const sla = getSlaInfo(ticket);

      // Student Identity Logic (Item 7 & 22):
      // Super-admin sees true identity with audit badge if anonymous.
      // Department admin and staff see "Anonymous Student" if anonymous!
      let studentDisplay = '';
      if (ticket.isAnonymous) {
        if (currentRole === 'super_admin') {
          studentDisplay = `
            <div>
              <span class="badge" style="background:#fef3c7;color:#92400e;font-size:0.65rem;font-weight:700;">AUDIT: ANONYMOUS</span>
              <div style="font-weight:600;color:var(--clr-gray-900);font-size:0.75rem;">${ticket.studentName}</div>
              <div style="font-size:0.68rem;color:var(--clr-gray-500);font-family:monospace;">${ticket.studentMatric || 'N/A'}</div>
            </div>
          `;
        } else {
          studentDisplay = `
            <span style="font-style:italic;color:var(--clr-gray-600);display:inline-flex;align-items:center;gap:4px;">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              Anonymous Student
            </span>
          `;
        }
      } else {
        studentDisplay = `
          <div>
            <div style="font-weight:600;color:var(--clr-gray-900);">${ticket.studentName || 'Student'}</div>
            <div style="font-size:0.68rem;color:var(--clr-gray-500);font-family:monospace;">${ticket.studentMatric || 'N/A'}</div>
          </div>
        `;
      }

      return `
        <tr class="${isSelected ? 'selected' : ''}" data-ticket-id="${ticket.id}">
          <td class="table-check-col">
            <input type="checkbox" class="ticket-row-check" data-id="${ticket.id}" ${isSelected ? 'checked' : ''} aria-label="Select ticket ${ticket.id}" />
          </td>
          <td>
            <div style="font-family:monospace;font-weight:700;color:var(--clr-primary-800);">${ticket.id}</div>
            <div style="font-size:0.68rem;color:var(--clr-gray-500);">${timeAgo(ticket.createdAt)}</div>
          </td>
          <td>
            <div style="font-weight:600;color:var(--clr-gray-900);line-height:1.3;max-width:280px;margin-bottom:2px;">
              ${ticket.isModerated ? '<span style="color:#ef4444;font-weight:700;">[FLAGGED] </span>' : ''}
              ${ticket.subject}
            </div>
            <div style="font-size:0.7rem;color:var(--clr-gray-500);display:inline-flex;align-items:center;gap:3px;">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="11" height="11"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
              ${ticket.locationZone || 'Campus'} ${ticket.locationDetails ? `(${ticket.locationDetails})` : ''}
            </div>
          </td>
          <td>
            <div style="display:flex;flex-direction:column;gap:2px;">
              <span class="ticket-category" style="align-self:flex-start;">${ticket.category}</span>
              <span style="font-size:0.68rem;color:var(--clr-gray-600);">${ticket.department}</span>
            </div>
          </td>
          <td>${studentDisplay}</td>
          <td>
            <span class="sla-badge ${sla.badgeClass}">
              ${sla.label}
            </span>
          </td>
          <td>
            <span class="status-badge ${ticket.status}">
              ${formatStatusText(ticket.status)}
            </span>
          </td>
          <td>
            <div style="display:flex;gap:0.35rem;align-items:center;">
              <button type="button" class="btn btn-secondary btn-sm btn-inspect" data-id="${ticket.id}" style="padding:0.25rem 0.55rem;font-size:0.75rem;">
                Inspect
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    // Attach row checkbox handlers
    tbody.querySelectorAll('.ticket-row-check').forEach(ck => {
      ck.addEventListener('change', (e) => {
        const id = ck.dataset.id;
        if (ck.checked) selectedTicketIds.add(id);
        else selectedTicketIds.delete(id);
        ck.closest('tr').classList.toggle('selected', ck.checked);
        updateBulkToolbar();
      });
    });

    // Inspect buttons
    tbody.querySelectorAll('.btn-inspect').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        openDrawer(id);
      });
    });
  }

  // ── Bulk Actions Bar (Phase 5 Item 24) ───────────────────────────────
  function updateBulkToolbar() {
    const count = selectedTicketIds.size;
    if (count > 0) {
      bulkStrip.hidden = false;
      bulkSelectedCount.textContent = count;
    } else {
      bulkStrip.hidden = true;
    }
  }

  checkSelectAll.addEventListener('change', () => {
    const isChecked = checkSelectAll.checked;
    const checks = tbody.querySelectorAll('.ticket-row-check');
    checks.forEach(c => {
      c.checked = isChecked;
      const id = c.dataset.id;
      if (isChecked) selectedTicketIds.add(id);
      else selectedTicketIds.delete(id);
      c.closest('tr').classList.toggle('selected', isChecked);
    });
    updateBulkToolbar();
  });

  bulkApplyBtn.addEventListener('click', async () => {
    const newStatus = bulkStatusSelect.value;
    if (!newStatus) {
      showToast('Please choose a status to apply.');
      return;
    }

    if (selectedTicketIds.size === 0) return;

    for (const ticketId of selectedTicketIds) {
      await window.CamPulseDB.updateTicketStatus(ticketId, newStatus, 'Bulk Officer Action');
    }

    showToast(`Bulk updated ${selectedTicketIds.size} complaint(s) to ${formatStatusText(newStatus)}.`);
    selectedTicketIds.clear();
    bulkStatusSelect.value = '';
    checkSelectAll.checked = false;
    updateBulkToolbar();
    loadQueue();
  });

  // ── Render Analytics Summary & Distribution Bars (Phase 5 Item 27) ──
  async function renderAnalytics() {
    const data = await window.CamPulseDB.calculateAnalytics();

    document.getElementById('adm-stat-total').textContent = data.total;
    document.getElementById('adm-stat-rate').textContent = data.resolutionRate;
    document.getElementById('adm-stat-resolved').textContent = data.resolved;
    document.getElementById('adm-stat-response').textContent = data.avgResponseHours;
    document.getElementById('adm-stat-satisfaction').textContent = data.avgSatisfaction;
    document.getElementById('adm-stat-overdue').textContent = data.overdueCount;

    // Render Category Distribution
    const catContainer = document.getElementById('chart-by-category');
    if (catContainer) {
      catContainer.innerHTML = Object.entries(data.byCategory).map(([cat, count]) => {
        const pct = data.total > 0 ? Math.round((count / data.total) * 100) : 0;
        return `
          <div class="bar-row">
            <div class="bar-row-header">
              <span><strong>${cat}</strong></span>
              <span>${count} (${pct}%)</span>
            </div>
            <div class="bar-track">
              <div class="bar-fill" style="width:${pct}%;"></div>
            </div>
          </div>
        `;
      }).join('');
    }

    // Render Department Distribution
    const deptContainer = document.getElementById('chart-by-department');
    if (deptContainer) {
      deptContainer.innerHTML = Object.entries(data.byDepartment).map(([dept, count]) => {
        const pct = data.total > 0 ? Math.round((count / data.total) * 100) : 0;
        return `
          <div class="bar-row">
            <div class="bar-row-header">
              <span><strong>${dept}</strong></span>
              <span>${count} (${pct}%)</span>
            </div>
            <div class="bar-track">
              <div class="bar-fill" style="width:${pct}%;background:#0284c7;"></div>
            </div>
          </div>
        `;
      }).join('');
    }
  }

  // ── Drawer Management (Phase 5 Item 26 & 28) ─────────────────────────
  async function openDrawer(ticketId) {
    currentDrawerTicket = await window.CamPulseDB.fetchTicketById(ticketId);
    if (!currentDrawerTicket) return;

    drawerTicketId.textContent = currentDrawerTicket.id;
    drawerTicketCategory.textContent = currentDrawerTicket.category;
    drawerTicketTitle.textContent = currentDrawerTicket.subject;
    drawerDescription.textContent = currentDrawerTicket.description;
    drawerStatusSelect.value = currentDrawerTicket.status;

    // SLA Badge
    const sla = getSlaInfo(currentDrawerTicket);
    drawerSlaBadge.className = `sla-badge ${sla.badgeClass}`;
    drawerSlaBadge.textContent = sla.label;

    // Moderation Button State (Phase 5 Item 28)
    drawerModBtn.textContent = currentDrawerTicket.isModerated ? 'Restore Complaint' : 'Flag / Hide Abusive';
    drawerModBtn.style.color = currentDrawerTicket.isModerated ? '#16a34a' : '#dc2626';

    // Meta Info
    drawerMetaInfo.innerHTML = `
      <div><strong>Location:</strong> ${currentDrawerTicket.locationZone || 'Campus'} ${currentDrawerTicket.locationDetails ? `— ${currentDrawerTicket.locationDetails}` : ''}</div>
      <div><strong>Student Name:</strong> ${currentDrawerTicket.isAnonymous && currentRole !== 'super_admin' ? 'Anonymous Student' : (currentDrawerTicket.studentName || 'Student')}</div>
      ${currentRole === 'super_admin' ? `<div><strong>Super Admin Audit:</strong> Matric: ${currentDrawerTicket.studentMatric || 'N/A'} | Email: ${currentDrawerTicket.studentEmail || 'N/A'}</div>` : ''}
      <div><strong>Assigned Department:</strong> ${currentDrawerTicket.department}</div>
      <div><strong>Submission Date:</strong> ${new Date(currentDrawerTicket.createdAt).toLocaleString()}</div>
    `;

    // Attachments
    const atts = currentDrawerTicket.attachments || [];
    if (atts.length === 0) {
      drawerAttachmentsList.innerHTML = '<span style="font-size:0.75rem;color:var(--clr-gray-500);">No files attached to this complaint.</span>';
    } else {
      drawerAttachmentsList.innerHTML = atts.map(att => `
        <a href="${att.url}" target="_blank" class="attachment-chip" style="font-size:0.75rem;padding:0.35rem 0.6rem;text-decoration:none;display:inline-flex;align-items:center;gap:4px;">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
          ${att.name}
        </a>
      `).join('');
    }

    // Public Comments
    renderDrawerComments();

    // Internal Notes (Phase 5 Item 26)
    renderDrawerInternalNotes();

    // Reset to Details tab
    switchDrawerTab('tab-details');

    drawer.hidden = false;
    document.body.classList.add('modal-open');
  }

  function renderDrawerComments() {
    const comments = currentDrawerTicket.comments || [];
    if (comments.length === 0) {
      drawerCommentsList.innerHTML = '<p style="font-size:0.75rem;color:var(--clr-gray-500);">No official replies posted yet.</p>';
      return;
    }
    drawerCommentsList.innerHTML = comments.map(c => `
      <div class="comment-bubble ${c.authorRole === 'staff' ? 'staff' : ''}">
        <div class="comment-header">
          <span class="comment-author">${c.authorName}</span>
          ${c.authorRole === 'staff' ? '<span class="comment-badge">Official Response</span>' : ''}
          <span class="comment-time">${timeAgo(c.createdAt)}</span>
        </div>
        <p class="comment-text">${c.message}</p>
      </div>
    `).join('');
  }

  function renderDrawerInternalNotes() {
    const notes = currentDrawerTicket.internalNotes || [];
    internalNotesCount.textContent = notes.length;

    if (notes.length === 0) {
      drawerInternalNotesList.innerHTML = '<p style="font-size:0.75rem;color:var(--clr-gray-500);margin:0;">No internal technician remarks recorded yet.</p>';
      return;
    }

    drawerInternalNotesList.innerHTML = notes.map(n => `
      <div class="internal-note-bubble">
        <div style="display:flex;justify-content:space-between;font-size:0.7rem;color:var(--clr-gray-600);margin-bottom:2px;">
          <strong>${n.author}</strong>
          <span>${timeAgo(n.createdAt)}</span>
        </div>
        <div style="font-size:0.8rem;color:var(--clr-gray-900);line-height:1.4;">${n.text}</div>
      </div>
    `).join('');
  }

  function switchDrawerTab(tabName) {
    drawerTabs.forEach(t => t.classList.toggle('active', t.dataset.tab === tabName));
    document.getElementById('drawer-pane-details').hidden = tabName !== 'tab-details';
    document.getElementById('drawer-pane-comments').hidden = tabName !== 'tab-comments';
    document.getElementById('drawer-pane-internal-notes').hidden = tabName !== 'tab-internal-notes';
  }

  drawerTabs.forEach(tab => {
    tab.addEventListener('click', () => switchDrawerTab(tab.dataset.tab));
  });

  drawerCloseBtn.addEventListener('click', () => {
    drawer.hidden = true;
    document.body.classList.remove('modal-open');
  });

  // Drawer Update Status
  drawerUpdateStatusBtn.addEventListener('click', async () => {
    if (!currentDrawerTicket) return;
    const newStatus = drawerStatusSelect.value;
    await window.CamPulseDB.updateTicketStatus(currentDrawerTicket.id, newStatus, `${currentRole} action`);
    showToast(`Status updated to ${formatStatusText(newStatus)}.`);
    loadQueue();
    openDrawer(currentDrawerTicket.id);
  });

  // Drawer Moderation Toggle (Phase 5 Item 28)
  drawerModBtn.addEventListener('click', async () => {
    if (!currentDrawerTicket) return;
    const willHide = !currentDrawerTicket.isModerated;
    await window.CamPulseDB.moderateTicket(currentDrawerTicket.id, willHide, 'Officer moderation action');
    showToast(willHide ? 'Complaint hidden from public board & student view.' : 'Complaint restored to active queue.');
    loadQueue();
    openDrawer(currentDrawerTicket.id);
  });

  // Post Staff Response
  drawerCommentForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentDrawerTicket) return;
    const msg = drawerCommentInput.value.trim();
    if (!msg) return;

    await window.CamPulseDB.addComment(currentDrawerTicket.id, msg, 'staff');
    drawerCommentInput.value = '';
    showToast('Official staff response posted and student notified.');
    openDrawer(currentDrawerTicket.id);
  });

  // Add Internal Staff Note (Phase 5 Item 26)
  drawerInternalNoteForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentDrawerTicket) return;
    const note = drawerInternalNoteInput.value.trim();
    if (!note) return;

    await window.CamPulseDB.addInternalNote(currentDrawerTicket.id, note, currentStaff || 'Department Officer');
    drawerInternalNoteInput.value = '';
    showToast('Internal confidential note saved.');
    openDrawer(currentDrawerTicket.id);
  });

  // ── CSV Export (Phase 5 Item 27) ────────────────────────────────────
  btnExportCsv.addEventListener('click', async () => {
    const csvData = await window.CamPulseDB.exportTicketsCSV();
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `campulse_complaints_export_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Institutional complaints exported to CSV.');
  });

  // ── Demo Reset (Phase 6 Item 35) ────────────────────────────────────
  btnResetDemo.addEventListener('click', () => {
    if (confirm('Reset all ticket data back to the clean presentation seed state?')) {
      window.CamPulseDB.resetDemoData();
      showToast('Demo data restored successfully.');
      loadQueue();
    }
  });

  // ── Filter listeners ────────────────────────────────────────────────
  let searchTimer = null;
  searchInput.addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(loadQueue, 250);
  });

  filterStatus.addEventListener('change', loadQueue);
  filterCategory.addEventListener('change', loadQueue);
  filterSla.addEventListener('change', loadQueue);
  sortBySelect.addEventListener('change', loadQueue);

  // Initialize
  loadQueue();
});
