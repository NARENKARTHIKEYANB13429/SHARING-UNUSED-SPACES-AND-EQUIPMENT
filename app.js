/**
 * ShareSpace Main Application Logic
 * Comprehensive state management, conflict checks, eligibility validation,
 * digital inspection checklists, audit history, and role switching.
 */

// State Container
const State = {
  users: [],
  resources: [],
  bookings: [],
  incidents: [],
  auditLogs: [],
  activeUserId: "usr-alex",
  currentTab: "browse", // "browse", "bookings", "manage", "incidents", "audit"
  searchQuery: "",
  selectedCategory: "All",
  selectedEligibility: "All",
  notifications: [
    { id: "notif-1", title: "Booking Approved", text: "Dr. Marcus Vance approved your reservation for Formlabs Form 3B+.", time: "10 mins ago", unread: true },
    { id: "notif-2", title: "Check-In Window Open", text: "Your session starts at 14:00. You may now perform the pre-use condition check.", time: "25 mins ago", unread: true },
    { id: "notif-3", title: "Waitlist Update", text: "A spot opened up for high performance GPU cluster.", time: "2 hours ago", unread: false }
  ]
};

// Initialize or Load State from localStorage
function initStorage() {
  const savedUsers = localStorage.getItem("sharespace_users");
  const savedResources = localStorage.getItem("sharespace_resources");
  const savedBookings = localStorage.getItem("sharespace_bookings");
  const savedIncidents = localStorage.getItem("sharespace_incidents");
  const savedAuditLogs = localStorage.getItem("sharespace_audit_logs");
  const savedActiveUser = localStorage.getItem("sharespace_active_user");

  if (savedUsers && savedResources && savedBookings) {
    try {
      State.users = JSON.parse(savedUsers);
      State.resources = JSON.parse(savedResources);
      State.bookings = JSON.parse(savedBookings);
      State.incidents = savedIncidents ? JSON.parse(savedIncidents) : SEED_INCIDENTS;
      State.auditLogs = savedAuditLogs ? JSON.parse(savedAuditLogs) : SEED_AUDIT_LOGS;
      State.activeUserId = savedActiveUser || "usr-alex";
    } catch (e) {
      console.warn("Error parsing localStorage, resetting to seed data", e);
      resetToSeedData(false);
    }
  } else {
    resetToSeedData(false);
  }
}

function saveState() {
  localStorage.setItem("sharespace_users", JSON.stringify(State.users));
  localStorage.setItem("sharespace_resources", JSON.stringify(State.resources));
  localStorage.setItem("sharespace_bookings", JSON.stringify(State.bookings));
  localStorage.setItem("sharespace_incidents", JSON.stringify(State.incidents));
  localStorage.setItem("sharespace_audit_logs", JSON.stringify(State.auditLogs));
  localStorage.setItem("sharespace_active_user", State.activeUserId);
}

function resetToSeedData(notify = true) {
  State.users = JSON.parse(JSON.stringify(SEED_USERS));
  State.resources = JSON.parse(JSON.stringify(SEED_RESOURCES));
  State.bookings = JSON.parse(JSON.stringify(SEED_BOOKINGS));
  State.incidents = JSON.parse(JSON.stringify(SEED_INCIDENTS));
  State.auditLogs = JSON.parse(JSON.stringify(SEED_AUDIT_LOGS));
  State.activeUserId = "usr-alex";
  saveState();
  if (notify) {
    showToast("Application data reset to institutional demo seed state.", "success");
    renderApp();
  }
}

// Helpers
function getActiveUser() {
  return State.users.find(u => u.id === State.activeUserId) || State.users[0];
}

function getResource(id) {
  return State.resources.find(r => r.id === id);
}

function formatDateTime(dateStr) {
  return dateStr;
}

function recordAudit(action, target, details) {
  const user = getActiveUser();
  const now = new Date();
  const timestamp = now.toISOString().replace("T", " ").substring(0, 19);
  const logItem = {
    id: "aud-" + Date.now(),
    timestamp,
    actor: user.name + ` (${user.roleLabel})`,
    action,
    target,
    details
  };
  State.auditLogs.unshift(logItem);
  saveState();
}

function showToast(message, type = "info") {
  const shelf = document.getElementById("toast-shelf");
  if (!shelf) return;
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  
  let iconSvg = "ℹ️";
  if (type === "success") iconSvg = "✅";
  if (type === "error") iconSvg = "⚠️";
  if (type === "warning") iconSvg = "🔔";

  toast.innerHTML = `
    <span style="font-size:1.2rem;">${iconSvg}</span>
    <div style="flex:1; font-size:0.875rem;">${message}</div>
    <button onclick="this.parentElement.remove()" style="background:none;border:none;color:var(--text-muted);cursor:pointer;font-size:1rem;">&times;</button>
  `;
  shelf.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateX(100%)";
    toast.style.transition = "all 0.3s ease";
    setTimeout(() => toast.remove(), 300);
  }, 4500);
}

// Conflict Detection Algorithm
function checkSchedulingConflict(resourceId, date, startTime, endTime, excludeBookingId = null) {
  // Overlap condition: start < existingEnd && end > existingStart
  const conflicting = State.bookings.filter(b => {
    if (b.resourceId !== resourceId) return false;
    if (excludeBookingId && b.id === excludeBookingId) return false;
    if (b.status === "Rejected" || b.status === "Cancelled" || b.status === "Completed") return false;
    if (b.date !== date) return false;

    return (startTime < b.endTime && endTime > b.startTime);
  });

  return {
    hasConflict: conflicting.length > 0,
    conflicts: conflicting
  };
}

// Eligibility Verification Algorithm
function checkUserEligibility(user, resource) {
  if (!resource.requiredCertifications || resource.requiredCertifications.length === 0) {
    return { isEligible: true, missing: [] };
  }
  const userCertIds = (user.certifications || []).map(c => c.id);
  const missing = resource.requiredCertifications.filter(cId => !userCertIds.includes(cId));
  return {
    isEligible: missing.length === 0,
    missing: missing
  };
}

// Fair-use quota calculator
function getUserWeeklyUsage(user) {
  let used = user.weeklyHoursUsed || 0;
  // Calculate hours in pending or approved bookings for this user
  const activeBookings = State.bookings.filter(b => b.userId === user.id && (b.status === "Approved" || b.status === "Checked-In"));
  return {
    totalAllocated: user.weeklyQuotaHours || 15,
    usedHours: used,
    remainingHours: Math.max(0, (user.weeklyQuotaHours || 15) - used)
  };
}

// Switch User Role
function switchActiveUser(userId) {
  State.activeUserId = userId;
  saveState();
  const user = getActiveUser();
  showToast(`Switched active persona to ${user.name} (${user.roleLabel})`, "info");
  
  // If switched to admin or owner, auto-switch to relevant tab if in user-only context
  if (user.role === "owner" && State.currentTab === "browse") {
    // keep browse or show owner requests
  }
  renderApp();
}

// Switch Main Navigation Tab
function switchTab(tabName) {
  State.currentTab = tabName;
  renderApp();
}

// RENDER APPLICATION
function renderApp() {
  renderNavbar();
  renderDemoBar();
  
  const contentArea = document.getElementById("main-content-area");
  if (!contentArea) return;

  switch (State.currentTab) {
    case "browse":
      renderBrowseView(contentArea);
      break;
    case "bookings":
      renderBookingsView(contentArea);
      break;
    case "manage":
      renderManageView(contentArea);
      break;
    case "incidents":
      renderIncidentsView(contentArea);
      break;
    case "audit":
      renderAuditView(contentArea);
      break;
    default:
      renderBrowseView(contentArea);
  }
}

// Render Top Navbar & Role Switcher
function renderNavbar() {
  const user = getActiveUser();
  const userSelect = document.getElementById("role-select-box");
  if (userSelect) {
    userSelect.innerHTML = State.users.map(u => `
      <option value="${u.id}" ${u.id === user.id ? "selected" : ""}>
        ${u.name} — ${u.roleLabel}
      </option>
    `).join("");
  }

  const roleAvatar = document.getElementById("role-avatar-badge");
  if (roleAvatar) {
    roleAvatar.textContent = user.avatar;
    roleAvatar.style.backgroundColor = user.avatarColor;
  }

  // Update tabs active state
  document.querySelectorAll(".nav-tab-btn").forEach(btn => {
    btn.classList.remove("active");
    if (btn.dataset.tab === State.currentTab) {
      btn.classList.add("active");
    }
  });

  // Pending requests badge for owners/managers
  const pendingRequestsCount = State.bookings.filter(b => b.status === "Requested").length;
  const manageBadge = document.getElementById("manage-tab-badge");
  if (manageBadge) {
    manageBadge.textContent = pendingRequestsCount;
    manageBadge.style.display = pendingRequestsCount > 0 ? "inline-block" : "none";
  }

  // Active bookings badge for students
  const userActiveCount = State.bookings.filter(b => b.userId === user.id && (b.status === "Approved" || b.status === "Checked-In")).length;
  const bookingsBadge = document.getElementById("bookings-tab-badge");
  if (bookingsBadge) {
    bookingsBadge.textContent = userActiveCount;
    bookingsBadge.style.display = userActiveCount > 0 ? "inline-block" : "none";
  }

  // Update Auth Buttons in Navbar
  const authContainer = document.getElementById("auth-buttons");
  if (authContainer) {
    authContainer.innerHTML = `
      <button class="btn btn-secondary btn-sm" onclick="openLoginModal()" title="Sign in as another account or persona">
        🔑 Login
      </button>
      <button class="btn btn-primary btn-sm" onclick="openSignupModal()" title="Register a new campus member">
        ✨ Sign Up
      </button>
      <button class="btn btn-secondary btn-sm" onclick="handleLogout()" title="Log out current session" style="color:var(--rose); border-color:var(--rose-border);">
        🚪 Logout
      </button>
    `;
  }
}

// Render Fair Use / Demo Helper Banner
function renderDemoBar() {
  const bar = document.getElementById("demo-status-banner");
  if (!bar) return;
  const user = getActiveUser();
  const quota = getUserWeeklyUsage(user);
  const percentage = Math.min(100, Math.round((quota.usedHours / quota.totalAllocated) * 100));

  bar.innerHTML = `
    <div class="demo-banner-content">
      <span class="role-pill" style="background:${user.avatarColor}25; color:${user.avatarColor}; border:1px solid ${user.avatarColor}50;">
        Active Persona: ${user.name} (${user.role.toUpperCase()})
      </span>
      <span style="color:var(--text-secondary);">${user.department}</span>
      ${user.role === 'user' ? `
        <div class="quota-indicator" title="Fair Use quota prevents monopolisation of high-demand lab equipment">
          <span style="font-size:0.75rem; color:var(--text-muted);">Weekly Fair-Use:</span>
          <strong>${quota.usedHours} / ${quota.totalAllocated} hrs</strong>
          <div class="quota-bar-wrapper">
            <div class="quota-bar-fill" style="width:${percentage}%; background:${percentage > 85 ? 'var(--rose)' : 'var(--emerald)'};"></div>
          </div>
        </div>
      ` : `
        <span style="color:var(--emerald); font-size:0.8rem; font-weight:600;">
          🛡️ Management Authorization Active (Audit & Approval Controls Enabled)
        </span>
      `}
    </div>
    <div style="display:flex; align-items:center; gap:0.5rem;">
      <button class="btn btn-secondary btn-sm" onclick="resetToSeedData(true)">
        🔄 Reset Demo State
      </button>
    </div>
  `;
}

// 1. BROWSE RESOURCES VIEW
function renderBrowseView(container) {
  const user = getActiveUser();
  const categories = ["All", "Makerspace", "High Performance Compute", "AV & Creative Media", "Biological & Cleanroom", "Robotics & Automation"];

  let filtered = State.resources.filter(r => {
    // category filter
    if (State.selectedCategory !== "All" && r.category !== State.selectedCategory) return false;
    
    // search text
    if (State.searchQuery) {
      const q = State.searchQuery.toLowerCase();
      const match = r.title.toLowerCase().includes(q) || 
                    r.description.toLowerCase().includes(q) || 
                    r.location.toLowerCase().includes(q) ||
                    r.category.toLowerCase().includes(q);
      if (!match) return false;
    }

    // eligibility filter
    if (State.selectedEligibility === "EligibleOnly") {
      const eligibility = checkUserEligibility(user, r);
      if (!eligibility.isEligible) return false;
    }

    return true;
  });

  container.innerHTML = `
    <!-- Hero Banner -->
    <div class="hero-card">
      <img src="assets/images/hero_banner.jpg" alt="ShareSpace Campus Innovation Hub" class="hero-background-img" />
      <div class="hero-overlay">
        <div class="hero-tag">
          <span>🏛️ Trusted Resource Sharing</span>
          <span>•</span>
          <span>Fair Access Platform</span>
        </div>
        <h2>Unlock Underused Equipment, Labs & Creative Spaces</h2>
        <p>Safely access precision CNCs, 3D printers, high-end GPU clusters, cinema gear, and cleanrooms. Built-in verification, condition check-ins, and conflict-free scheduling.</p>
        <div class="hero-actions">
          <button class="btn btn-primary" onclick="document.getElementById('search-resource-input').focus()">
            🔍 Explore Resources
          </button>
          ${user.role === 'owner' || user.role === 'admin' ? `
            <button class="btn btn-secondary" onclick="openCreateResourceModal()">
              ➕ List a New Resource
            </button>
          ` : `
            <button class="btn btn-secondary" onclick="openCertificationsModal()">
              📜 View My Verified Certifications
            </button>
          `}
        </div>
      </div>
    </div>

    <!-- Quick Stats Metric Strip -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon" style="background:var(--primary-glow); color:var(--primary);">🏢</div>
        <div class="stat-info">
          <div class="stat-value">${State.resources.length}</div>
          <div class="stat-label">Listed Resources</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="background:var(--emerald-bg); color:var(--emerald);">⚡</div>
        <div class="stat-info">
          <div class="stat-value">${State.bookings.filter(b => b.status === "Approved" || b.status === "Checked-In").length}</div>
          <div class="stat-label">Active Reservations</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="background:var(--amber-bg); color:var(--amber);">⏳</div>
        <div class="stat-info">
          <div class="stat-value">${State.bookings.filter(b => b.status === "Requested").length}</div>
          <div class="stat-label">Pending Owner Review</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="background:var(--cyan-bg); color:var(--cyan);">🛡️</div>
        <div class="stat-info">
          <div class="stat-value">100%</div>
          <div class="stat-label">Condition Inspected</div>
        </div>
      </div>
    </div>

    <!-- Search & Filter Controls -->
    <div class="filter-search-container">
      <div class="search-primary-row">
        <div class="search-input-wrapper">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
          <input 
            type="text" 
            id="search-resource-input"
            class="search-input" 
            placeholder="Search by resource name, lab room, equipment type, or specs..." 
            value="${State.searchQuery}"
            oninput="handleSearchInput(this.value)"
          />
        </div>
        <select class="filter-select" onchange="handleEligibilityFilter(this.value)">
          <option value="All" ${State.selectedEligibility === 'All' ? 'selected' : ''}>All Requirements</option>
          <option value="EligibleOnly" ${State.selectedEligibility === 'EligibleOnly' ? 'selected' : ''}>Verified Eligible Only (For You)</option>
        </select>
        ${user.role === 'owner' || user.role === 'admin' ? `
          <button class="btn btn-primary" onclick="openCreateResourceModal()">
            ➕ List Resource
          </button>
        ` : ''}
      </div>

      <div class="filter-chips-row">
        <span class="filter-label">Categories:</span>
        ${categories.map(cat => `
          <button 
            class="chip-btn ${State.selectedCategory === cat ? 'active' : ''}" 
            onclick="handleCategoryFilter('${cat}')"
          >
            ${cat}
          </button>
        `).join("")}
      </div>
    </div>

    <!-- Section Title -->
    <div class="section-header">
      <h3 class="section-title">
        <span>Available Spaces & Equipment</span>
        <span style="font-size:0.85rem; font-weight:500; color:var(--text-muted);">(${filtered.length} resources found)</span>
      </h3>
      <div style="font-size:0.8rem; color:var(--text-muted);">
        Viewing as <strong style="color:var(--text-primary);">${user.name}</strong>
      </div>
    </div>

    <!-- Resource Grid -->
    <div class="resources-grid">
      ${filtered.length === 0 ? `
        <div style="grid-column: 1/-1; padding:3rem; text-align:center; background:var(--bg-surface); border-radius:var(--radius-lg); border:1px dashed var(--border-subtle);">
          <div style="font-size:2rem; margin-bottom:0.5rem;">🔍</div>
          <h4>No matching resources found</h4>
          <p style="color:var(--text-muted); font-size:0.875rem; margin-top:0.25rem;">Try clearing your filters or searching for terms like "3D printer", "GPU", "camera", or "cleanroom".</p>
          <button class="btn btn-secondary btn-sm" style="margin-top:1rem;" onclick="clearFilters()">Reset Filters</button>
        </div>
      ` : filtered.map(res => renderResourceCard(res, user)).join("")}
    </div>
  `;
}

function renderResourceCard(res, user) {
  const eligibility = checkUserEligibility(user, res);
  let statusBadge = `<span class="status-pill status-available">● Available</span>`;
  if (res.status === "In Use") {
    statusBadge = `<span class="status-pill status-in-use">● In Use</span>`;
  } else if (res.status === "Maintenance") {
    statusBadge = `<span class="status-pill status-maintenance">● Maintenance</span>`;
  }

  return `
    <div class="resource-card" id="card-${res.id}">
      <div class="resource-thumb-box">
        <img src="${res.image}" alt="${res.title}" class="resource-img" onerror="this.src='assets/images/hero_banner.jpg'" />
        <div class="resource-badges-top">
          <span class="category-tag">${res.category}</span>
          ${statusBadge}
        </div>
      </div>
      <div class="resource-body">
        <h4 class="resource-title">${res.title}</h4>
        <div class="resource-location">
          <span>📍</span>
          <span>${res.location}</span>
        </div>
        <p class="resource-description">${res.description}</p>
        
        <div class="eligibility-box">
          <div class="eligibility-header">
            <span>Eligibility & Safety</span>
            ${eligibility.isEligible ? `
              <span style="color:var(--emerald); font-weight:700;">✓ You're Qualified</span>
            ` : `
              <span style="color:var(--rose); font-weight:700;">⚠️ Training Needed</span>
            `}
          </div>
          <div class="eligibility-items">
            ${(res.requiredCertifications && res.requiredCertifications.length > 0) ? res.requiredCertifications.map(cId => {
              const hasIt = (user.certifications || []).some(uc => uc.id === cId);
              const label = cId === "cert-laser" ? "Laser/Machine Safety L1" : (cId === "cert-biosafety" ? "BioSafety L1/2" : (cId === "cert-media" ? "Media Induction" : cId));
              return `
                <span class="req-badge ${hasIt ? 'met' : 'unmet'}">
                  ${hasIt ? '✓' : '✗'} ${label}
                </span>
              `;
            }).join("") : `
              <span class="req-badge met">✓ Open Access with Student ID</span>
            `}
            ${res.requiresSupervision ? `
              <span class="req-badge neutral">👥 Faculty Supervision Required</span>
            ` : ''}
          </div>
        </div>

        <div style="font-size:0.775rem; color:var(--text-muted); margin-bottom:1rem; display:flex; align-items:center; gap:0.4rem;">
          <span>⚖️</span>
          <span>${res.fairUseLimit}</span>
        </div>

        <div class="resource-footer">
          <div class="owner-info">
            <div class="owner-avatar-sm">${res.ownerName.split(" ").map(w=>w[0]).join("")}</div>
            <div style="display:flex; flex-direction:column;">
              <span class="owner-name">${res.ownerName}</span>
              <span style="font-size:0.65rem; color:var(--text-muted);">${res.ownerDept}</span>
            </div>
          </div>
          <button class="btn btn-primary btn-sm" onclick="openBookingModal('${res.id}')">
            Request Booking
          </button>
        </div>
      </div>
    </div>
  `;
}

// 2. USER & ACTIVE BOOKINGS VIEW
function renderBookingsView(container) {
  const user = getActiveUser();
  // Filter bookings: if user is student, show their bookings; if admin, show all; if owner, show requests for their managed equipment
  let displayBookings = State.bookings;
  if (user.role === 'user') {
    displayBookings = State.bookings.filter(b => b.userId === user.id);
  }

  container.innerHTML = `
    <div class="section-header">
      <div>
        <h3 class="section-title">My Booking Requests & Activity</h3>
        <p style="color:var(--text-secondary); font-size:0.875rem;">Manage approved check-ins, return checklists, and monitor request reviews.</p>
      </div>
      <div style="display:flex; gap:0.5rem;">
        <button class="btn btn-secondary btn-sm" onclick="switchTab('browse')">➕ Request New Booking</button>
      </div>
    </div>

    <!-- Active Check-In Banner if there's an approved booking ready -->
    ${renderCheckInAlertBanner(user)}

    <div style="margin-top:1.5rem;">
      ${displayBookings.length === 0 ? `
        <div style="padding:3rem; text-align:center; background:var(--bg-surface); border-radius:var(--radius-lg); border:1px dashed var(--border-subtle);">
          <div style="font-size:2rem; margin-bottom:0.5rem;">📅</div>
          <h4>No bookings found for ${user.name}</h4>
          <p style="color:var(--text-muted); font-size:0.875rem; margin-top:0.25rem;">Browse available spaces and tools, verify your safety qualifications, and book a slot.</p>
          <button class="btn btn-primary btn-sm" style="margin-top:1rem;" onclick="switchTab('browse')">Browse Resources</button>
        </div>
      ` : displayBookings.map(bkg => renderBookingCard(bkg, user)).join("")}
    </div>
  `;
}

function renderCheckInAlertBanner(user) {
  const readyToIn = State.bookings.find(b => b.userId === user.id && b.status === "Approved");
  const readyToOut = State.bookings.find(b => b.userId === user.id && b.status === "Checked-In");

  if (readyToIn) {
    return `
      <div class="alert-banner success" style="margin-top:1rem;">
        <div style="font-size:1.5rem;">🚀</div>
        <div style="flex:1;">
          <h5 style="font-size:0.95rem; font-weight:700; color:#10b981;">Approved Booking Ready for Check-In!</h5>
          <p style="font-size:0.825rem; margin-top:2px;">Your reservation for <strong>${readyToIn.resourceTitle}</strong> on ${readyToIn.date} (${readyToIn.startTime} - ${readyToIn.endTime}) is approved. Complete your pre-use condition checklist to gain access.</p>
        </div>
        <button class="btn btn-success btn-sm" onclick="openCheckInModal('${readyToIn.id}')">
          📝 Begin Check-In
        </button>
      </div>
    `;
  }

  if (readyToOut) {
    return `
      <div class="alert-banner info" style="margin-top:1rem;">
        <div style="font-size:1.5rem;">⏱️</div>
        <div style="flex:1;">
          <h5 style="font-size:0.95rem; font-weight:700; color:#38bdf8;">Session Currently Active (Checked In)</h5>
          <p style="font-size:0.825rem; margin-top:2px;">You are currently using <strong>${readyToOut.resourceTitle}</strong>. When you are finished, inspect the equipment and complete the return sign-off.</p>
        </div>
        <button class="btn btn-primary btn-sm" onclick="openCheckOutModal('${readyToOut.id}')">
          🏁 Complete Return Check-Out
        </button>
      </div>
    `;
  }

  return '';
}

function renderBookingCard(bkg, user) {
  let statusBadge = "";
  switch(bkg.status) {
    case "Requested":
      statusBadge = `<span class="status-pill status-maintenance" style="background:var(--amber-bg); color:var(--amber);">⏳ Pending Review</span>`;
      break;
    case "Approved":
      statusBadge = `<span class="status-pill status-available">✓ Approved</span>`;
      break;
    case "Checked-In":
      statusBadge = `<span class="status-pill status-in-use">● Checked-In (Active)</span>`;
      break;
    case "Completed":
      statusBadge = `<span class="status-pill" style="background:rgba(255,255,255,0.08); color:var(--text-secondary);">🏁 Completed & Returned</span>`;
      break;
    case "Waitlisted":
      statusBadge = `<span class="status-pill" style="background:var(--purple-bg); color:var(--purple); border:1px solid var(--purple-border);">📋 Waitlisted (Queue)</span>`;
      break;
    case "Rejected":
      statusBadge = `<span class="status-pill" style="background:var(--rose-bg); color:var(--rose); border:1px solid var(--rose-border);">✗ Declined</span>`;
      break;
  }

  return `
    <div class="booking-item-card" id="bkg-${bkg.id}">
      <div class="booking-main-details">
        <div class="booking-title-line">
          <span class="booking-res-title">${bkg.resourceTitle}</span>
          ${statusBadge}
          <span style="font-family:var(--font-mono); font-size:0.75rem; color:var(--text-muted); background:var(--bg-surface-elevated); padding:2px 6px; border-radius:var(--radius-sm); border:1px solid var(--border-subtle);">#${bkg.id}</span>
        </div>
        <div class="booking-meta-line">
          <span>📅 <strong>${bkg.date}</strong></span>
          <span>🕒 <strong>${bkg.startTime} - ${bkg.endTime}</strong> (${bkg.durationHours} hrs)</span>
          <span>👤 Reserved by: <strong>${bkg.userName}</strong></span>
        </div>
        <div style="font-size:0.825rem; color:var(--text-secondary); margin-top:2px;">
          <strong>Intended Purpose:</strong> ${bkg.purpose}
        </div>
        ${bkg.approvalReason ? `
          <div class="booking-reason-box">
            <strong>${bkg.status === 'Approved' ? 'Approval Conditions / Note' : (bkg.status === 'Waitlisted' ? 'Waitlist Reason' : 'Reviewer Decision')}:</strong> 
            ${bkg.approvalReason}
            ${bkg.reviewerName ? `<span style="color:var(--text-muted); font-size:0.75rem; margin-left:6px;">— Reviewed by ${bkg.reviewerName}</span>` : ''}
          </div>
        ` : ''}

        ${bkg.checkInDetails ? `
          <div style="font-size:0.775rem; color:var(--emerald); margin-top:4px; display:flex; align-items:center; gap:0.4rem;">
            <span>✓ Pre-use check-in recorded at ${bkg.checkInDetails.timestamp}</span>
            <span>• Initial Rating: ${'★'.repeat(bkg.checkInDetails.rating)}</span>
          </div>
        ` : ''}

        ${bkg.checkOutDetails ? `
          <div style="font-size:0.775rem; color:var(--cyan); margin-top:2px; display:flex; align-items:center; gap:0.4rem;">
            <span>✓ Return check-out inspected at ${bkg.checkOutDetails.timestamp}</span>
            <span>• Cleanliness and parts accounted for</span>
          </div>
        ` : ''}
      </div>

      <div class="booking-actions">
        ${bkg.status === 'Approved' && (bkg.userId === user.id || user.role !== 'user') ? `
          <button class="btn btn-success btn-sm" onclick="openCheckInModal('${bkg.id}')">
            📝 Check-In (Before Use)
          </button>
        ` : ''}

        ${bkg.status === 'Checked-In' && (bkg.userId === user.id || user.role !== 'user') ? `
          <button class="btn btn-primary btn-sm" onclick="openCheckOutModal('${bkg.id}')">
            🏁 Return Check-Out
          </button>
        ` : ''}

        ${(bkg.status === 'Checked-In' || bkg.status === 'Completed') ? `
          <button class="btn btn-secondary btn-sm" onclick="openReportIncidentModal('${bkg.id}')">
            ⚠️ Report Issue / Delay
          </button>
        ` : ''}

        ${bkg.status === 'Requested' && bkg.userId === user.id ? `
          <button class="btn btn-secondary btn-sm" style="color:var(--rose);" onclick="cancelBooking('${bkg.id}')">
            Cancel Request
          </button>
        ` : ''}

        <button class="btn btn-secondary btn-sm" onclick="openBookingHistoryModal('${bkg.id}')">
          📜 Audit History
        </button>
      </div>
    </div>
  `;
}

// 3. OWNER & MANAGER REVIEW DASHBOARD VIEW
function renderManageView(container) {
  const user = getActiveUser();
  const pendingRequests = State.bookings.filter(b => b.status === "Requested");
  const waitlistedRequests = State.bookings.filter(b => b.status === "Waitlisted");
  const activeCheckouts = State.bookings.filter(b => b.status === "Checked-In");

  container.innerHTML = `
    <div class="section-header">
      <div>
        <h3 class="section-title">Owner & Lab Manager Decision Center</h3>
        <p style="color:var(--text-secondary); font-size:0.875rem;">
          Review incoming reservation requests, evaluate safety eligibility, manage competing requests, and enforce fair-use guidelines.
        </p>
      </div>
      <div style="display:flex; gap:0.5rem;">
        <button class="btn btn-primary btn-sm" onclick="openCreateResourceModal()">
          ➕ Add Resource Listing
        </button>
      </div>
    </div>

    <!-- Manager Summary Cards -->
    <div class="stats-grid" style="margin-top:1.5rem;">
      <div class="stat-card">
        <div class="stat-icon" style="background:var(--amber-bg); color:var(--amber);">📥</div>
        <div class="stat-info">
          <div class="stat-value">${pendingRequests.length}</div>
          <div class="stat-label">Pending Approval Requests</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="background:var(--purple-bg); color:var(--purple);">📋</div>
        <div class="stat-info">
          <div class="stat-value">${waitlistedRequests.length}</div>
          <div class="stat-label">Waitlisted Requests</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="background:var(--cyan-bg); color:var(--cyan);">🔬</div>
        <div class="stat-info">
          <div class="stat-value">${activeCheckouts.length}</div>
          <div class="stat-label">Currently Checked-In</div>
        </div>
      </div>
    </div>

    <!-- Incoming Requests Queue -->
    <div style="margin-top:2rem;">
      <div class="section-header">
        <h4 style="font-size:1.1rem; font-weight:700;">Incoming Requests Requiring Owner Action</h4>
        <span style="font-size:0.8rem; color:var(--text-muted);">${pendingRequests.length} awaiting decision</span>
      </div>

      ${pendingRequests.length === 0 ? `
        <div style="padding:2rem; text-align:center; background:var(--bg-surface); border-radius:var(--radius-lg); border:1px dashed var(--border-subtle); margin-bottom:2rem;">
          <div style="font-size:1.8rem; margin-bottom:0.4rem;">🎉</div>
          <h5>All pending requests have been reviewed!</h5>
          <p style="color:var(--text-muted); font-size:0.85rem;">No new booking requests are awaiting owner approval.</p>
        </div>
      ` : pendingRequests.map(req => renderManagerRequestCard(req)).join("")}
    </div>

    <!-- Active In-Use Resources -->
    <div style="margin-top:2.5rem;">
      <div class="section-header">
        <h4 style="font-size:1.1rem; font-weight:700;">Active Sessions & Live Check-In Records</h4>
      </div>
      ${activeCheckouts.length === 0 ? `
        <p style="color:var(--text-muted); font-size:0.85rem;">No equipment currently in active checked-in status.</p>
      ` : activeCheckouts.map(bkg => renderBookingCard(bkg, user)).join("")}
    </div>

    <!-- My Managed Listings -->
    <div style="margin-top:2.5rem;">
      <div class="section-header">
        <h4 style="font-size:1.1rem; font-weight:700;">All Campus Listings Directory</h4>
      </div>
      <div class="resources-grid">
        ${State.resources.map(res => renderResourceCard(res, user)).join("")}
      </div>
    </div>
  `;
}

function renderManagerRequestCard(req) {
  const resource = getResource(req.resourceId);
  const requester = State.users.find(u => u.id === req.userId) || { name: req.userName, certifications: [] };
  const eligibility = resource ? checkUserEligibility(requester, resource) : { isEligible: true, missing: [] };
  const conflict = checkSchedulingConflict(req.resourceId, req.date, req.startTime, req.endTime, req.id);

  return `
    <div class="booking-item-card" style="border-left:4px solid var(--amber);" id="req-card-${req.id}">
      <div class="booking-main-details">
        <div class="booking-title-line">
          <span class="booking-res-title">${req.resourceTitle}</span>
          <span class="status-pill status-maintenance" style="background:var(--amber-bg); color:var(--amber);">Pending Decision</span>
        </div>
        <div class="booking-meta-line">
          <span>👤 Requester: <strong>${req.userName}</strong> (${req.userDept})</span>
          <span>📅 Date: <strong>${req.date}</strong></span>
          <span>🕒 Slot: <strong>${req.startTime} - ${req.endTime}</strong> (${req.durationHours} hrs)</span>
        </div>
        <div style="font-size:0.85rem; color:var(--text-secondary); margin-top:0.25rem;">
          <strong>Stated Purpose:</strong> ${req.purpose}
        </div>

        <!-- Verification Alerts -->
        <div style="margin-top:0.5rem; display:flex; flex-direction:column; gap:0.4rem;">
          ${eligibility.isEligible ? `
            <div style="font-size:0.8rem; color:var(--emerald);">
              ✓ <strong>Safety Qualifications Met:</strong> Requester has all verified prerequisite certifications.
            </div>
          ` : `
            <div style="font-size:0.8rem; color:var(--rose);">
              ⚠️ <strong>Missing Safety Training:</strong> Requester lacks: ${eligibility.missing.join(", ")}. Supervised override required.
            </div>
          `}

          ${conflict.hasConflict ? `
            <div style="font-size:0.8rem; color:var(--amber);">
              ⚠️ <strong>Scheduling Conflict Detected:</strong> Overlaps with booking #${conflict.conflicts[0].id} (${conflict.conflicts[0].startTime} - ${conflict.conflicts[0].endTime}). Consider waitlisting.
            </div>
          ` : `
            <div style="font-size:0.8rem; color:var(--cyan);">
              ✓ <strong>No Schedule Conflicts:</strong> Slot is completely clear.
            </div>
          `}
        </div>
      </div>

      <div class="booking-actions" style="flex-direction:column; align-items:stretch; min-width:200px;">
        <button class="btn btn-success btn-sm" onclick="openApprovalDecisionModal('${req.id}', 'Approve')">
          ✓ Approve Request
        </button>
        <button class="btn btn-secondary btn-sm" style="color:var(--purple); border-color:var(--purple-border);" onclick="openApprovalDecisionModal('${req.id}', 'Waitlist')">
          📋 Waitlist Request
        </button>
        <button class="btn btn-secondary btn-sm" style="color:var(--rose); border-color:var(--rose-border);" onclick="openApprovalDecisionModal('${req.id}', 'Reject')">
          ✗ Decline with Reason
        </button>
      </div>
    </div>
  `;
}

// 4. INCIDENT, DAMAGE & RESOLUTION CENTER
function renderIncidentsView(container) {
  const user = getActiveUser();

  container.innerHTML = `
    <div class="section-header">
      <div>
        <h3 class="section-title">Incident, Damage & Delay Resolution Center</h3>
        <p style="color:var(--text-secondary); font-size:0.875rem;">
          Auditable tracking of equipment condition changes, late returns, safety infractions, and fair-access policy violations.
        </p>
      </div>
      <div>
        <button class="btn btn-danger btn-sm" onclick="openReportIncidentModal(null)">
          ⚠️ File Incident or Damage Report
        </button>
      </div>
    </div>

    <!-- Incident list -->
    <div style="margin-top:1.5rem; display:flex; flex-direction:column; gap:1rem;">
      ${State.incidents.length === 0 ? `
        <div style="padding:3rem; text-align:center; background:var(--bg-surface); border-radius:var(--radius-lg); border:1px dashed var(--border-subtle);">
          <div style="font-size:2rem; margin-bottom:0.5rem;">🛡️</div>
          <h4>Zero outstanding incidents!</h4>
          <p style="color:var(--text-muted); font-size:0.875rem;">All shared spaces and gear are accounted for in good standing.</p>
        </div>
      ` : State.incidents.map(inc => renderIncidentCard(inc, user)).join("")}
    </div>
  `;
}

function renderIncidentCard(inc, user) {
  let severityBadge = "";
  if (inc.severity === "Critical") severityBadge = `<span class="status-pill status-maintenance" style="background:var(--rose-bg); color:var(--rose);">Critical Severity</span>`;
  else if (inc.severity === "Medium") severityBadge = `<span class="status-pill status-maintenance" style="background:var(--amber-bg); color:var(--amber);">Medium Severity</span>`;
  else severityBadge = `<span class="status-pill status-maintenance" style="background:var(--cyan-bg); color:var(--cyan);">Low Severity</span>`;

  return `
    <div class="booking-item-card" style="border-left: 4px solid ${inc.severity === 'Critical' ? 'var(--rose)' : 'var(--amber)'};">
      <div class="booking-main-details">
        <div class="booking-title-line">
          <span class="booking-res-title">${inc.type}: ${inc.resourceTitle}</span>
          ${severityBadge}
          <span class="status-pill" style="background:rgba(255,255,255,0.06);">${inc.status}</span>
        </div>
        <div class="booking-meta-line">
          <span>📅 Reported: <strong>${inc.date}</strong></span>
          <span>👤 Reported By: <strong>${inc.reportedBy}</strong></span>
          <span>👥 User Involved: <strong>${inc.userInvolved}</strong></span>
        </div>
        <div style="font-size:0.85rem; color:var(--text-secondary); margin-top:0.4rem;">
          ${inc.description}
        </div>
        ${inc.resolution ? `
          <div class="booking-reason-box" style="border-left-color:var(--emerald);">
            <strong>Resolution & Administrative Action:</strong> ${inc.resolution}
          </div>
        ` : `
          <div style="font-size:0.8rem; color:var(--amber); margin-top:0.4rem;">
            ⏳ Awaiting administrative assessment and safety sign-off.
          </div>
        `}
      </div>

      <div class="booking-actions">
        ${(user.role === 'admin' || user.role === 'owner') && inc.status !== 'Resolved' ? `
          <button class="btn btn-primary btn-sm" onclick="openResolveIncidentModal('${inc.id}')">
            ⚖️ Resolve & Log Decision
          </button>
        ` : ''}
      </div>
    </div>
  `;
}

// 5. AUDIT & ACTIVITY TIMELINE
function renderAuditView(container) {
  container.innerHTML = `
    <div class="section-header">
      <div>
        <h3 class="section-title">Institutional Audit Trail & Activity Log</h3>
        <p style="color:var(--text-secondary); font-size:0.875rem;">
          Immutable ledger of resource requests, owner approvals, before-and-after condition inspections, cancellations, and incident interventions.
        </p>
      </div>
      <div>
        <button class="btn btn-secondary btn-sm" onclick="exportAuditTrail()">
          📥 Export Audit Log (JSON)
        </button>
      </div>
    </div>

    <div class="timeline-container">
      ${State.auditLogs.map(log => `
        <div class="timeline-node">
          <div class="timeline-dot">●</div>
          <div class="timeline-content">
            <div class="timeline-header">
              <span class="timeline-actor">${log.actor}</span>
              <span class="timeline-timestamp">${log.timestamp}</span>
            </div>
            <div style="font-size:0.8rem; font-weight:700; color:var(--primary); margin-bottom:2px;">
              [${log.action}] • ${log.target}
            </div>
            <div class="timeline-summary">
              ${log.details}
            </div>
          </div>
        </div>
      `).join("")}
    </div>
  `;
}

// ==========================================
// MODAL CONTROLLERS & WORKFLOW HANDLERS
// ==========================================

// Search & Filter event handlers
function handleSearchInput(val) {
  State.searchQuery = val;
  renderApp();
}

function handleCategoryFilter(cat) {
  State.selectedCategory = cat;
  renderApp();
}

function handleEligibilityFilter(elig) {
  State.selectedEligibility = elig;
  renderApp();
}

function clearFilters() {
  State.searchQuery = "";
  State.selectedCategory = "All";
  State.selectedEligibility = "All";
  renderApp();
}

// Modal management
function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.add("open");
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.remove("open");
}

// 1. BOOKING REQUEST MODAL
function openBookingModal(resourceId) {
  const resource = getResource(resourceId);
  if (!resource) return;
  const user = getActiveUser();
  const eligibility = checkUserEligibility(user, resource);
  const quota = getUserWeeklyUsage(user);

  // Set default dates
  const today = "2026-10-28";
  const modalBody = document.getElementById("booking-modal-body");
  
  modalBody.innerHTML = `
    <div style="display:flex; gap:1rem; align-items:center; background:var(--bg-surface-elevated); padding:0.75rem 1rem; border-radius:var(--radius-md);">
      <img src="${resource.image}" style="width:64px; height:64px; border-radius:var(--radius-sm); object-fit:cover;" onerror="this.src='assets/images/hero_banner.jpg'" />
      <div>
        <h4 style="font-size:1rem; font-weight:700;">${resource.title}</h4>
        <div style="font-size:0.8rem; color:var(--text-muted);">${resource.location} • Managed by ${resource.ownerName}</div>
      </div>
    </div>

    <!-- Eligibility Check Banner -->
    ${eligibility.isEligible ? `
      <div class="alert-banner success">
        <span>✓</span>
        <div>
          <strong>Prerequisites Verified:</strong> You possess all required qualifications for this resource.
        </div>
      </div>
    ` : `
      <div class="alert-banner warning">
        <span>⚠️</span>
        <div>
          <strong>Missing Certifications:</strong> Requires ${eligibility.missing.join(", ")}. 
          You may request an expedited supervisor waiver below.
        </div>
      </div>
    `}

    <!-- Fair Use Quota Indicator -->
    <div style="font-size:0.8rem; color:var(--text-secondary); background:var(--bg-surface-subtle); padding:0.6rem 0.85rem; border-radius:var(--radius-md); border:1px solid var(--border-subtle);">
      ⚖️ <strong>Fair-Use Policy:</strong> ${resource.fairUseLimit}. You have <strong>${quota.remainingHours} hrs</strong> remaining this week.
    </div>

    <form id="booking-request-form" onsubmit="handleBookingSubmit(event, '${resource.id}')">
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Reservation Date</label>
          <input type="date" class="form-input" id="bkg-date" value="${today}" required onchange="triggerConflictCheck('${resource.id}')" />
        </div>
        <div class="form-group">
          <label class="form-label">Time Slot</label>
          <div style="display:flex; gap:0.5rem;">
            <select class="form-select" id="bkg-start" onchange="triggerConflictCheck('${resource.id}')">
              <option value="09:00">09:00 AM</option>
              <option value="10:00">10:00 AM</option>
              <option value="11:00">11:00 AM</option>
              <option value="13:00">01:00 PM</option>
              <option value="14:00" selected>02:00 PM</option>
              <option value="16:00">04:00 PM</option>
              <option value="18:00">06:00 PM</option>
            </select>
            <select class="form-select" id="bkg-end" onchange="triggerConflictCheck('${resource.id}')">
              <option value="10:00">10:00 AM</option>
              <option value="11:30">11:30 AM</option>
              <option value="13:00">01:00 PM</option>
              <option value="15:30">03:30 PM</option>
              <option value="16:30" selected>04:30 PM</option>
              <option value="18:00">06:00 PM</option>
              <option value="20:00">08:00 PM</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Live Conflict Detection Feedback Box -->
      <div id="live-conflict-feedback" style="margin-top:0.75rem;"></div>

      <div class="form-group" style="margin-top:0.75rem;">
        <label class="form-label">Intended Project / Purpose Description</label>
        <textarea class="form-textarea" id="bkg-purpose" rows="3" placeholder="Describe what you are fabricating, testing, or recording..." required>Rapid prototype assembly for autonomous inspection drone test run.</textarea>
      </div>

      <div class="form-group" style="margin-top:0.75rem;">
        <label class="form-label">Supervising Faculty / Team Sponsor (Optional)</label>
        <input type="text" class="form-input" id="bkg-sponsor" placeholder="e.g. Dr. Vance, IEEE Student Branch" value="Robotics Student Chapter" />
      </div>

      <div class="checklist-item" style="margin-top:0.75rem;">
        <input type="checkbox" id="bkg-rules-pledge" required />
        <div class="checklist-text">
          <h5>Safety & Condition Pledge</h5>
          <p>I agree to perform initial check-in inspection, abide by lab safety protocols, clean up all residue/chips, and report any damage immediately.</p>
        </div>
      </div>

      <div class="modal-footer" style="padding-left:0; padding-right:0; margin-top:1.25rem;">
        <button type="button" class="btn btn-secondary" onclick="closeModal('booking-modal')">Cancel</button>
        <button type="submit" class="btn btn-primary" id="btn-submit-booking">
          Submit Booking Request
        </button>
      </div>
    </form>
  `;

  openModal("booking-modal");
  triggerConflictCheck(resource.id);
}

function triggerConflictCheck(resourceId) {
  const date = document.getElementById("bkg-date")?.value;
  const start = document.getElementById("bkg-start")?.value;
  const end = document.getElementById("bkg-end")?.value;
  const feedbackBox = document.getElementById("live-conflict-feedback");
  const submitBtn = document.getElementById("btn-submit-booking");
  if (!date || !start || !end || !feedbackBox) return;

  if (start >= end) {
    feedbackBox.innerHTML = `
      <div class="alert-banner danger">
        <span>⚠️</span>
        <div>End time must be after start time.</div>
      </div>
    `;
    if (submitBtn) submitBtn.disabled = true;
    return;
  }

  const conflict = checkSchedulingConflict(resourceId, date, start, end);
  if (conflict.hasConflict) {
    feedbackBox.innerHTML = `
      <div class="alert-banner warning">
        <span>⚠️</span>
        <div>
          <strong>Schedule Conflict:</strong> Overlaps with an existing reservation (${conflict.conflicts[0].startTime} - ${conflict.conflicts[0].endTime}).
          Submitting will add you to the <strong>Priority Waitlist</strong>.
        </div>
      </div>
    `;
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = `📋 Request Priority Waitlist`;
    }
  } else {
    feedbackBox.innerHTML = `
      <div class="alert-banner info">
        <span>✓</span>
        <div><strong>Slot Available:</strong> No scheduling overlaps detected for this time.</div>
      </div>
    `;
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = `Submit Booking Request`;
    }
  }
}

function handleBookingSubmit(event, resourceId) {
  event.preventDefault();
  const resource = getResource(resourceId);
  const user = getActiveUser();
  const date = document.getElementById("bkg-date").value;
  const startTime = document.getElementById("bkg-start").value;
  const endTime = document.getElementById("bkg-end").value;
  const purpose = document.getElementById("bkg-purpose").value;

  const conflict = checkSchedulingConflict(resourceId, date, startTime, endTime);
  const status = conflict.hasConflict ? "Waitlisted" : "Requested";
  const newId = "bkg-" + (100 + State.bookings.length + 1);

  // Calculate approximate duration
  const startH = parseInt(startTime.split(":")[0]);
  const endH = parseInt(endTime.split(":")[0]);
  const duration = Math.max(1, endH - startH);

  const newBooking = {
    id: newId,
    resourceId,
    resourceTitle: resource.title,
    userId: user.id,
    userName: user.name,
    userDept: user.department,
    purpose,
    date,
    startTime,
    endTime,
    durationHours: duration,
    status,
    approvalReason: conflict.hasConflict ? "Automatically placed on queue due to concurrent reservation." : null,
    reviewerName: null,
    conflictCheckPassed: !conflict.hasConflict,
    eligibilityPassed: checkUserEligibility(user, resource).isEligible,
    checkInDetails: null,
    checkOutDetails: null,
    createdTimestamp: new Date().toISOString().replace("T", " ").substring(0, 16)
  };

  State.bookings.unshift(newBooking);
  saveState();
  recordAudit("BOOKING_REQUESTED", resource.title, `Requested by ${user.name} for ${date} (${startTime}-${endTime}). Status: ${status}`);

  closeModal("booking-modal");
  showToast(conflict.hasConflict ? "Request placed on the waiting list due to schedule conflict." : "Booking request submitted successfully! Awaiting owner review.", "success");
  
  // Switch to Bookings tab so the user sees their request immediately
  switchTab("bookings");
}

// 2. CHECK-IN MODAL (Before Use Inspection)
function openCheckInModal(bookingId) {
  const booking = State.bookings.find(b => b.id === bookingId);
  if (!booking) return;
  const resource = getResource(booking.resourceId);

  const modalBody = document.getElementById("checkin-modal-body");
  modalBody.innerHTML = `
    <div style="background:var(--bg-surface-elevated); padding:0.85rem; border-radius:var(--radius-md); margin-bottom:1rem; border:1px solid var(--border-subtle);">
      <h4 style="font-size:1rem; font-weight:700; color:var(--text-primary);">${booking.resourceTitle}</h4>
      <div style="font-size:0.8rem; color:var(--text-muted); margin-top:2px;">
        Booking #${booking.id} • ${booking.date} (${booking.startTime} - ${booking.endTime})
      </div>
    </div>

    <div class="alert-banner info">
      <span>🛡️</span>
      <div>
        <strong>Mandatory Pre-Use Condition Check:</strong> Verify initial equipment state before commencing work. This protects you from liability for prior damage.
      </div>
    </div>

    <form id="checkin-inspection-form" onsubmit="handleCheckInSubmit(event, '${booking.id}')">
      <div class="checklist-container" style="margin-top:1rem;">
        <label class="checklist-item">
          <input type="checkbox" id="chk-clean" required checked />
          <div class="checklist-text">
            <h5>Cleanliness & Surface State</h5>
            <p>Free from residual dust, foreign chemicals, resin build-up, or metal shavings.</p>
          </div>
        </label>

        <label class="checklist-item">
          <input type="checkbox" id="chk-power" required checked />
          <div class="checklist-text">
            <h5>Power & Diagnostic Calibration</h5>
            <p>Equipment powers up properly; zero warning codes on main controller.</p>
          </div>
        </label>

        <label class="checklist-item">
          <input type="checkbox" id="chk-accessories" required checked />
          <div class="checklist-text">
            <h5>Accessories & Tooling Accounted For</h5>
            <p>${(resource?.accessoriesIncluded || ["Power cable", "Tool kit", "Controller"]).join(", ")}</p>
          </div>
        </label>

        <label class="checklist-item">
          <input type="checkbox" id="chk-structural" required checked />
          <div class="checklist-text">
            <h5>Structural & Mechanical Integrity</h5>
            <p>No loose cables, cracked casings, chipped optical elements, or broken safety guards.</p>
          </div>
        </label>
      </div>

      <div class="form-group" style="margin-top:1rem;">
        <label class="form-label">Initial Condition Rating (1 to 5 Stars)</label>
        <div class="rating-stars" id="checkin-star-rating">
          <button type="button" class="rating-star-btn active" onclick="setInspectionRating(1, 'checkin')">★</button>
          <button type="button" class="rating-star-btn active" onclick="setInspectionRating(2, 'checkin')">★</button>
          <button type="button" class="rating-star-btn active" onclick="setInspectionRating(3, 'checkin')">★</button>
          <button type="button" class="rating-star-btn active" onclick="setInspectionRating(4, 'checkin')">★</button>
          <button type="button" class="rating-star-btn active" onclick="setInspectionRating(5, 'checkin')">★</button>
        </div>
        <input type="hidden" id="checkin-rating-value" value="5" />
      </div>

      <div class="form-group" style="margin-top:1rem;">
        <label class="form-label">Pre-existing Condition Notes / Minor Observations</label>
        <input type="text" class="form-input" id="checkin-notes" placeholder="e.g. Unit is pristine, slight tape residue on outer cabinet" value="Verified clean and operational. Zero pre-existing faults." />
      </div>

      <!-- Photo Inspection Simulation -->
      <div class="form-group" style="margin-top:1rem;">
        <label class="form-label">Digital Photo Proof (Pre-use check)</label>
        <div class="photo-uploader-box" onclick="simulatePhotoUpload('checkin')">
          <span style="font-size:1.5rem;">📷</span>
          <div style="font-weight:600; font-size:0.85rem; margin-top:4px;">Click to Capture / Attach Initial Condition Photo</div>
          <div style="font-size:0.75rem; color:var(--text-muted);">Timestamp and geotag will be recorded automatically</div>
        </div>
        <div class="photo-preview-grid" id="checkin-photo-preview">
          <div class="preview-thumb">
            <img src="${resource?.image || 'assets/images/hero_banner.jpg'}" alt="Condition photo" />
          </div>
        </div>
      </div>

      <div class="modal-footer" style="padding-left:0; padding-right:0; margin-top:1.25rem;">
        <button type="button" class="btn btn-secondary" onclick="closeModal('checkin-modal')">Cancel</button>
        <button type="submit" class="btn btn-success">
          ✓ Confirm & Check-In
        </button>
      </div>
    </form>
  `;

  openModal("checkin-modal");
}

function setInspectionRating(stars, prefix) {
  const container = document.getElementById(`${prefix}-star-rating`);
  const hiddenInput = document.getElementById(`${prefix}-rating-value`);
  if (!container || !hiddenInput) return;
  hiddenInput.value = stars;
  const buttons = container.querySelectorAll(".rating-star-btn");
  buttons.forEach((btn, index) => {
    if (index < stars) {
      btn.classList.add("active");
    } else {
      btn.classList.remove("active");
    }
  });
}

function simulatePhotoUpload(prefix) {
  showToast("Photo captured and digital metadata hash stamped.", "info");
}

function handleCheckInSubmit(event, bookingId) {
  event.preventDefault();
  const booking = State.bookings.find(b => b.id === bookingId);
  if (!booking) return;

  const rating = parseInt(document.getElementById("checkin-rating-value").value) || 5;
  const notes = document.getElementById("checkin-notes").value;

  booking.status = "Checked-In";
  booking.checkInDetails = {
    timestamp: new Date().toISOString().replace("T", " ").substring(0, 16),
    rating,
    notes,
    cleanlinessVerified: document.getElementById("chk-clean").checked,
    powerVerified: document.getElementById("chk-power").checked,
    accessoriesVerified: document.getElementById("chk-accessories").checked
  };

  // Mark resource as in-use
  const resource = getResource(booking.resourceId);
  if (resource) resource.status = "In Use";

  saveState();
  recordAudit("CHECK_IN_COMPLETED", booking.resourceTitle, `User ${booking.userName} checked in. Condition score: ${rating}/5.`);

  closeModal("checkin-modal");
  showToast("Check-in successful! Lab access granted and condition recorded.", "success");
  renderApp();
}

// 3. CHECK-OUT MODAL (Return Condition Inspection)
function openCheckOutModal(bookingId) {
  const booking = State.bookings.find(b => b.id === bookingId);
  if (!booking) return;
  const resource = getResource(booking.resourceId);

  const modalBody = document.getElementById("checkout-modal-body");
  modalBody.innerHTML = `
    <div style="background:var(--bg-surface-elevated); padding:0.85rem; border-radius:var(--radius-md); margin-bottom:1rem; border:1px solid var(--border-subtle);">
      <h4 style="font-size:1rem; font-weight:700; color:var(--text-primary);">${booking.resourceTitle}</h4>
      <div style="font-size:0.8rem; color:var(--text-muted); margin-top:2px;">
        Checking out booking #${booking.id} • Checked in at ${booking.checkInDetails?.timestamp || 'earlier'}
      </div>
    </div>

    <!-- Comparison with Initial Check-In State -->
    <div class="alert-banner info" style="margin-bottom:1rem;">
      <span>📋</span>
      <div>
        <strong>Initial Condition at Check-in:</strong> ${booking.checkInDetails ? `${booking.checkInDetails.rating}★ (${booking.checkInDetails.notes})` : 'Good standing'}
      </div>
    </div>

    <form id="checkout-inspection-form" onsubmit="handleCheckOutSubmit(event, '${booking.id}')">
      <div class="checklist-container">
        <label class="checklist-item">
          <input type="checkbox" id="ret-clean" required checked />
          <div class="checklist-text">
            <h5>Cleaned & Decontaminated</h5>
            <p>Workstation sanitized, debris/resin/swarf cleared, lenses cleaned with optical cloth.</p>
          </div>
        </label>

        <label class="checklist-item">
          <input type="checkbox" id="ret-accessories" required checked />
          <div class="checklist-text">
            <h5>All Accessories & Consumables Returned</h5>
            <p>${(resource?.accessoriesIncluded || ["All tools", "Cables"]).join(", ")} accounted for in locker/rack.</p>
          </div>
        </label>

        <label class="checklist-item">
          <input type="checkbox" id="ret-nodamage" required checked />
          <div class="checklist-text">
            <h5>No New Damage or Defect Incurred</h5>
            <p>Equipment was powered down safely in accordance with shutdown checklist.</p>
          </div>
        </label>
      </div>

      <div class="form-group" style="margin-top:1rem;">
        <label class="form-label">Return Condition Score</label>
        <div class="rating-stars" id="checkout-star-rating">
          <button type="button" class="rating-star-btn active" onclick="setInspectionRating(1, 'checkout')">★</button>
          <button type="button" class="rating-star-btn active" onclick="setInspectionRating(2, 'checkout')">★</button>
          <button type="button" class="rating-star-btn active" onclick="setInspectionRating(3, 'checkout')">★</button>
          <button type="button" class="rating-star-btn active" onclick="setInspectionRating(4, 'checkout')">★</button>
          <button type="button" class="rating-star-btn active" onclick="setInspectionRating(5, 'checkout')">★</button>
        </div>
        <input type="hidden" id="checkout-rating-value" value="5" />
      </div>

      <div class="form-group" style="margin-top:1rem;">
        <label class="form-label">Return Inspection Summary Notes</label>
        <input type="text" class="form-input" id="checkout-notes" value="Returned in clean, fully functioning condition. Area locked." />
      </div>

      <!-- Quick Damage Check Prompt -->
      <div style="background:rgba(244, 63, 94, 0.08); border:1px solid rgba(244, 63, 94, 0.25); border-radius:var(--radius-md); padding:0.75rem; margin-top:1rem; display:flex; justify-content:space-between; align-items:center;">
        <div style="font-size:0.8rem; color:var(--text-secondary);">
          Did any incident, breakage, or tool jam occur?
        </div>
        <button type="button" class="btn btn-secondary btn-sm" style="color:var(--rose);" onclick="closeModal('checkout-modal'); openReportIncidentModal('${booking.id}')">
          ⚠️ File Incident Instead
        </button>
      </div>

      <div class="modal-footer" style="padding-left:0; padding-right:0; margin-top:1.25rem;">
        <button type="button" class="btn btn-secondary" onclick="closeModal('checkout-modal')">Cancel</button>
        <button type="submit" class="btn btn-primary">
          🏁 Complete Return & Sign Off
        </button>
      </div>
    </form>
  `;

  openModal("checkout-modal");
}

function handleCheckOutSubmit(event, bookingId) {
  event.preventDefault();
  const booking = State.bookings.find(b => b.id === bookingId);
  if (!booking) return;

  const rating = parseInt(document.getElementById("checkout-rating-value").value) || 5;
  const notes = document.getElementById("checkout-notes").value;

  booking.status = "Completed";
  booking.checkOutDetails = {
    timestamp: new Date().toISOString().replace("T", " ").substring(0, 16),
    rating,
    notes,
    returnCleanlinessVerified: document.getElementById("ret-clean").checked,
    allAccessoriesReturned: document.getElementById("ret-accessories").checked,
    noDamageVerified: document.getElementById("ret-nodamage").checked
  };

  // Free up resource
  const resource = getResource(booking.resourceId);
  if (resource) resource.status = "Available";

  // Check if there are waitlisted bookings for this resource and notify
  const nextInWaitlist = State.bookings.find(b => b.resourceId === booking.resourceId && b.status === "Waitlisted");
  if (nextInWaitlist) {
    showToast(`Notice: Waitlist candidate #${nextInWaitlist.id} is now eligible for approval!`, "info");
  }

  saveState();
  recordAudit("CHECK_OUT_VERIFIED", booking.resourceTitle, `Session completed and signed off by ${booking.userName}. Return condition score: ${rating}/5.`);

  closeModal("checkout-modal");
  showToast("Check-out finalized! Resource returned to available inventory.", "success");
  renderApp();
}

// 4. OWNER APPROVAL / REJECTION / WAITLIST DECISION MODAL
function openApprovalDecisionModal(bookingId, decisionType) {
  const booking = State.bookings.find(b => b.id === bookingId);
  if (!booking) return;
  const user = getActiveUser();

  const modalBody = document.getElementById("decision-modal-body");
  modalBody.innerHTML = `
    <div style="background:var(--bg-surface-elevated); padding:0.85rem; border-radius:var(--radius-md); margin-bottom:1rem; border:1px solid var(--border-subtle);">
      <h4 style="font-size:1rem; font-weight:700;">${booking.resourceTitle}</h4>
      <div style="font-size:0.8rem; color:var(--text-muted); margin-top:2px;">
        Request by <strong>${booking.userName}</strong> for ${booking.date} (${booking.startTime} - ${booking.endTime})
      </div>
      <div style="font-size:0.8rem; color:var(--text-secondary); margin-top:4px;">
        <strong>Purpose:</strong> ${booking.purpose}
      </div>
    </div>

    <form id="decision-form" onsubmit="handleDecisionSubmit(event, '${booking.id}', '${decisionType}')">
      <div class="form-group">
        <label class="form-label">Review Action</label>
        <select class="form-select" id="decision-type-select" onchange="updateDecisionPlaceholder(this.value)">
          <option value="Approve" ${decisionType === 'Approve' ? 'selected' : ''}>Approve Reservation</option>
          <option value="Waitlist" ${decisionType === 'Waitlist' ? 'selected' : ''}>Waitlist Request (Provide priority reason)</option>
          <option value="Reject" ${decisionType === 'Reject' ? 'selected' : ''}>Decline Request (Provide constructive reason)</option>
        </select>
      </div>

      <div class="form-group" style="margin-top:1rem;">
        <label class="form-label" id="decision-reason-label">
          ${decisionType === 'Approve' ? 'Approval Conditions / Instructions for User' : 'Mandatory Explanation for Decision'}
        </label>
        <textarea class="form-textarea" id="decision-reason-text" rows="3" required placeholder="Provide clear feedback so the requester understands requirements...">${getDefaultDecisionReason(decisionType)}</textarea>
      </div>

      <div class="modal-footer" style="padding-left:0; padding-right:0; margin-top:1.25rem;">
        <button type="button" class="btn btn-secondary" onclick="closeModal('decision-modal')">Cancel</button>
        <button type="submit" class="btn ${decisionType === 'Approve' ? 'btn-success' : (decisionType === 'Waitlist' ? 'btn-primary' : 'btn-danger')}">
          Confirm ${decisionType}
        </button>
      </div>
    </form>
  `;

  openModal("decision-modal");
}

function getDefaultDecisionReason(decisionType) {
  if (decisionType === "Approve") return "Safety prerequisites verified. Please attend a 5-minute safety walk-through before check-in.";
  if (decisionType === "Waitlist") return "Waitlisted due to overlapping reservation or high-priority departmental research session.";
  return "Declined: Missing verified prerequisite machine training. Please complete Module 2 safety test and re-apply.";
}

function updateDecisionPlaceholder(decisionType) {
  const text = document.getElementById("decision-reason-text");
  if (text) text.value = getDefaultDecisionReason(decisionType);
}

function handleDecisionSubmit(event, bookingId, defaultType) {
  event.preventDefault();
  const booking = State.bookings.find(b => b.id === bookingId);
  if (!booking) return;
  const user = getActiveUser();

  const decisionType = document.getElementById("decision-type-select").value;
  const reason = document.getElementById("decision-reason-text").value;

  if (decisionType === "Approve") {
    booking.status = "Approved";
  } else if (decisionType === "Waitlist") {
    booking.status = "Waitlisted";
  } else {
    booking.status = "Rejected";
  }

  booking.approvalReason = reason;
  booking.reviewerName = user.name;

  saveState();
  recordAudit(`BOOKING_${decisionType.toUpperCase()}`, booking.resourceTitle, `Decided by ${user.name}. Reason: ${reason}`);

  closeModal("decision-modal");
  showToast(`Booking #${booking.id} marked as ${decisionType}! Requester notified.`, "success");
  renderApp();
}

// 5. REPORT INCIDENT / DELAY MODAL
function openReportIncidentModal(bookingId = null) {
  const user = getActiveUser();
  const booking = bookingId ? State.bookings.find(b => b.id === bookingId) : null;

  const modalBody = document.getElementById("incident-modal-body");
  modalBody.innerHTML = `
    <form id="incident-report-form" onsubmit="handleIncidentSubmit(event, '${bookingId || ''}')">
      <div class="form-group">
        <label class="form-label">Related Resource</label>
        <select class="form-select" id="inc-resource" required>
          ${State.resources.map(r => `
            <option value="${r.id}" ${booking && booking.resourceId === r.id ? 'selected' : ''}>
              ${r.title} (${r.location})
            </option>
          `).join("")}
        </select>
      </div>

      <div class="form-row" style="margin-top:0.75rem;">
        <div class="form-group">
          <label class="form-label">Incident Category</label>
          <select class="form-select" id="inc-type" required>
            <option value="Equipment Damage">Equipment Damage / Wear</option>
            <option value="Delayed Return">Delayed Return / Overdue</option>
            <option value="Missing Component">Missing Tool or Accessory</option>
            <option value="Safety Violation">Safety Protocol Violation</option>
            <option value="Scheduling Dispute">Access / Scheduling Dispute</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Severity Level</label>
          <select class="form-select" id="inc-severity" required>
            <option value="Low">Low (Cosmetic / Minor Delay)</option>
            <option value="Medium" selected>Medium (Repair Needed / Missing Cable)</option>
            <option value="Critical">Critical (Safety Risk / Non-functional)</option>
          </select>
        </div>
      </div>

      <div class="form-group" style="margin-top:0.75rem;">
        <label class="form-label">Detailed Incident Narrative</label>
        <textarea class="form-textarea" id="inc-desc" rows="3" required placeholder="Describe what occurred, any physical damage, steps taken, and who was present...">Noticeable scratch on precision fixture bracket during workpiece removal. Machine stopped immediately and reported.</textarea>
      </div>

      <div class="form-group" style="margin-top:0.75rem;">
        <label class="form-label">Parties Involved</label>
        <input type="text" class="form-input" id="inc-parties" value="${booking ? booking.userName : user.name}" />
      </div>

      <div class="modal-footer" style="padding-left:0; padding-right:0; margin-top:1.25rem;">
        <button type="button" class="btn btn-secondary" onclick="closeModal('incident-modal')">Cancel</button>
        <button type="submit" class="btn btn-danger">
          Submit Incident Report
        </button>
      </div>
    </form>
  `;

  openModal("incident-modal");
}

function handleIncidentSubmit(event, bookingId) {
  event.preventDefault();
  const user = getActiveUser();
  const resourceId = document.getElementById("inc-resource").value;
  const resource = getResource(resourceId);
  const type = document.getElementById("inc-type").value;
  const severity = document.getElementById("inc-severity").value;
  const description = document.getElementById("inc-desc").value;
  const userInvolved = document.getElementById("inc-parties").value;

  const newIncident = {
    id: "inc-" + (200 + State.incidents.length + 1),
    bookingId: bookingId || "N/A",
    resourceId,
    resourceTitle: resource ? resource.title : "Resource",
    reportedBy: `${user.name} (${user.roleLabel})`,
    userInvolved,
    type,
    severity,
    date: new Date().toISOString().replace("T", " ").substring(0, 10),
    status: "Under Review",
    description,
    resolution: null,
    photos: [resource?.image || "assets/images/hero_banner.jpg"]
  };

  State.incidents.unshift(newIncident);
  saveState();
  recordAudit("INCIDENT_REPORTED", resource?.title || "Resource", `Reported by ${user.name}. Severity: ${severity}. Type: ${type}`);

  closeModal("incident-modal");
  showToast("Incident report logged into compliance registry. Safety review initiated.", "warning");
  switchTab("incidents");
}

// 6. RESOLVE INCIDENT MODAL (Admin & Owners)
function openResolveIncidentModal(incidentId) {
  const inc = State.incidents.find(i => i.id === incidentId);
  if (!inc) return;

  const modalBody = document.getElementById("resolve-modal-body");
  modalBody.innerHTML = `
    <div style="background:var(--bg-surface-elevated); padding:0.85rem; border-radius:var(--radius-md); margin-bottom:1rem; border:1px solid var(--border-subtle);">
      <h4 style="font-size:1rem; font-weight:700;">${inc.type}: ${inc.resourceTitle}</h4>
      <p style="font-size:0.825rem; color:var(--text-secondary); margin-top:2px;">${inc.description}</p>
    </div>

    <form onsubmit="handleResolveIncidentSubmit(event, '${inc.id}')">
      <div class="form-group">
        <label class="form-label">Safety Officer / Manager Decision</label>
        <select class="form-select" id="res-decision" required>
          <option value="Resolved - First Time Safety Waiver (No Penalty)">Resolved - First Time Safety Waiver (No Penalty)</option>
          <option value="Resolved - Maintenance & Recalibration Work Order Issued">Resolved - Maintenance & Recalibration Work Order Issued</option>
          <option value="Resolved - Refresher Safety Training Required Before Next Booking">Resolved - Refresher Safety Training Required Before Next Booking</option>
          <option value="Resolved - Materials Replacement Fee Covered by Lab Budget">Resolved - Materials Replacement Fee Covered by Lab Budget</option>
        </select>
      </div>

      <div class="form-group" style="margin-top:1rem;">
        <label class="form-label">Official Resolution Log Entry</label>
        <textarea class="form-textarea" id="res-notes" rows="3" required>Inspection concluded. Defect was within standard wear parameters. Zero negligence identified. Lab safety clearance reinstated.</textarea>
      </div>

      <div class="modal-footer" style="padding-left:0; padding-right:0; margin-top:1.25rem;">
        <button type="button" class="btn btn-secondary" onclick="closeModal('resolve-modal')">Cancel</button>
        <button type="submit" class="btn btn-primary">
          Log Official Resolution
        </button>
      </div>
    </form>
  `;

  openModal("resolve-modal");
}

function handleResolveIncidentSubmit(event, incidentId) {
  event.preventDefault();
  const inc = State.incidents.find(i => i.id === incidentId);
  if (!inc) return;
  const user = getActiveUser();

  const decision = document.getElementById("res-decision").value;
  const notes = document.getElementById("res-notes").value;

  inc.status = "Resolved";
  inc.resolution = `${decision} — Signed off by ${user.name}: ${notes}`;

  saveState();
  recordAudit("INCIDENT_RESOLVED", inc.resourceTitle, `Incident #${inc.id} resolved by ${user.name}. Decision: ${decision}`);

  closeModal("resolve-modal");
  showToast("Incident resolution documented and closed.", "success");
  renderApp();
}

// 7. CREATE NEW RESOURCE LISTING MODAL
function openCreateResourceModal() {
  const user = getActiveUser();
  const modalBody = document.getElementById("listing-modal-body");
  modalBody.innerHTML = `
    <form id="create-listing-form" onsubmit="handleCreateListingSubmit(event)">
      <div class="form-group">
        <label class="form-label">Resource Title</label>
        <input type="text" class="form-input" id="new-res-title" placeholder="e.g. Roland MDX-50 Precision CNC Mill" required />
      </div>

      <div class="form-row" style="margin-top:0.75rem;">
        <div class="form-group">
          <label class="form-label">Category</label>
          <select class="form-select" id="new-res-cat">
            <option value="Makerspace">Makerspace & Prototyping</option>
            <option value="High Performance Compute">High Performance Compute</option>
            <option value="AV & Creative Media">AV & Creative Media</option>
            <option value="Biological & Cleanroom">Biological & Cleanroom</option>
            <option value="Robotics & Automation">Robotics & Automation</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Campus Location & Room</label>
          <input type="text" class="form-input" id="new-res-loc" placeholder="e.g. Science Quad Room 204" required />
        </div>
      </div>

      <div class="form-group" style="margin-top:0.75rem;">
        <label class="form-label">Description & Specifications</label>
        <textarea class="form-textarea" id="new-res-desc" rows="2" placeholder="List technical specs, tooling materials, capabilities..." required></textarea>
      </div>

      <div class="form-row" style="margin-top:0.75rem;">
        <div class="form-group">
          <label class="form-label">Fair-Use Max Duration</label>
          <input type="text" class="form-input" id="new-res-fairuse" value="Max 4 hours per reservation • 12 hrs/week" required />
        </div>
        <div class="form-group">
          <label class="form-label">Required Prerequisite Qualification</label>
          <select class="form-select" id="new-res-cert">
            <option value="">None (Open Access)</option>
            <option value="cert-laser">Laser & Machine Safety Level 1</option>
            <option value="cert-biosafety">BioSafety Level 1 or 2</option>
            <option value="cert-media">Media Production Studio Induction</option>
          </select>
        </div>
      </div>

      <div class="form-group" style="margin-top:0.75rem;">
        <label class="form-label">Operating & Safety Rules (Comma separated)</label>
        <input type="text" class="form-input" id="new-res-rules" value="Eye protection required, Clean debris after session, Attend check-in walk-through" />
      </div>

      <div class="form-group" style="margin-top:0.75rem;">
        <label class="form-label">Included Accessories & Tooling (Comma separated)</label>
        <input type="text" class="form-input" id="new-res-acc" value="Tooling wrench, Safety glasses, USB key, Manual" />
      </div>

      <div class="modal-footer" style="padding-left:0; padding-right:0; margin-top:1.25rem;">
        <button type="button" class="btn btn-secondary" onclick="closeModal('listing-modal')">Cancel</button>
        <button type="submit" class="btn btn-primary">
          Publish Resource Listing
        </button>
      </div>
    </form>
  `;

  openModal("listing-modal");
}

function handleCreateListingSubmit(event) {
  event.preventDefault();
  const user = getActiveUser();

  const title = document.getElementById("new-res-title").value;
  const category = document.getElementById("new-res-cat").value;
  const location = document.getElementById("new-res-loc").value;
  const description = document.getElementById("new-res-desc").value;
  const fairUseLimit = document.getElementById("new-res-fairuse").value;
  const cert = document.getElementById("new-res-cert").value;
  const rules = document.getElementById("new-res-rules").value.split(",").map(r => r.trim()).filter(Boolean);
  const accessories = document.getElementById("new-res-acc").value.split(",").map(a => a.trim()).filter(Boolean);

  let image = "assets/images/hero_banner.jpg";
  if (category === "Makerspace") image = "assets/images/industrial_3d_printer.jpg";
  if (category === "High Performance Compute") image = "assets/images/gpu_cluster.jpg";
  if (category === "AV & Creative Media") image = "assets/images/cinema_camera.jpg";
  if (category === "Biological & Cleanroom") image = "assets/images/cleanroom_lab.jpg";

  const newResource = {
    id: "res-" + (State.resources.length + 1),
    title,
    category,
    location,
    ownerId: user.id,
    ownerName: user.name,
    ownerDept: user.department,
    status: "Available",
    description,
    image,
    fairUseLimit,
    maxDurationHours: 4,
    requiredCertifications: cert ? [cert] : [],
    requiresSupervision: false,
    requiresApproval: true,
    operatingHours: "08:00 - 20:00 (Mon - Sat)",
    rules,
    accessoriesIncluded: accessories,
    conditionScore: 5.0
  };

  State.resources.unshift(newResource);
  saveState();
  recordAudit("RESOURCE_CREATED", title, `New resource listed by owner ${user.name} in category ${category}.`);

  closeModal("listing-modal");
  showToast(`Resource "${title}" has been published to ShareSpace!`, "success");
  switchTab("browse");
}

// 8. AUDIT HISTORY MODAL (For a specific booking)
function openBookingHistoryModal(bookingId) {
  const booking = State.bookings.find(b => b.id === bookingId);
  if (!booking) return;

  const relevantAudits = State.auditLogs.filter(a => a.target === booking.resourceTitle || a.details.includes(booking.id));

  const modalBody = document.getElementById("history-modal-body");
  modalBody.innerHTML = `
    <div style="background:var(--bg-surface-elevated); padding:0.85rem; border-radius:var(--radius-md); margin-bottom:1rem; border:1px solid var(--border-subtle);">
      <h4 style="font-size:1rem; font-weight:700;">${booking.resourceTitle}</h4>
      <div style="font-size:0.8rem; color:var(--text-muted); margin-top:2px;">
        Audit trail for Booking #${booking.id} • User: ${booking.userName}
      </div>
    </div>

    <div style="display:flex; flex-direction:column; gap:0.75rem;">
      <div style="padding:0.75rem; background:var(--bg-surface-subtle); border-radius:var(--radius-md); border-left:3px solid var(--primary);">
        <div style="font-size:0.75rem; color:var(--text-muted);">Timestamp: ${booking.createdTimestamp || '2026-10-27'}</div>
        <div style="font-weight:600; font-size:0.85rem;">Booking Request Initiated</div>
        <div style="font-size:0.8rem; color:var(--text-secondary); margin-top:2px;">
          Purpose: ${booking.purpose}
        </div>
      </div>

      ${booking.approvalReason ? `
        <div style="padding:0.75rem; background:var(--bg-surface-subtle); border-radius:var(--radius-md); border-left:3px solid var(--emerald);">
          <div style="font-size:0.75rem; color:var(--text-muted);">Reviewed by ${booking.reviewerName || 'Owner'}</div>
          <div style="font-weight:600; font-size:0.85rem;">Decision: ${booking.status}</div>
          <div style="font-size:0.8rem; color:var(--text-secondary); margin-top:2px;">
            Note: ${booking.approvalReason}
          </div>
        </div>
      ` : ''}

      ${booking.checkInDetails ? `
        <div style="padding:0.75rem; background:var(--bg-surface-subtle); border-radius:var(--radius-md); border-left:3px solid var(--cyan);">
          <div style="font-size:0.75rem; color:var(--text-muted);">Timestamp: ${booking.checkInDetails.timestamp}</div>
          <div style="font-weight:600; font-size:0.85rem;">Pre-Use Condition Checked In (${booking.checkInDetails.rating}★)</div>
          <div style="font-size:0.8rem; color:var(--text-secondary); margin-top:2px;">
            Inspection Note: ${booking.checkInDetails.notes}
          </div>
        </div>
      ` : ''}

      ${booking.checkOutDetails ? `
        <div style="padding:0.75rem; background:var(--bg-surface-subtle); border-radius:var(--radius-md); border-left:3px solid var(--purple);">
          <div style="font-size:0.75rem; color:var(--text-muted);">Timestamp: ${booking.checkOutDetails.timestamp}</div>
          <div style="font-weight:600; font-size:0.85rem;">Return Inspection Signed Off (${booking.checkOutDetails.rating}★)</div>
          <div style="font-size:0.8rem; color:var(--text-secondary); margin-top:2px;">
            Return Note: ${booking.checkOutDetails.notes}
          </div>
        </div>
      ` : ''}
    </div>

    <div class="modal-footer" style="padding-left:0; padding-right:0; margin-top:1.25rem;">
      <button type="button" class="btn btn-secondary" onclick="closeModal('history-modal')">Close</button>
    </div>
  `;

  openModal("history-modal");
}

// 9. USER CERTIFICATIONS MODAL
function openCertificationsModal() {
  const user = getActiveUser();
  const modalBody = document.getElementById("certs-modal-body");
  modalBody.innerHTML = `
    <div style="background:var(--bg-surface-elevated); padding:0.85rem; border-radius:var(--radius-md); margin-bottom:1rem;">
      <h4 style="font-size:1rem; font-weight:700;">${user.name}</h4>
      <div style="font-size:0.8rem; color:var(--text-muted);">${user.department} • Student ID: #CAMPUS-8921</div>
    </div>

    <h5 style="font-size:0.85rem; font-weight:700; margin-bottom:0.5rem; text-transform:uppercase; color:var(--text-muted);">Verified Safety Qualifications</h5>
    <div style="display:flex; flex-direction:column; gap:0.5rem;">
      ${(user.certifications || []).map(cert => `
        <div style="display:flex; justify-content:space-between; align-items:center; padding:0.6rem 0.85rem; background:var(--bg-surface-subtle); border-radius:var(--radius-md); border:1px solid var(--border-subtle);">
          <div>
            <div style="font-weight:600; font-size:0.85rem; color:var(--emerald);">✓ ${cert.title}</div>
            <div style="font-size:0.75rem; color:var(--text-muted);">Verified Date: ${cert.verifiedDate}</div>
          </div>
          <span class="status-pill status-available">${cert.status}</span>
        </div>
      `).join("")}
    </div>

    <div style="margin-top:1.25rem; background:rgba(99, 102, 241, 0.08); padding:0.75rem; border-radius:var(--radius-md); border:1px solid var(--border-accent);">
      <h6 style="font-weight:700; font-size:0.8rem; color:var(--primary);">Need a new lab qualification?</h6>
      <p style="font-size:0.75rem; color:var(--text-secondary); margin-top:2px;">Complete the online environmental health & safety module on the university portal, or request a practical workshop induction from Dr. Vance.</p>
    </div>

    <div class="modal-footer" style="padding-left:0; padding-right:0; margin-top:1.25rem;">
      <button type="button" class="btn btn-secondary" onclick="closeModal('certs-modal')">Close</button>
    </div>
  `;

  openModal("certs-modal");
}

// 10. CANCEL BOOKING
function cancelBooking(bookingId) {
  const booking = State.bookings.find(b => b.id === bookingId);
  if (!booking) return;

  booking.status = "Cancelled";
  saveState();
  recordAudit("BOOKING_CANCELLED", booking.resourceTitle, `Cancelled by user ${booking.userName}.`);
  showToast("Booking request was cancelled.", "info");
  renderApp();
}

// 11. EXPORT AUDIT TRAIL
function exportAuditTrail() {
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(State.auditLogs, null, 2));
  const downloadAnchor = document.createElement("a");
  downloadAnchor.setAttribute("href", dataStr);
  downloadAnchor.setAttribute("download", `sharespace_audit_log_${Date.now()}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
  showToast("Audit trail exported successfully as JSON file.", "success");
}

// 12. LOGIN MODAL & WORKFLOW
function openLoginModal() {
  const modalBody = document.getElementById("login-modal-body");
  if (!modalBody) return;
  const currentUser = getActiveUser();

  modalBody.innerHTML = `
    <div style="margin-bottom:0.5rem;">
      <div style="font-size:0.85rem; color:var(--text-secondary); margin-bottom:1.1rem; line-height:1.5;">
        Sign in to verify your institutional qualifications, manage equipment bookings, or approve lab requests.
      </div>

      <!-- Quick Persona Sign-In -->
      <label class="form-label" style="font-weight:700; margin-bottom:0.6rem; display:block;">
        ⚡ Instant Persona Access (1-Click Switch):
      </label>
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.6rem; margin-bottom:1.25rem;">
        ${State.users.map(u => `
          <button type="button" class="quick-login-card ${u.id === currentUser.id ? 'active' : ''}" 
                  onclick="handleQuickLogin('${u.id}')">
            <span style="width:28px; height:28px; border-radius:50%; background:${u.avatarColor}; color:#fff; display:flex; align-items:center; justify-content:center; font-size:0.75rem; font-weight:700; flex-shrink:0;">${u.avatar}</span>
            <div style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap; flex:1;">
              <div style="font-size:0.82rem; font-weight:700; color:var(--text-primary); text-overflow:ellipsis; overflow:hidden;">${u.name}</div>
              <div style="font-size:0.7rem; color:var(--text-muted); text-transform:capitalize;">${u.role} • ${u.roleLabel.split('/')[0].trim()}</div>
            </div>
            ${u.id === currentUser.id ? `<span style="font-size:0.75rem; color:var(--primary); font-weight:700;">✓</span>` : ''}
          </button>
        `).join("")}
      </div>

      <div style="display:flex; align-items:center; gap:0.75rem; margin:1.25rem 0 1rem 0;">
        <hr style="flex:1; border:none; border-top:1px solid var(--border-subtle);">
        <span style="font-size:0.72rem; color:var(--text-muted); text-transform:uppercase; font-weight:700; letter-spacing:0.05em;">Or Sign In With Email</span>
        <hr style="flex:1; border:none; border-top:1px solid var(--border-subtle);">
      </div>

      <!-- Email / Password Form -->
      <form id="login-form" onsubmit="handleLoginSubmit(event)">
        <div id="login-error-msg" style="display:none; padding:0.6rem 0.85rem; background:rgba(244,63,94,0.15); border:1px solid var(--rose-border); border-radius:var(--radius-sm); color:var(--rose); font-size:0.8rem; margin-bottom:0.85rem;"></div>

        <div class="form-group">
          <label class="form-label" for="login-email">Campus Email Address</label>
          <input type="email" class="form-input" id="login-email" placeholder="e.g. alex.rivera@campus.edu" value="${currentUser ? currentUser.email : ''}" required />
        </div>

        <div class="form-group" style="margin-top:0.75rem;">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <label class="form-label" for="login-password">Password</label>
            <span style="font-size:0.72rem; color:var(--primary); cursor:pointer;" onclick="showToast('For demo access, any password works for registered accounts.', 'info')">Demo Password Hint</span>
          </div>
          <input type="password" class="form-input" id="login-password" placeholder="Enter password" value="password123" required />
        </div>

        <div style="display:flex; align-items:center; justify-content:space-between; margin-top:0.85rem; font-size:0.8rem;">
          <label style="display:flex; align-items:center; gap:0.4rem; color:var(--text-secondary); cursor:pointer;">
            <input type="checkbox" checked /> Remember session on this station
          </label>
        </div>

        <div class="modal-footer" style="padding-left:0; padding-right:0; margin-top:1.25rem;">
          <button type="button" class="btn btn-secondary" onclick="closeModal('login-modal')">Cancel</button>
          <button type="submit" class="btn btn-primary">
            Sign In to ShareSpace
          </button>
        </div>
      </form>

      <div style="margin-top:1.1rem; text-align:center; font-size:0.82rem; color:var(--text-muted); border-top:1px solid var(--border-subtle); padding-top:0.85rem;">
        Don't have a verified campus profile? 
        <a href="javascript:void(0)" onclick="closeModal('login-modal'); openSignupModal();" style="color:var(--primary); font-weight:700; text-decoration:underline;">
          Register New Account
        </a>
      </div>
    </div>
  `;
  openModal("login-modal");
}

function handleQuickLogin(userId) {
  const user = State.users.find(u => u.id === userId);
  if (!user) return;
  State.activeUserId = user.id;
  saveState();
  recordAudit("USER_LOGIN", "Authentication", `${user.name} logged in via 1-click persona switcher.`);
  showToast(`Welcome back, ${user.name}! Signed in as ${user.roleLabel}.`, "success");
  closeModal("login-modal");
  renderApp();
}

function handleLoginSubmit(event) {
  event.preventDefault();
  const emailInput = document.getElementById("login-email");
  const email = emailInput ? emailInput.value.trim().toLowerCase() : "";
  const errBox = document.getElementById("login-error-msg");

  if (!email) {
    if (errBox) {
      errBox.textContent = "Please enter your campus email.";
      errBox.style.display = "block";
    }
    return;
  }

  // Look up user by email
  const foundUser = State.users.find(u => u.email && u.email.toLowerCase() === email);

  if (foundUser) {
    State.activeUserId = foundUser.id;
    saveState();
    recordAudit("USER_LOGIN", "Authentication", `${foundUser.name} signed in successfully.`);
    showToast(`Welcome back, ${foundUser.name}! Signed in as ${foundUser.roleLabel}.`, "success");
    closeModal("login-modal");
    renderApp();
  } else {
    if (errBox) {
      errBox.innerHTML = `No account found for <strong>${email}</strong>.<br><span style="margin-top:4px; display:inline-block;">Click below to register this email, or select one of the demo accounts above.</span>`;
      errBox.style.display = "block";
    }
  }
}

// 13. SIGN UP MODAL & REGISTRATION WORKFLOW
function openSignupModal() {
  const modalBody = document.getElementById("signup-modal-body");
  if (!modalBody) return;

  modalBody.innerHTML = `
    <form id="signup-form" onsubmit="handleSignupSubmit(event)">
      <div id="signup-error-msg" style="display:none; padding:0.6rem 0.85rem; background:rgba(244,63,94,0.15); border:1px solid var(--rose-border); border-radius:var(--radius-sm); color:var(--rose); font-size:0.8rem; margin-bottom:0.85rem;"></div>

      <div style="font-size:0.83rem; color:var(--text-secondary); margin-bottom:1rem; line-height:1.45;">
        Create your verified campus profile to access specialized research tools, 3D printers, precision CNC mills, GPU clusters, and creative studio gear.
      </div>

      <div class="form-row">
        <div class="form-group">
          <label class="form-label" for="signup-name">Full Name *</label>
          <input type="text" class="form-input" id="signup-name" placeholder="e.g. Jordan Hayes" required />
        </div>
        <div class="form-group">
          <label class="form-label" for="signup-email">Campus Email *</label>
          <input type="email" class="form-input" id="signup-email" placeholder="e.g. jordan.hayes@campus.edu" required />
        </div>
      </div>

      <div class="form-row" style="margin-top:0.75rem;">
        <div class="form-group">
          <label class="form-label" for="signup-role">Institutional Role *</label>
          <select class="form-select" id="signup-role" required>
            <option value="user">Graduate Researcher / Student</option>
            <option value="owner">Lab Director / Resource Owner</option>
            <option value="admin">Institutional Safety Admin</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label" for="signup-department">Department / School *</label>
          <input type="text" class="form-input" id="signup-department" placeholder="e.g. Robotics & Mechanical Engineering" value="Robotics & Mechanical Engineering" required />
        </div>
      </div>

      <div class="form-group" style="margin-top:0.85rem;">
        <label class="form-label">Verified Prerequisite Safety Qualifications</label>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.4rem; padding:0.75rem; background:var(--bg-surface-elevated); border:1px solid var(--border-subtle); border-radius:var(--radius-sm); font-size:0.8rem;">
          <label style="display:flex; align-items:center; gap:0.4rem; cursor:pointer;">
            <input type="checkbox" id="cert-cb-laser" checked /> Laser / Machine Safety L1
          </label>
          <label style="display:flex; align-items:center; gap:0.4rem; cursor:pointer;">
            <input type="checkbox" id="cert-cb-bio" checked /> BioSafety Level 1 & 2
          </label>
          <label style="display:flex; align-items:center; gap:0.4rem; cursor:pointer;">
            <input type="checkbox" id="cert-cb-media" /> Media Studio Induction
          </label>
          <label style="display:flex; align-items:center; gap:0.4rem; cursor:pointer;">
            <input type="checkbox" id="cert-cb-cnc" /> CNC Machine Specialist
          </label>
        </div>
        <span style="font-size:0.7rem; color:var(--text-muted); margin-top:3px; display:block;">Select safety inductions you have completed to unlock relevant high-value equipment.</span>
      </div>

      <div class="form-row" style="margin-top:0.75rem;">
        <div class="form-group">
          <label class="form-label" for="signup-password">Password *</label>
          <input type="password" class="form-input" id="signup-password" placeholder="At least 6 characters" minlength="6" required />
        </div>
        <div class="form-group">
          <label class="form-label" for="signup-confirm-password">Confirm Password *</label>
          <input type="password" class="form-input" id="signup-confirm-password" placeholder="Repeat password" minlength="6" required />
        </div>
      </div>

      <div class="form-group" style="margin-top:0.85rem;">
        <label style="display:flex; align-items:flex-start; gap:0.5rem; font-size:0.78rem; color:var(--text-secondary); cursor:pointer;">
          <input type="checkbox" id="signup-safety-pledge" required style="margin-top:2px;" />
          <span>I pledge to follow institutional lab safety protocols, complete digital pre/post inspections, and accept accountability for reserved equipment.</span>
        </label>
      </div>

      <div class="modal-footer" style="padding-left:0; padding-right:0; margin-top:1.25rem;">
        <button type="button" class="btn btn-secondary" onclick="closeModal('signup-modal')">Cancel</button>
        <button type="submit" class="btn btn-primary">
          Complete Registration & Sign In
        </button>
      </div>

      <div style="margin-top:1.1rem; text-align:center; font-size:0.82rem; color:var(--text-muted); border-top:1px solid var(--border-subtle); padding-top:0.85rem;">
        Already have an account? 
        <a href="javascript:void(0)" onclick="closeModal('signup-modal'); openLoginModal();" style="color:var(--primary); font-weight:700; text-decoration:underline;">
          Log In Here
        </a>
      </div>
    </form>
  `;
  openModal("signup-modal");
}

function handleSignupSubmit(event) {
  event.preventDefault();
  const nameInput = document.getElementById("signup-name");
  const emailInput = document.getElementById("signup-email");
  const roleInput = document.getElementById("signup-role");
  const deptInput = document.getElementById("signup-department");
  const passInput = document.getElementById("signup-password");
  const confirmPassInput = document.getElementById("signup-confirm-password");
  const pledgeInput = document.getElementById("signup-safety-pledge");
  const errBox = document.getElementById("signup-error-msg");

  const name = nameInput ? nameInput.value.trim() : "";
  const email = emailInput ? emailInput.value.trim().toLowerCase() : "";
  const role = roleInput ? roleInput.value : "user";
  const department = deptInput ? deptInput.value.trim() : "";
  const password = passInput ? passInput.value : "";
  const confirmPassword = confirmPassInput ? confirmPassInput.value : "";
  const pledge = pledgeInput ? pledgeInput.checked : false;

  if (!name || !email || !department) {
    if (errBox) {
      errBox.textContent = "Please fill in all required fields.";
      errBox.style.display = "block";
    }
    return;
  }

  if (password !== confirmPassword) {
    if (errBox) {
      errBox.textContent = "Passwords do not match. Please re-enter.";
      errBox.style.display = "block";
    }
    return;
  }

  if (!pledge) {
    if (errBox) {
      errBox.textContent = "You must agree to the institutional safety protocols.";
      errBox.style.display = "block";
    }
    return;
  }

  // Check if email already exists
  const existing = State.users.find(u => u.email && u.email.toLowerCase() === email);
  if (existing) {
    if (errBox) {
      errBox.innerHTML = `An account with email <strong>${email}</strong> already exists. Please log in instead.`;
      errBox.style.display = "block";
    }
    return;
  }

  // Compute initials
  const nameParts = name.split(" ").filter(Boolean);
  const initials = (nameParts.length > 1 ? nameParts[0][0] + nameParts[nameParts.length - 1][0] : name.substring(0, 2)).toUpperCase();

  // Role labels
  let roleLabel = "Graduate Researcher / Student";
  if (role === "owner") roleLabel = "Lab Director / Resource Owner";
  if (role === "admin") roleLabel = "Institutional Safety Admin";

  const colorPalette = ["#6366f1", "#10b981", "#f59e0b", "#06b6d4", "#8b5cf6", "#ec4899", "#3b82f6"];
  const avatarColor = colorPalette[State.users.length % colorPalette.length];

  // Certifications
  const certs = [];
  const today = new Date().toISOString().split("T")[0];
  if (document.getElementById("cert-cb-laser")?.checked) {
    certs.push({ id: "cert-laser", title: "Laser Safety Level 1", verifiedDate: today, status: "Active" });
  }
  if (document.getElementById("cert-cb-bio")?.checked) {
    certs.push({ id: "cert-biosafety", title: "BioSafety Level 1", verifiedDate: today, status: "Active" });
  }
  if (document.getElementById("cert-cb-media")?.checked) {
    certs.push({ id: "cert-media", title: "Media Production Induction", verifiedDate: today, status: "Active" });
  }
  if (document.getElementById("cert-cb-cnc")?.checked) {
    certs.push({ id: "cert-cnc-master", title: "CNC Machine Specialist", verifiedDate: today, status: "Active" });
  }

  const newUserId = "usr-" + Date.now();
  const newUser = {
    id: newUserId,
    name: name,
    role: role,
    roleLabel: roleLabel,
    department: department,
    email: email,
    avatar: initials,
    avatarColor: avatarColor,
    verified: true,
    certifications: certs,
    weeklyQuotaHours: role === "user" ? 15 : 40,
    weeklyHoursUsed: 0,
    managedResourceIds: role === "owner" ? [] : undefined
  };

  State.users.push(newUser);
  State.activeUserId = newUser.id;
  saveState();

  recordAudit("USER_REGISTERED", "Identity Management", `New institutional account registered for ${newUser.name} (${newUser.roleLabel}) with ${newUser.certifications.length} verified safety qualifications.`);
  showToast(`Account successfully created! Welcome, ${newUser.name}.`, "success");
  closeModal("signup-modal");
  renderApp();
}

// 14. LOGOUT HANDLER
function handleLogout() {
  const user = getActiveUser();
  recordAudit("USER_LOGOUT", "Authentication", `${user.name} logged out.`);
  showToast(`Logged out of ${user.name}'s account.`, "info");
  State.activeUserId = State.users[0]?.id || "usr-alex";
  saveState();
  renderApp();
  openLoginModal();
}

// Toggle notifications popup
function toggleNotifDropdown() {
  const dropdown = document.getElementById("notif-dropdown");
  if (!dropdown) return;
  dropdown.classList.toggle("open");
  const badge = document.querySelector(".btn-icon .notif-dot");
  if (badge) badge.style.display = "none";
}

// Bootstrap Application on Window Load
window.addEventListener("DOMContentLoaded", () => {
  initStorage();
  renderApp();

  // Close modals on ESC
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      document.querySelectorAll(".modal-backdrop.open").forEach(m => m.classList.remove("open"));
    }
  });

  // Close modals on backdrop click
  window.addEventListener("click", (e) => {
    if (e.target.classList && e.target.classList.contains("modal-backdrop")) {
      e.target.classList.remove("open");
    }
  });

  // Close notifications dropdown when clicking outside
  window.addEventListener("click", (e) => {
    const notifBtn = document.getElementById("notif-btn");
    const dropdown = document.getElementById("notif-dropdown");
    if (dropdown && notifBtn && !notifBtn.contains(e.target) && !dropdown.contains(e.target)) {
      dropdown.classList.remove("open");
    }
  });
});
