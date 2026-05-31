// dashboard.js - Core SPA Logic
function formatDate(dateStr) {
    if (!dateStr) return 'TBD';
    if (dateStr.includes('/')) return dateStr; // Already formatted
    const [y, m, d] = dateStr.split('-');
    if (!y || !m || !d) return dateStr;
    return `${d}/${m}/${y}`;
}

// Provide fallback globals for custom alerts since they are heavily used
window.customAlert = function(msg) {
    alert(msg);
};
window.customConfirm = async function(msg) {
    return window.confirm(msg);
};

// 1. SPA Tab Switching
function switchTab(tabId, el) {
    document.querySelectorAll('.spa-section').forEach(sec => sec.classList.remove('active'));
    document.getElementById('sec-' + tabId).classList.add('active');
    
    document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
    if(el) el.classList.add('active');

    // Update Titles
    const titles = {
        'events': ['Dashboard', 'Welcome back to your dashboard'],
        'registrations': ['Registrations', 'Manage all imported and manual student registrations'],
        'analytics': ['Analytics', 'Real-time registration metrics and insights'],
        'feedback': ['Feedback', 'Monitor live feedback metrics and survey responses'],
        'scanner': ['QR Scanner', 'Verify attendance in real-time'],
        'reports': ['Reports', 'Generate and export event data'],
        'notifications': ['Notifications', 'Manage system alerts and user activity log'],
        'settings': ['Settings', 'Configure admin profile and preferences']
    };
    
    document.getElementById('pageTitle').innerText = titles[tabId][0];
    document.getElementById('pageSubtitle').innerText = titles[tabId][1];

    if(tabId === 'events') loadEvents();
    if(tabId === 'registrations') loadRegistrations();
    if(tabId === 'analytics') loadAnalytics();
    if(tabId === 'feedback') loadFeedbackDashboard();
    if(tabId === 'reports') loadReports();
    if(tabId === 'notifications') loadNotifications();
    if(tabId === 'settings') loadSettings();
}

// 2. Modals
function openModal(id) { const el = document.getElementById(id); if (el) el.style.display = 'flex'; }
function closeModal(id) { const el = document.getElementById(id); if (el) el.style.display = 'none'; }

// Close modals on overlay click
window.onclick = function(event) {
    if (event.target.classList.contains('modal-overlay')) {
        event.target.style.display = 'none';
    }
}

// Logout
function logout() {
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('adminProfile');
    window.location.href = 'index.html';
}

// Set Date
const dateDisplay = document.getElementById('currentDateDisplay');
if(dateDisplay) {
    dateDisplay.innerText = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// Mobile Menu Toggle
document.addEventListener('DOMContentLoaded', () => {
    const mobileBtn = document.getElementById('mobileMenuBtn');
    if (mobileBtn) {
        mobileBtn.addEventListener('click', () => {
            document.body.classList.toggle('sidebar-open');
        });
    }
    // Master Checkbox Logic
    const masterCheckbox = document.getElementById('selectAllRegistrations');
    if (masterCheckbox) {
        masterCheckbox.addEventListener('change', (e) => {
            const checkboxes = document.querySelectorAll('.row-checkbox');
            checkboxes.forEach(cb => cb.checked = e.target.checked);
        });
    }
});

// Close sidebar on mobile when a nav item is clicked
function closeSidebarOnMobile() {
    if (window.innerWidth <= 1024) {
        document.body.classList.remove('sidebar-open');
    }
}

// Override switchTab to include closing the sidebar
const originalSwitchTab = switchTab;
window.switchTab = function(tabId, el) {
    originalSwitchTab(tabId, el);
    closeSidebarOnMobile();
};

// ==========================================
// API & DATA HANDLING

// ==========================================

let globalData = null;
let lastFetchTime = 0;
const CACHE_DURATION = 5000; // 5 seconds cache for snappy feel

async function fetchUnifiedData(force = false) {
    const now = Date.now();
    // Return cached data if available and not forced
    if (globalData && !force && (now - lastFetchTime < CACHE_DURATION)) {
        return globalData;
    }

    try {
        const res = await fetch('/api/admin/analytics');
        if(!res.ok) throw new Error('Network error');
        globalData = await res.json();
        lastFetchTime = Date.now();
        return globalData;
    } catch(e) {
        console.error('Fetch error:', e);
        return globalData; // Fallback to stale cache if fetch fails
    }
}

// WebSockets for Real-time Analytics
const socket = typeof io !== 'undefined' ? io() : null;
if (socket) {
    socket.on('newSubmission', (data) => {
        // Data contains { eventId, scholarId, totalScans }
        if (globalData) {
            globalData.totalRegistrations++;
            const ev = globalData.events.find(e => e.eventId === data.eventId);
            if (ev) ev.registrationsCount = data.totalScans;
            
            // Re-render if on events (which contains the main dashboard stats)
            if (document.getElementById('sec-events').classList.contains('active')) {
                const dashRegEl = document.getElementById('dashTotalReg');
                if(dashRegEl) dashRegEl.innerText = globalData.totalRegistrations;
                if(typeof chartsInitialized !== 'undefined' && chartsInitialized) updateCharts(globalData);
            }
            if (document.getElementById('sec-events').classList.contains('active')) {
                loadEvents();
            }
            if (document.getElementById('sec-analytics') && document.getElementById('sec-analytics').classList.contains('active')) {
                loadAnalytics();
            }
        } else {
            // If data not loaded yet, just load it
            fetchUnifiedData().then(() => {
                if (document.getElementById('sec-events').classList.contains('active')) loadEvents();
                if (document.getElementById('sec-analytics') && document.getElementById('sec-analytics').classList.contains('active')) loadAnalytics();
            });
        }
    });
}

// ==========================================
// DASHBOARD SECTION
// ==========================================






// ==========================================
// EVENTS SECTION
// ==========================================
async function loadEvents() {
    const data = await fetchUnifiedData();
    if(!data) return;

    // Update counters (moved from dashboard to events)
    const stats = {
        'dashTotalEvents': data.totalEvents,
        'dashTotalReg': data.totalRegistrations,
        'dashRevenue': '$' + (data.revenue || 0).toLocaleString(),
        'dashAttendance': data.totalAttendance
    };
    
    for (const [id, val] of Object.entries(stats)) {
        const el = document.getElementById(id);
        if (el) el.innerText = val;
    }



    const container = document.getElementById('eventsContainer');
    const uploadSelect = document.getElementById('uploadEventSelect');
    const modalUploadSelect = document.getElementById('modalUploadEventSelect');
    const modalManualSelect = document.getElementById('modalManualEventSelect');
    const registrationsSelect = document.getElementById('registrationsEventSelect');
    const analyticsSelect = document.getElementById('analyticsEventSelect');
    
    if (container) container.innerHTML = '';
    if (uploadSelect) uploadSelect.innerHTML = '<option value="">Select Event to Target</option>';
    if (modalUploadSelect) modalUploadSelect.innerHTML = '<option value="">Select Event to Target</option>';
    if (modalManualSelect) modalManualSelect.innerHTML = '<option value="">Select Event to Target</option>';
    if (registrationsSelect) registrationsSelect.innerHTML = '<option value="">All Events / Select Filter</option>';
    if (analyticsSelect) analyticsSelect.innerHTML = '<option value="">Select Event</option>';

    if(data.events.length === 0) {
        if (container) container.innerHTML = '<p style="color:var(--text-secondary);">No active events. Deploy a new engine.</p>';
        return;
    }

    data.events.forEach(ev => {
        // Populate Selects
        if (uploadSelect) uploadSelect.innerHTML += `<option value="${ev.adminId}">${ev.eventName}</option>`;
        if (modalUploadSelect) modalUploadSelect.innerHTML += `<option value="${ev.adminId}">${ev.eventName}</option>`;
        if (modalManualSelect) modalManualSelect.innerHTML += `<option value="${ev.adminId}">${ev.eventName}</option>`;
        if (registrationsSelect) registrationsSelect.innerHTML += `<option value="${ev.adminId}">${ev.eventName}</option>`;
        if (analyticsSelect) analyticsSelect.innerHTML += `<option value="${ev.adminId}">${ev.eventName}</option>`;

        if (analyticsSelect && window.currentTargetAdminId) {
            analyticsSelect.value = window.currentTargetAdminId;
        }

        if (!container) return;

        // Render Card
        const progress = Math.min(((ev.registrationsCount || 0) / ev.capacity) * 100, 100).toFixed(0);
        // Determine status based on date
        let dynamicStatus = 'Ongoing';
        if (ev.date) {
            const eventDate = new Date(ev.date);
            const today = new Date();
            // Reset time to compare just dates
            today.setHours(0, 0, 0, 0);
            eventDate.setHours(0, 0, 0, 0);
            
            if (eventDate < today) {
                dynamicStatus = 'Completed';
            }
        }

        const thumbUrl = ev.imageUrl && ev.imageUrl.includes('cloudinary') 
            ? ev.imageUrl.replace('/upload/', '/upload/w_600,c_limit,q_auto,f_auto/') 
            : (ev.imageUrl || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?q=80&w=600&auto=format&fit=crop');
        
        container.innerHTML += `
            <div class="event-card" data-admin-id="${ev.adminId}" data-status="${dynamicStatus}" style="display: flex; flex-direction: column; cursor: pointer;">
                <div class="event-banner" style="background-image: url('${thumbUrl}'); height: 160px; position: relative; background-size: cover; background-position: center;">
                </div>
                <div class="event-details" style="padding: 1.5rem; flex: 1; display: flex; flex-direction: column;">
                    <h3 class="event-title" style="margin-bottom: 0.5rem; font-size: 1.25rem;">${ev.eventName}</h3>
                    <p class="event-desc" style="color: var(--text-secondary); font-size: 0.85rem; margin-bottom: 1.5rem;">Event Date: ${formatDate(ev.date)}</p>
                    
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1.5rem;">
                        <div style="border-left: 2px solid var(--neon-cyan); padding-left: 1rem; display: flex; flex-direction: column; gap: 0.2rem;">
                            <p style="font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 0.2rem;">Quick Stats</p>
                            <p style="font-size: 0.9rem;">Venue: <strong>${ev.venue || 'Main Hall'}</strong></p>
                            <p style="font-size: 0.9rem;">Time: <strong>${ev.time || '10:00 AM'}</strong></p>
                            <p style="font-size: 0.9rem;">Capacity: <strong>${ev.capacity}</strong></p>
                            <button class="btn-glow" style="margin-top: 0.8rem; padding: 0.4rem 0.8rem; font-size: 0.8rem; background: var(--neon-purple); border-color: var(--neon-purple); align-self: flex-start;" onclick="event.stopPropagation(); requestFeedback('${ev.adminId}')">🌟 Feedback</button>
                        </div>
                         <div style="display: flex; flex-direction: column; align-items: center; gap: 0.4rem;">
                            <div class="event-qr" style="background: white; padding: 4px; border-radius: 4px; box-shadow: 0 4px 10px rgba(0,0,0,0.1);" onclick="event.stopPropagation(); openEventQrModal('${ev.adminId}', '${ev.eventName.replace(/'/g, "\\'")}', '${ev.date}')">
                                <img src="https://api.qrserver.com/v1/create-qr-code/?size=75x75&data=${encodeURIComponent(window.location.origin + '/user.html?eventId=' + ev.adminId)}&color=000000" alt="Event QR" style="display: block; width: 75px; height: 75px;">
                            </div>
                            <a href="${window.location.origin}/user.html?eventId=${ev.adminId}" target="_blank" onclick="event.stopPropagation();" style="font-family: monospace; font-size: 0.6rem; color: var(--neon-cyan); text-decoration: none; border-bottom: 1px dashed var(--neon-cyan); opacity: 0.8; transition: 0.3s;">Portal Link</a>
                            <span style="font-family: monospace; font-size: 0.65rem; color: var(--neon-cyan); opacity: 0.9; letter-spacing: 0.5px;">${ev.adminId}</span>
                        </div>
                    </div>

                    <div class="card-actions" style="display: flex; gap: 0.5rem; margin-top: auto;">
                        <a href="https://docs.google.com/spreadsheets/d/${ev.spreadsheetId}" target="_blank" class="btn-glow" style="text-decoration: none; padding: 0.5rem 1rem; flex: 1; font-size: 0.85rem;" onclick="event.stopPropagation();">📊 Sheet</a>
                        <button class="btn-glow" style="padding: 0.5rem 1rem; flex: 1; font-size: 0.85rem;" onclick="event.stopPropagation(); triggerImageUpdate('${ev.adminId}')">📷 Image</button>
                        <button class="btn-danger" style="padding: 0.5rem 1rem; flex: 1; font-size: 0.85rem;" onclick="event.stopPropagation(); deleteEvent('${ev.adminId}')">Delete</button>
                    </div>
                </div>
            </div>
        `;
    });
}

// ==========================================
// EVENT DETAILS MODAL
// ==========================================
function showEventDetails(adminId) {
    if (!globalData || !globalData.events) {
        console.warn('showEventDetails: globalData not ready');
        return;
    }
    const ev = globalData.events.find(e => e.adminId === adminId);
    if (!ev) {
        console.warn('showEventDetails: event not found for adminId', adminId);
        return;
    }

    // Set banner image with robust fallback
    const banner = document.getElementById('detailModalBanner');
    if (banner) {
        // Log the image URL for debugging
        console.log(`Rendering image for event: ${ev.eventName}`, ev.imageUrl);
        
        const fallbackImg = 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?q=80&w=760&auto=format&fit=crop';
        const finalImg = (ev.imageUrl && ev.imageUrl.trim() !== '') ? ev.imageUrl : fallbackImg;
        
        banner.style.backgroundImage = `url('${finalImg}')`;
        banner.style.backgroundColor = 'var(--bg-card)'; // Base color while loading
    }

    // Populate text fields
    document.getElementById('detailEventName').innerText = ev.eventName || 'Unnamed Event';
    document.getElementById('detailEventDesc').innerText = ev.description || 'Join us for this exclusive event!';
    document.getElementById('detailEventDateTime').innerText = `${formatDate(ev.date) || 'TBD'} \u2022 ${ev.time || '10:00 AM'}`;
    document.getElementById('detailEventVenue').innerText = ev.venue || 'Main Auditorium, DSVV';
    document.getElementById('detailEventCapacity').innerText = `${ev.registrationsCount || 0} / ${ev.capacity || 0}`;
    document.getElementById('detailEventPrice').innerText = `$${ev.price || 0}`;
    document.getElementById('detailEventOrganizer').innerText = ev.organizer || ev.adminName || 'Event Committee';
    document.getElementById('detailEventCategory').innerText = ev.category || 'General';

    openModal('eventDetailsModal');
}

// Use event delegation so clicks reliably fire even after innerHTML re-renders
document.addEventListener('click', function(e) {
    const card = e.target.closest('.event-card[data-admin-id]');
    if (!card) return;
    // Only fire if the click was NOT on an action button/link/QR section inside the card
    if (e.target.closest('.card-actions') || e.target.closest('.event-qr')) return;
    showEventDetails(card.dataset.adminId);
});

let currentEventFilter = 'All';

function filterEvents(filter, btn) {
    currentEventFilter = filter;
    const buttons = document.querySelectorAll('#eventFiltersContainer button');
    buttons.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    applyEventFilters();
}

function searchEvents() {
    applyEventFilters();
}

function applyEventFilters() {
    const query = (document.getElementById('eventSearchInput').value || '').toLowerCase();
    const cards = document.querySelectorAll('#eventsContainer .event-card');
    
    cards.forEach(card => {
        const status = card.getAttribute('data-status');
        const title = card.querySelector('.event-title').innerText.toLowerCase();
        
        let matchesStatus = (currentEventFilter === 'All' || status.toLowerCase() === currentEventFilter.toLowerCase());
        let matchesSearch = (query === '' || title.includes(query));
        
        if(matchesStatus && matchesSearch) {
            card.style.display = 'flex';
        } else {
            card.style.display = 'none';
        }
    });
}

// Create Event
document.getElementById('createEventForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btnCreateEvent');
    btn.innerText = 'Deploying...'; btn.disabled = true;

    const formData = new FormData();
    formData.append('eventName', document.getElementById('evName').value);
    formData.append('adminName', document.getElementById('evAdmin').value);
    formData.append('organizer', document.getElementById('evOrganizer').value);
    formData.append('date', document.getElementById('evDate').value);
    formData.append('time', document.getElementById('evTime').value);
    formData.append('venue', document.getElementById('evVenue').value);
    formData.append('description', document.getElementById('evDesc').value);
    formData.append('capacity', document.getElementById('evCap').value);
    formData.append('price', document.getElementById('evPrice').value);
    
    const fileInput = document.getElementById('evImage');
    if (fileInput.files.length > 0) {
        formData.append('image', fileInput.files[0]);
    }

    try {
        const res = await fetch('/api/admin/create-card', { 
            method: 'POST', 
            body: formData 
        });
        if(res.ok) {
            const data = await res.json();
            closeModal('createEventModal');
            document.getElementById('createEventForm').reset();
            
            // Re-fetch data and reload view
            await fetchUnifiedData(true); // Force refresh
            await loadEvents();
            
            // Show cinematic success feedback
            customAlert('🎉 Success! Event has been deployed and Google Sheet is synchronized.');
        } else {
            const error = await res.json();
            customAlert('Deployment Error: ' + (error.error || 'Unknown error'));
        }
    } catch(e) { 
        console.error('Deployment flow error:', e);
        customAlert('Network or System Error occurred during deployment.');
    }
    finally { btn.innerText = 'Generate System'; btn.disabled = false; }
});

async function deleteEvent(id) {
    if(!await customConfirm('Are you sure you want to delete this event? The Google Sheet tab will also be deleted.')) return;
    try {
        await fetch(`/api/admin/event/${id}`, { method: 'DELETE' });
        
        // If the deleted event was currently selected in Registrations tab, reset it
        if (window.currentTargetAdminId === id) {
            window.currentTargetAdminId = null;
        }
        
        // Refresh all dynamic parts of the UI
        await fetchUnifiedData(true); // Update globalData first
        loadEvents();
        
        // Force refresh of the registrations view to clear the table or switch to next event
        await loadRegistrations(); 
    } catch(e) {
        console.error('Delete event error:', e);
    }
}

// Update Event Image
function triggerImageUpdate(adminId) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('image', file);

        try {
            const res = await fetch(`/api/admin/event/${adminId}/image`, {
                method: 'PUT',
                body: formData
            });
            const data = await res.json();
            if(res.ok) {
                customAlert('Image updated successfully!');
                loadEvents();
            } else {
                customAlert('Failed to update image: ' + data.error);
            }
        } catch(err) {
            customAlert('Network error while updating image');
        }
    };
    input.click();
}

// ==========================================
// REGISTRATIONS & UPLOADS
// ==========================================
// Removed uploadTargetLabel change listener as the input was removed.

document.getElementById('uploadForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const adminId = document.getElementById('modalUploadEventSelect').value;
    if(!adminId) return customAlert('Select an event first from the dropdown!');

    const fileInput = document.getElementById('bulkFile');
    const formData = new FormData();
    formData.append('file', fileInput.files[0]);

    const btn = document.getElementById('btnUpload');
    btn.innerText = 'Extracting...'; btn.disabled = true;

    try {
        const res = await fetch(`/api/events/upload/${adminId}`, {
            method: 'POST',
            body: formData
        });
        const data = await res.json();
        if(res.ok) {
            customAlert(`Success! ${data.message}`);
            closeModal('uploadModal');
            loadRegistrations(); // Refresh table
        } else {
            customAlert('Upload Failed: ' + data.error);
        }
    } catch(err) {
        customAlert('Network error during upload');
    } finally {
        btn.innerText = 'Process & Extract'; btn.disabled = false;
        fileInput.value = '';
    }
});

let currentRegistrationsData = [];
let currentFilter = 'All';
let currentSearch = '';

// Event listeners for registrations filtering are now unified in DOMContentLoaded

// Assuming search input is the first input inside sec-registrations
document.querySelector('#sec-registrations input[type="text"]').addEventListener('input', (e) => {
    currentSearch = e.target.value.toLowerCase();
    renderRegistrationsTable();
});

// Registrations status filter dropdown handles the filtering logic now (wired up in DOMContentLoaded)

async function loadRegistrations() {
    let targetAdminId = window.currentTargetAdminId;

    if(!targetAdminId) {
        if (!globalData) await fetchUnifiedData();
        if (globalData && globalData.events.length > 0) {
            targetAdminId = globalData.events[0].adminId;
            const regEventSelect = document.getElementById('registrationsEventSelect');
            if(regEventSelect) regEventSelect.value = targetAdminId;
        }
    }
    window.currentTargetAdminId = targetAdminId;
    
    // Clear the table if no event is currently active/available
    if(!targetAdminId) {
        currentRegistrationsData = [];
        renderRegistrationsTable();
        return;
    }

    try {
        const res = await fetch(`/api/admin/dashboard/${targetAdminId}`);
        if (res.status === 404) {
            window.currentTargetAdminId = null;
            if (globalData && globalData.events.length > 0) return loadRegistrations();
            return;
        }
        const data = await res.json();
        currentRegistrationsData = data.registrations || [];
        renderRegistrationsTable();
    } catch(e) { console.error(e); }
}

function renderRegistrationsTable() {
    const masterCheckbox = document.getElementById('selectAllRegistrations');
    if (masterCheckbox) masterCheckbox.checked = false;

    const tbody = document.getElementById('registrationsTableBody');
    tbody.innerHTML = '';

    let filtered = currentRegistrationsData;

    if (currentFilter !== 'All') {
        filtered = filtered.filter(r => r.attendance === currentFilter);
    }

    if (currentSearch) {
        filtered = filtered.filter(r => 
            (r.name || '').toLowerCase().includes(currentSearch) || 
            (r.scholarId || '').toLowerCase().includes(currentSearch)
        );
    }

    if(filtered.length > 0) {
        filtered.forEach(row => {
            const statClass = row.attendance === 'Present' ? 'status-present' : 'status-pending';
            const dateStr = new Date(row.timestamp).toLocaleDateString();
            const displayId = row.scholarId || row.registrationId || '-';
            const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${row.scholarId || displayId}`;
            
            tbody.innerHTML += `
                <tr>
                    <td style="text-align: center;"><input type="checkbox" class="row-checkbox custom-checkbox" data-id="${row.scholarId}"></td>
                    <td style="font-family: monospace; color: var(--neon-cyan);">${displayId}</td>
                    <td style="font-weight:600;">${row.name || '-'}</td>
                    <td>${row.mobile || '-'}</td>
                    <td style="color:var(--neon-cyan);">${row.email || '-'}</td>
                    <td>${row.course || '-'} / ${row.semester || '-'}</td>
                    <td>${dateStr}</td>
                    <td><span style="font-size: 0.8rem; font-family: monospace; color: #94a3b8;">${row.ipAddress || 'Unknown IP'}</span></td>
                    <td><span class="status-badge ${statClass}">${row.attendance || 'Pending'}</span></td>
                    <td>
                        <button class="btn-outline" style="padding: 4px 8px; font-size: 0.75rem;" onclick="openViewQrModal('${displayId}', '${row.name}', '${row.course}', '${row.semester}', '${qrUrl}')">
                            <i class="fas fa-qrcode"></i> View QR
                        </button>
                    </td>
                    <td><button class="btn-danger" style="padding: 4px 8px; font-size: 0.8rem; border-radius: 8px;" onclick="deleteSingleRegistration('${row.scholarId}')">Delete</button></td>
                </tr>
            `;
        });
    } else {
        tbody.innerHTML = '<tr><td colspan="10" style="text-align:center; padding: 2rem; color: var(--text-secondary);">No matching registrations found.</td></tr>';
    }
}

function openViewQrModal(id, name, course, semester, qrUrl) {
    document.getElementById('modalQrHeader').innerText = 'Student QR Code';
    document.getElementById('modalQrId').innerText = id;
    document.getElementById('modalQrName').innerText = name;
    document.getElementById('modalQrCourse').innerText = `${course} - ${semester}`;
    document.getElementById('modalQrImage').src = qrUrl;
    const linkEl = document.getElementById('modalQrPortalLink');
    if(linkEl) linkEl.style.display = 'none';
    openModal('viewQrModal');
}

function openEventQrModal(adminId, eventName, date) {
    const portalUrl = `${window.location.origin}/user.html?eventId=${adminId}`;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(portalUrl)}&color=000000`;
    document.getElementById('modalQrHeader').innerText = 'Event QR Code';
    document.getElementById('modalQrId').innerText = adminId;
    document.getElementById('modalQrName').innerText = eventName;
    document.getElementById('modalQrCourse').innerText = `Date: ${formatDate(date)}`;
    document.getElementById('modalQrImage').src = qrUrl;
    
    const linkEl = document.getElementById('modalQrPortalLink');
    if(linkEl) {
        linkEl.href = portalUrl;
        linkEl.innerText = `${window.location.origin}/user.html`;
        linkEl.style.display = 'inline-block';
    }
    
    openModal('viewQrModal');
}

function downloadQrImage() {
    const imgEl = document.getElementById('modalQrImage');
    const qrUrl = imgEl.src;
    const eventName = document.getElementById('modalQrName').innerText || 'Event';
    const btn = document.getElementById('btnDownloadQr');
    
    if (!qrUrl || !btn) return;
    
    const originalText = btn.innerText;
    btn.innerText = 'DOWNLOADING...';
    btn.disabled = true;

    const img = new Image();
    img.crossOrigin = 'Anonymous'; // Allow fetching across origins to prevent tainted canvas
    img.onload = () => {
        try {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            
            // Fill solid white background to prevent transparency issues
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // Draw the QR
            ctx.drawImage(img, 0, 0);
            
            // Export to high-quality PNG
            const dataUrl = canvas.toDataURL('image/png', 1.0);
            const link = document.createElement('a');
            link.href = dataUrl;
            link.download = `${eventName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_qr.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (e) {
            console.error('Canvas export error, falling back to open:', e);
            window.open(qrUrl, '_blank');
        } finally {
            btn.innerText = originalText;
            btn.disabled = false;
        }
    };
    img.onerror = () => {
        console.error('Error loading QR image for download');
        window.open(qrUrl, '_blank');
        btn.innerText = originalText;
        btn.disabled = false;
    };
    img.src = qrUrl;
}


// ==========================================
// QR SCANNER
// ==========================================
document.getElementById('verifyIdForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const searchId = document.getElementById('verifyInputId').value.trim();
    if (!searchId) return;

    const btn = e.target.querySelector('button[type="submit"]');
    btn.innerText = 'Searching...'; btn.disabled = true;

    try {
        const res = await fetch('/api/admin/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ searchId })
        });
        const data = await res.json();
        
        const container = document.getElementById('verifyResultContainer');
        if(res.ok) {
            const r = data.registration;
            container.innerHTML = `
                <div style="background: rgba(16, 185, 129, 0.1); border: 1px solid var(--neon-green); border-radius: 8px; padding: 1.5rem; text-align: left;">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem;">
                        <div>
                            <span style="background: var(--neon-green); color: white; padding: 2px 8px; border-radius: 12px; font-size: 0.7rem; font-weight: bold; text-transform: uppercase;">Verified</span>
                            <h4 style="color: var(--text-primary); font-size: 1.2rem; margin-top: 0.5rem;">${r.name}</h4>
                            <p style="color: var(--neon-cyan); font-family: monospace; font-size: 1.1rem;">Scholar ID: ${r.scholarId}</p>
                            ${r.registrationId ? `<p style="color: var(--text-secondary); font-size: 0.85rem;">Reg ID: ${r.registrationId}</p>` : ''}
                        </div>
                        <div style="text-align: right;">
                            <p style="color: var(--text-secondary); font-size: 0.8rem;">Course</p>
                            <p style="color: var(--text-primary); font-weight: 600;">${r.course} (${r.semester})</p>
                        </div>
                    </div>
                    
                    <div style="border-top: 1px solid rgba(255,255,255,0.1); padding-top: 1rem; margin-top: 1rem;">
                        <p style="color: var(--text-secondary); font-size: 0.85rem; margin-bottom: 0.5rem;">Event ID: <span style="color: white;">${r.eventId}</span></p>
                        <p style="color: var(--text-secondary); font-size: 0.85rem;">Status: <span style="color: var(--neon-green); font-weight: bold;">Checked In / Present</span></p>
                    </div>
                    <button class="btn-success" style="width: 100%; margin-top: 1.5rem;" onclick="document.getElementById('verifyInputId').value=''; document.getElementById('verifyInputId').focus(); document.getElementById('verifyResultContainer').innerHTML='<div style=\\'text-align:center; color: var(--text-secondary); padding: 3rem 0;\\'><p>Enter an ID to verify registration.</p></div>';">Next Scan</button>
                </div>
            `;
            // Also refresh stats
            fetchUnifiedData(true).then(() => {
                loadEvents();
                loadRegistrations();
            });
        } else {
            container.innerHTML = `
                <div style="background: rgba(239, 68, 68, 0.1); border: 1px solid #ef4444; border-radius: 8px; padding: 1.5rem; text-align: center;">
                    <div style="font-size: 2rem; margin-bottom: 0.5rem;">❌</div>
                    <div style="width: 50px; height: 50px; border-radius: 50%; background: rgba(239, 68, 68, 0.2); display: flex; align-items: center; justify-content: center; margin: 0 auto 1rem auto;">
                        <i class="fas fa-times" style="color: #ef4444; font-size: 1.5rem;"></i>
                    </div>
                    <h4 style="color: var(--text-primary); font-size: 1.2rem; margin-bottom: 0.5rem;">Verification Failed</h4>
                    <p style="color: var(--text-secondary); font-size: 0.9rem;">${data.error || 'Invalid Registration ID or Scholar ID'}</p>
                </div>
            `;
        }
    } catch(err) {
        customAlert('Network Error');
    } finally {
        btn.innerText = '🔍 Lookup ID'; btn.disabled = false;
    }
});

function renderQRHistory(history) {
    const container = document.getElementById('qrHistoryContainer');
    if (!container) {
        console.warn('QR History container not found. Skipping render.');
        return;
    }
    
    container.innerHTML = '';
    if(!history || history.length === 0) {
        container.innerHTML = '<p style="color:var(--text-secondary); text-align:center;">No QR Codes generated yet.</p>';
        return;
    }

    // Newest first
    [...history].reverse().forEach(qr => {
        container.innerHTML += `
            <div class="qr-card">
                <div class="qr-image"><img src="${qr.qrImage}" alt="QR"></div>
                <div>
                    <h3 style="color: var(--neon-cyan); letter-spacing: 1px; font-family: monospace; font-size: 1.4rem;">${qr.qrId}</h3>
                    <p style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 0.5rem;">Event: <span style="color:white;">${qr.eventName}</span></p>
                    <p style="font-size: 0.75rem; color: #888;">Gen: ${new Date(qr.timestamp).toLocaleString()}</p>
                </div>
            </div>
        `;
    });
}



// ==========================================
// REPORTS SECTION
// ==========================================
// Reports state variables
let currentReportType = 'events';
let reportSearchQuery = '';
let reportSortOrder = null; // 'asc' or 'desc'

let cachedAllRegistrations = [];
let lastRegsFetchTime = 0;

async function fetchAllRegistrations(force = false) {
    const now = Date.now();
    if (cachedAllRegistrations.length > 0 && !force && (now - lastRegsFetchTime < 10000)) {
        return cachedAllRegistrations;
    }
    
    const data = await fetchUnifiedData();
    if (!data || !data.events) return [];
    
    const allRegs = [];
    await Promise.all(data.events.map(async (ev) => {
        try {
            const res = await fetch(`/api/admin/dashboard/${ev.adminId}`);
            if (res.ok) {
                const resData = await res.json();
                const regs = resData.registrations || [];
                regs.forEach(r => {
                    r.eventName = ev.eventName;
                    r.ticketPrice = ev.price || 0;
                });
                allRegs.push(...regs);
            }
        } catch (e) {
            console.error('Error fetching registrations for ' + ev.adminId, e);
        }
    }));
    
    cachedAllRegistrations = allRegs;
    lastRegsFetchTime = Date.now();
    return allRegs;
}

function switchReportType(type) {
    currentReportType = type;
    
    // Update button states
    const btnIds = ['events', 'registrations', 'revenue', 'attendance'];
    btnIds.forEach(id => {
        const btn = document.getElementById(`repBtn-${id}`);
        if (btn) {
            if (id === type) {
                btn.className = 'btn-primary';
                btn.style.textShadow = 'none';
            } else {
                btn.className = 'btn-outline';
            }
        }
    });
    
    // Clear search and sort when switching reports
    reportSearchQuery = '';
    reportSortOrder = null;
    const searchInput = document.getElementById('reportSearchInput');
    if (searchInput) searchInput.value = '';
    
    const sortA = document.getElementById('sortAtoZ');
    const sortZ = document.getElementById('sortZtoA');
    if (sortA) sortA.classList.remove('active');
    if (sortZ) sortZ.classList.remove('active');
    
    renderReportPreview();
}

function setReportSort(order) {
    if (reportSortOrder === order) {
        reportSortOrder = null; // toggle off
    } else {
        reportSortOrder = order;
    }
    
    const sortA = document.getElementById('sortAtoZ');
    const sortZ = document.getElementById('sortZtoA');
    if (sortA) sortA.classList.toggle('active', reportSortOrder === 'asc');
    if (sortZ) sortZ.classList.toggle('active', reportSortOrder === 'desc');
    
    renderReportPreview();
}

async function renderReportPreview() {
    const tbody = document.getElementById('reportPreviewTable');
    const thead = document.getElementById('reportPreviewHead');
    const titleEl = document.getElementById('reportPreviewTitle');
    
    if (!tbody || !thead) return;
    
    // Show loading indicator
    tbody.innerHTML = `<tr><td colspan="10" style="text-align:center; padding: 2rem; color: var(--text-secondary);"><i class="fas fa-spinner fa-spin"></i> Loading preview...</td></tr>`;
    
    const data = await fetchUnifiedData();
    if (!data) {
        tbody.innerHTML = `<tr><td colspan="10" style="text-align:center; padding: 2rem; color: var(--text-secondary);">Error loading data.</td></tr>`;
        return;
    }
    
    if (currentReportType === 'events') {
        if (titleEl) titleEl.innerText = 'Events Preview';
        
        thead.innerHTML = `
            <tr style="text-align: left; border-bottom: 1px solid var(--glass-border);">
                <th style="padding: 1rem;">Event</th>
                <th style="padding: 1rem;">Date</th>
                <th style="padding: 1rem;">Registered</th>
                <th style="padding: 1rem;">Revenue</th>
            </tr>
        `;
        
        let events = [...data.events];
        
        // Search
        if (reportSearchQuery) {
            events = events.filter(ev => 
                (ev.eventName || '').toLowerCase().includes(reportSearchQuery) ||
                (ev.venue || '').toLowerCase().includes(reportSearchQuery)
            );
        }
        
        // Sort
        if (reportSortOrder) {
            events.sort((a, b) => {
                const nameA = (a.eventName || '').toLowerCase();
                const nameB = (b.eventName || '').toLowerCase();
                if (nameA < nameB) return reportSortOrder === 'asc' ? -1 : 1;
                if (nameA > nameB) return reportSortOrder === 'asc' ? 1 : -1;
                return 0;
            });
        }
        
        tbody.innerHTML = '';
        if (events.length === 0) {
            tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding: 1.5rem; color: var(--text-secondary);">No matching events found.</td></tr>`;
            return;
        }
        
        events.forEach(ev => {
            tbody.innerHTML += `
                <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
                    <td style="padding: 1rem;">${ev.eventName || '-'}</td>
                    <td style="padding: 1rem;">${formatDate(ev.date)}</td>
                    <td style="padding: 1rem;">${ev.registrationsCount || 0}/${ev.capacity}</td>
                    <td style="padding: 1rem; color: var(--neon-green); font-weight: 600;">$${((ev.registrationsCount || 0) * (ev.price || 0)).toLocaleString()}</td>
                </tr>
            `;
        });
        
    } else {
        // Student-based reports: Registrations, Revenue, Attendance
        const registrations = await fetchAllRegistrations();
        let filtered = [...registrations];
        
        // Search
        if (reportSearchQuery) {
            filtered = filtered.filter(reg => 
                (reg.name || '').toLowerCase().includes(reportSearchQuery) ||
                (reg.scholarId || '').toLowerCase().includes(reportSearchQuery) ||
                (reg.eventName || '').toLowerCase().includes(reportSearchQuery) ||
                (reg.course || '').toLowerCase().includes(reportSearchQuery)
            );
        }
        
        // Sort
        if (reportSortOrder) {
            filtered.sort((a, b) => {
                const nameA = (a.name || '').toLowerCase();
                const nameB = (b.name || '').toLowerCase();
                if (nameA < nameB) return reportSortOrder === 'asc' ? -1 : 1;
                if (nameA > nameB) return reportSortOrder === 'asc' ? 1 : -1;
                return 0;
            });
        }
        
        tbody.innerHTML = '';
        
        if (currentReportType === 'registrations') {
            if (titleEl) titleEl.innerText = 'Registrations Preview';
            
            thead.innerHTML = `
                <tr style="text-align: left; border-bottom: 1px solid var(--glass-border);">
                    <th style="padding: 1rem;">Scholar ID</th>
                    <th style="padding: 1rem;">Name</th>
                    <th style="padding: 1rem;">Course / Sem</th>
                    <th style="padding: 1rem;">Event</th>
                    <th style="padding: 1rem;">Reg Date</th>
                    <th style="padding: 1rem;">IP Address</th>
                    <th style="padding: 1rem;">Status</th>
                </tr>
            `;
            
            if (filtered.length === 0) {
                tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding: 1.5rem; color: var(--text-secondary);">No matching registrations found.</td></tr>`;
                return;
            }
            
            filtered.forEach(reg => {
                const statClass = reg.attendance === 'Present' ? 'status-present' : 'status-pending';
                tbody.innerHTML += `
                    <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
                        <td style="padding: 1rem; font-family: monospace; color: var(--neon-cyan);">${reg.scholarId || reg.registrationId || '-'}</td>
                        <td style="padding: 1rem; font-weight: 600;">${reg.name || '-'}</td>
                        <td style="padding: 1rem;">${reg.course || '-'} / ${reg.semester || '-'}</td>
                        <td style="padding: 1rem;">${reg.eventName || '-'}</td>
                        <td style="padding: 1rem;">${new Date(reg.timestamp).toLocaleDateString()}</td>
                        <td style="padding: 1rem; font-family: monospace; font-size: 0.85rem; color: #94a3b8;">${reg.ipAddress || 'Unknown IP'}</td>
                        <td style="padding: 1rem;"><span class="status-badge ${statClass}">${reg.attendance || 'Pending'}</span></td>
                    </tr>
                `;
            });
            
        } else if (currentReportType === 'revenue') {
            if (titleEl) titleEl.innerText = 'Revenue Preview';
            
            thead.innerHTML = `
                <tr style="text-align: left; border-bottom: 1px solid var(--glass-border);">
                    <th style="padding: 1rem;">Scholar ID</th>
                    <th style="padding: 1rem;">Name</th>
                    <th style="padding: 1rem;">Event</th>
                    <th style="padding: 1rem;">Ticket Price</th>
                    <th style="padding: 1rem;">Status</th>
                </tr>
            `;
            
            if (filtered.length === 0) {
                tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding: 1.5rem; color: var(--text-secondary);">No matching revenue records found.</td></tr>`;
                return;
            }
            
            filtered.forEach(reg => {
                const statClass = reg.attendance === 'Present' ? 'status-present' : 'status-pending';
                tbody.innerHTML += `
                    <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
                        <td style="padding: 1rem; font-family: monospace; color: var(--neon-cyan);">${reg.scholarId || reg.registrationId || '-'}</td>
                        <td style="padding: 1rem; font-weight: 600;">${reg.name || '-'}</td>
                        <td style="padding: 1rem;">${reg.eventName || '-'}</td>
                        <td style="padding: 1rem; color: var(--neon-green); font-weight: 600;">$${(reg.ticketPrice || 0).toLocaleString()}</td>
                        <td style="padding: 1rem;"><span class="status-badge ${statClass}">${reg.attendance || 'Pending'}</span></td>
                    </tr>
                `;
            });
            
        } else if (currentReportType === 'attendance') {
            if (titleEl) titleEl.innerText = 'Attendance Preview';
            
            thead.innerHTML = `
                <tr style="text-align: left; border-bottom: 1px solid var(--glass-border);">
                    <th style="padding: 1rem;">Scholar ID</th>
                    <th style="padding: 1rem;">Name</th>
                    <th style="padding: 1rem;">Course / Sem</th>
                    <th style="padding: 1rem;">Event</th>
                    <th style="padding: 1rem;">Attendance</th>
                </tr>
            `;
            
            if (filtered.length === 0) {
                tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding: 1.5rem; color: var(--text-secondary);">No matching attendance records found.</td></tr>`;
                return;
            }
            
            filtered.forEach(reg => {
                const statClass = reg.attendance === 'Present' ? 'status-present' : 'status-pending';
                tbody.innerHTML += `
                    <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
                        <td style="padding: 1rem; font-family: monospace; color: var(--neon-cyan);">${reg.scholarId || reg.registrationId || '-'}</td>
                        <td style="padding: 1rem; font-weight: 600;">${reg.name || '-'}</td>
                        <td style="padding: 1rem;">${reg.course || '-'} / ${reg.semester || '-'}</td>
                        <td style="padding: 1rem;">${reg.eventName || '-'}</td>
                        <td style="padding: 1rem;"><span class="status-badge ${statClass}">${reg.attendance || 'Pending'}</span></td>
                    </tr>
                `;
            });
        }
    }
}

async function loadReports() {
    const data = await fetchUnifiedData();
    if(!data) return;
    document.getElementById('repTotalEvents').innerText = data.totalEvents;
    document.getElementById('repTotalReg').innerText = data.totalRegistrations;
    document.getElementById('repRevenue').innerText = '$' + (data.revenue || 0).toLocaleString();
    document.getElementById('repAttendance').innerText = data.totalAttendance > 0 ? ((data.totalAttendance / data.totalRegistrations) * 100).toFixed(1) + '%' : '0%';

    renderReportPreview();
}

function downloadExcel(filename, headers, rows) {
    let html = `
        <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
        <head>
        <!--[if gte mso 9]>
        <xml>
        <x:ExcelWorkbook>
        <x:ExcelWorksheets>
        <x:ExcelWorksheet>
        <x:Name>ReportSheet</x:Name>
        <x:WorksheetOptions>
        <x:DisplayGridlines/>
        </x:WorksheetOptions>
        </x:ExcelWorksheet>
        </x:ExcelWorksheets>
        </x:ExcelWorkbook>
        </xml>
        <![endif]-->
        <meta charset="utf-8">
        <style>
            table { border-collapse: collapse; }
            th { background-color: #0f172a; color: #ffffff; font-weight: bold; padding: 8px; border: 1px solid #cbd5e1; }
            td { padding: 6px; border: 1px solid #cbd5e1; }
        </style>
        </head>
        <body>
        <table>
            <thead>
                <tr>
    `;
    
    headers.forEach(h => {
        html += `<th>${h}</th>`;
    });
    
    html += `
                </tr>
            </thead>
            <tbody>
    `;
    
    rows.forEach(row => {
        html += `<tr>`;
        row.forEach(cell => {
            html += `<td>${cell !== undefined && cell !== null ? cell : ''}</td>`;
        });
        html += `</tr>`;
    });
    
    html += `
            </tbody>
        </table>
        </body>
        </html>
    `;
    
    const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function downloadODS(filename, headers, rows) {
    const data = [headers, ...rows];
    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Report");
    XLSX.writeFile(wb, filename, { bookType: 'ods' });
}

async function downloadPDF(filename, title, headers, rows) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('l', 'mm', 'a4');

    doc.setFillColor(15, 23, 42); // slate-900
    doc.rect(0, 0, 297, 35, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.text(title.toUpperCase(), 148, 16, { align: 'center' });
    
    doc.setTextColor(148, 163, 184); // Slate-400
    doc.setFontSize(9);
    doc.text(`Generated: ${new Date().toLocaleString()} | Total Records: ${rows.length}`, 148, 26, { align: 'center' });

    doc.autoTable({
        head: [headers],
        body: rows,
        startY: 40,
        theme: 'striped',
        styles: { 
            font: 'helvetica',
            cellPadding: 4,
            fontSize: 9,
        },
        headStyles: { 
            fillColor: [30, 41, 59], // Slate-800
            textColor: [255, 255, 255],
            fontSize: 9,
            fontStyle: 'bold',
            textTransform: 'uppercase'
        },
        margin: { top: 40 }
    });

    doc.save(filename);
}

async function getReportData() {
    const data = await fetchUnifiedData();
    if (!data) return null;

    let headers = [];
    let rows = [];
    let title = '';
    let filename = '';

    if (currentReportType === 'events') {
        title = 'Events Report';
        filename = `Events_Report_${Date.now()}`;
        headers = ['Event Name', 'Date', 'Registered', 'Capacity', 'Ticket Price', 'Total Revenue'];
        
        let events = [...data.events];
        
        if (reportSearchQuery) {
            events = events.filter(ev => 
                (ev.eventName || '').toLowerCase().includes(reportSearchQuery) ||
                (ev.venue || '').toLowerCase().includes(reportSearchQuery)
            );
        }
        
        if (reportSortOrder) {
            events.sort((a, b) => {
                const nameA = (a.eventName || '').toLowerCase();
                const nameB = (b.eventName || '').toLowerCase();
                if (nameA < nameB) return reportSortOrder === 'asc' ? -1 : 1;
                if (nameA > nameB) return reportSortOrder === 'asc' ? 1 : -1;
                return 0;
            });
        }
        
        rows = events.map(ev => [
            ev.eventName || '-',
            formatDate(ev.date),
            ev.registrationsCount || 0,
            ev.capacity || 0,
            `$${ev.price || 0}`,
            `$${((ev.registrationsCount || 0) * (ev.price || 0)).toLocaleString()}`
        ]);
    } else {
        const registrations = await fetchAllRegistrations();
        let filtered = [...registrations];
        
        if (reportSearchQuery) {
            filtered = filtered.filter(reg => 
                (reg.name || '').toLowerCase().includes(reportSearchQuery) ||
                (reg.scholarId || '').toLowerCase().includes(reportSearchQuery) ||
                (reg.eventName || '').toLowerCase().includes(reportSearchQuery) ||
                (reg.course || '').toLowerCase().includes(reportSearchQuery)
            );
        }
        
        if (reportSortOrder) {
            filtered.sort((a, b) => {
                const nameA = (a.name || '').toLowerCase();
                const nameB = (b.name || '').toLowerCase();
                if (nameA < nameB) return reportSortOrder === 'asc' ? -1 : 1;
                if (nameA > nameB) return reportSortOrder === 'asc' ? 1 : -1;
                return 0;
            });
        }
        
        if (currentReportType === 'registrations') {
            title = 'Registrations Report';
            filename = `Registrations_Report_${Date.now()}`;
            headers = ['Scholar ID', 'Name', 'Email', 'Course / Sem', 'Event', 'Registration Date', 'IP Address', 'Status'];
            rows = filtered.map(reg => [
                reg.scholarId || reg.registrationId || '-',
                reg.name || '-',
                reg.email || '-',
                `${reg.course || '-'} / ${reg.semester || '-'}`,
                reg.eventName || '-',
                new Date(reg.timestamp).toLocaleDateString(),
                reg.ipAddress || 'Unknown IP',
                reg.attendance || 'Pending'
            ]);
        } else if (currentReportType === 'revenue') {
            title = 'Revenue Report';
            filename = `Revenue_Report_${Date.now()}`;
            headers = ['Scholar ID', 'Name', 'Event', 'Ticket Price', 'Status'];
            rows = filtered.map(reg => [
                reg.scholarId || reg.registrationId || '-',
                reg.name || '-',
                reg.eventName || '-',
                `$${reg.ticketPrice || 0}`,
                reg.attendance || 'Pending'
            ]);
        } else if (currentReportType === 'attendance') {
            title = 'Attendance Report';
            filename = `Attendance_Report_${Date.now()}`;
            headers = ['Scholar ID', 'Name', 'Course / Sem', 'Event', 'Attendance Status'];
            rows = filtered.map(reg => [
                reg.scholarId || reg.registrationId || '-',
                reg.name || '-',
                `${reg.course || '-'} / ${reg.semester || '-'}`,
                reg.eventName || '-',
                reg.attendance || 'Pending'
            ]);
        }
    }
    
    return { headers, rows, title, filename };
}

async function exportReport(format) {
    const reportData = await getReportData();
    if (!reportData || reportData.rows.length === 0) {
        customAlert('No data available to export.');
        return;
    }
    
    const { headers, rows, title, filename } = reportData;
    
    if (format === 'pdf') {
        await downloadPDF(filename + '.pdf', title, headers, rows);
    } else if (format === 'ods') {
        downloadODS(filename + '.ods', headers, rows);
    } else if (format === 'excel') {
        downloadExcel(filename + '.xls', headers, rows);
    }
}

function setupFilters() {
    const filterBtn = document.getElementById('reportFilterBtn');
    const filterDropdown = document.getElementById('reportFilterDropdown');
    if (filterBtn && filterDropdown) {
        filterBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            filterDropdown.classList.toggle('active');
        });
    }

    document.addEventListener('click', (e) => {
        const dropdown = document.getElementById('reportFilterDropdown');
        const btn = document.getElementById('reportFilterBtn');
        if (dropdown && btn && !dropdown.contains(e.target) && !btn.contains(e.target)) {
            dropdown.classList.remove('active');
        }
    });

    const searchInput = document.getElementById('reportSearchInput');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            reportSearchQuery = e.target.value.toLowerCase();
            renderReportPreview();
        });
    }

    const sortA = document.getElementById('sortAtoZ');
    if (sortA) {
        sortA.addEventListener('click', () => {
            setReportSort('asc');
        });
    }

    const sortB = document.getElementById('sortZtoA');
    if (sortB) {
        sortB.addEventListener('click', () => {
            setReportSort('desc');
        });
    }
}

// ==========================================
// NOTIFICATIONS SECTION
// ==========================================
async function loadNotifications() {
    try {
        const res = await fetch('/api/admin/notifications');
        const data = await res.json();
        renderNotifications(data.notifications, 'all');
    } catch(e) { console.error(e); }
}

function renderNotifications(notifs, filter) {
    const container = document.getElementById('notificationsContainer');
    if (!container) return;
    const filtered = filter === 'unread' ? notifs.filter(n => !n.isRead) : notifs;
    
    document.getElementById('totalNotifCount').innerText = notifs.length;
    const unreadCount = notifs.filter(n => !n.isRead).length;
    document.getElementById('unreadNotifCount').innerText = unreadCount;
    document.getElementById('unreadCountHeader').innerText = unreadCount;
    document.getElementById('navUnreadBadge').innerText = unreadCount;
    document.getElementById('navUnreadBadge').style.display = unreadCount > 0 ? 'inline-block' : 'none';

    container.innerHTML = '';
    if(filtered.length === 0) {
        container.innerHTML = '<div style="text-align: center; color: var(--text-secondary); padding: 2rem;">No notifications.</div>';
        return;
    }

    filtered.forEach(n => {
        let icon = 'ℹ️'; let color = '#3b82f6';
        if(n.type === 'registration') { icon = '✔️'; color = 'var(--neon-green)'; }
        if(n.type === 'system') { icon = '⚙️'; color = 'var(--neon-purple)'; }
        
        container.innerHTML += `
            <div class="notification-item" style="border-left: 4px solid ${color};">
                ${!n.isRead ? '<div style="width: 8px; height: 8px; background: #ef4444; border-radius: 50%; position: absolute; top: 1.5rem; right: 1.5rem;"></div>' : ''}
                <div style="font-size: 1.5rem;">${icon}</div>
                <div style="padding-right: 2rem;">
                    <h4 class="notification-title">${n.title}</h4>
                    <p class="notification-message">${n.message}</p>
                    <p class="notification-time">${new Date(n.timestamp).toLocaleString()}</p>
                </div>
                <button class="notification-delete-btn" onclick="deleteNotification('${n._id}')" aria-label="Delete notification">
                    <i class="fa-solid fa-trash-can"></i>
                </button>
            </div>
        `;
    });
}

async function markAllNotificationsRead() {
    try {
        await fetch('/api/admin/notifications/read-all', { method: 'POST' });
        loadNotifications();
    } catch(e) {}
}

async function filterNotifications(filter) {
    const res = await fetch('/api/admin/notifications');
    const data = await res.json();
    renderNotifications(data.notifications, filter);
}

async function deleteNotification(id) {
    try {
        const res = await fetch(`/api/admin/notification/${id}`, {
            method: 'DELETE'
        });
        if (res.ok) {
            loadNotifications();
        } else {
            customAlert('Failed to delete notification.');
        }
    } catch (err) {
        console.error(err);
    }
}

async function deleteAllNotifications() {
    if (!await customConfirm('Are you sure you want to delete all notifications? This cannot be undone.')) return;
    try {
        const res = await fetch('/api/admin/notifications', {
            method: 'DELETE'
        });
        if (res.ok) {
            loadNotifications();
        } else {
            customAlert('Failed to delete all notifications.');
        }
    } catch (err) {
        console.error(err);
    }
}

// ==========================================
// SETTINGS SECTION
// ==========================================
function displayProfile(profile) {
    if (!profile) return;

    // 1. Update Sidebar dynamic details
    const sidebarName = document.getElementById('sidebarAdminName');
    const sidebarEmail = document.getElementById('sidebarAdminEmail');
    const sidebarAvatar = document.getElementById('sidebarAvatar');

    if (sidebarName) sidebarName.innerText = profile.name;
    if (sidebarEmail) sidebarEmail.innerText = profile.email;
    if (sidebarAvatar) {
        if (profile.profilePhoto) {
            sidebarAvatar.innerHTML = `<img src="${profile.profilePhoto}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">`;
        } else {
            sidebarAvatar.innerText = profile.name.charAt(0).toUpperCase();
        }
    }

    // 2. Update Settings top info card
    const settingsName = document.getElementById('settingsAdminName');
    const settingsEmail = document.getElementById('settingsAdminEmail');
    const settingsDesignation = document.getElementById('settingsAdminDesignation');
    const settingsAvatar = document.getElementById('settingsAvatar');

    if (settingsName) settingsName.innerText = profile.name;
    if (settingsEmail) settingsEmail.innerText = profile.email;
    if (settingsDesignation) settingsDesignation.innerText = profile.designation || 'Super Admin';
    if (settingsAvatar) {
        if (profile.profilePhoto) {
            settingsAvatar.innerHTML = `<img src="${profile.profilePhoto}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">`;
        } else {
            settingsAvatar.innerText = profile.name.charAt(0).toUpperCase();
        }
    }

    // 3. Populate Profile Settings Modal Fields
    const profileNameInput = document.getElementById('profileName');
    const profileEmailInput = document.getElementById('profileEmail');
    const profilePhoneInput = document.getElementById('profilePhone');
    const profileDeptInput = document.getElementById('profileDepartment');
    const profileDesigInput = document.getElementById('profileDesignation');
    const profileBioInput = document.getElementById('profileBio');
    const profilePreview = document.getElementById('profilePhotoPreview');

    if (profileNameInput) profileNameInput.value = profile.name || '';
    if (profileEmailInput) profileEmailInput.value = profile.email || '';
    if (profilePhoneInput) profilePhoneInput.value = profile.phone || '';
    if (profileDeptInput) profileDeptInput.value = profile.department || '';
    if (profileDesigInput) profileDesigInput.value = profile.designation || '';
    if (profileBioInput) profileBioInput.value = profile.bio || '';
    if (profilePreview) {
        profilePreview.src = profile.profilePhoto || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=200&auto=format&fit=crop';
    }
}

async function loadSettings() {
    try {
        const res = await fetch('/api/admin/profile');
        if (!res.ok) return;
        const profile = await res.json();
        displayProfile(profile);
        localStorage.setItem('adminProfile', JSON.stringify(profile));
    } catch (err) {
        console.error('Error loading settings profile:', err);
    }
}

function openProfileSettingsModal() {
    loadSettings().then(() => {
        openModal('profileSettingsModal');
    });
}

function openSecurityModal() {
    // Reset fields
    const oldP = document.getElementById('securityOldPassword');
    const newP = document.getElementById('securityNewPassword');
    const confP = document.getElementById('securityConfirmPassword');
    if (oldP) oldP.value = '';
    if (newP) newP.value = '';
    if (confP) confP.value = '';
    openModal('securityModal');
}

function openAppearanceModal() {
    openModal('appearanceModal');
    // Highlight currently active theme card
    const currentTheme = localStorage.getItem('theme') || 'dark';
    const cards = document.querySelectorAll('.theme-selection-card');
    cards.forEach(c => {
        const themeAttr = c.getAttribute('onclick').match(/'([^']+)'/)[1];
        if (themeAttr === currentTheme) {
            c.style.borderColor = 'var(--neon-cyan)';
            c.style.boxShadow = '0 0 10px rgba(56, 189, 248, 0.4)';
        } else {
            c.style.borderColor = 'var(--glass-border)';
            c.style.boxShadow = 'none';
        }
    });
}

function openDataPrivacyModal() {
    openModal('dataPrivacyModal');
}

function applyAppTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    
    // Highlight currently active theme card inside modal immediately
    const cards = document.querySelectorAll('.theme-selection-card');
    cards.forEach(c => {
        const themeAttr = c.getAttribute('onclick').match(/'([^']+)'/)[1];
        if (themeAttr === theme) {
            c.style.borderColor = 'var(--neon-cyan)';
            c.style.boxShadow = '0 0 10px rgba(56, 189, 248, 0.4)';
        } else {
            c.style.borderColor = 'var(--glass-border)';
            c.style.boxShadow = 'none';
        }
    });

    // Refresh charts if on Analytics
    if (document.getElementById('sec-analytics') && document.getElementById('sec-analytics').classList.contains('active')) {
        loadAnalytics();
    }
}

function toggleLightMode() {
    const lightThemes = ['light', 'premium-blue-light', 'soft-gray-light', 'warm-cream', 'modern-white'];
    const currentTheme = localStorage.getItem('theme') || 'dark';
    const newTheme = lightThemes.includes(currentTheme) ? 'dark' : 'light';
    applyAppTheme(newTheme);
}

async function exportAdminProfileData() {
    try {
        const res = await fetch('/api/admin/profile');
        if (!res.ok) return customAlert('Failed to fetch profile data.');
        const profile = await res.json();

        // Strip password for privacy
        delete profile.password;
        delete profile.tempNewPassword;
        delete profile.tempPasswordResetToken;

        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(profile, null, 4));
        const downloadAnchor = document.createElement('a');
        downloadAnchor.setAttribute("href", dataStr);
        downloadAnchor.setAttribute("download", `Admin_Profile_${profile.name.replace(/\s+/g, '_')}.json`);
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.removeChild(downloadAnchor);
    } catch (err) {
        customAlert('Failed to export profile data.');
    }
}

async function clearLocalPreferences() {
    if (await customConfirm('Are you sure you want to clear your local theme preferences and visualMode session caches?')) {
        localStorage.removeItem('theme');
        localStorage.setItem('theme', 'dark');
        document.documentElement.setAttribute('data-theme', 'dark');
        customAlert('Caches successfully cleared! Theme reset to Default Dark.');
        window.location.reload();
    }
}

async function logoutFromAllDevices() {
    if (await customConfirm('Are you sure you want to log out from all logged-in devices? All active administrative sessions will be terminated.')) {
        localStorage.removeItem('isAuthenticated');
        localStorage.removeItem('adminProfile');
        window.location.href = 'index.html';
    }
}

// Initialize DOM elements
document.addEventListener('DOMContentLoaded', async () => {
    // Registrations Event Select
    const regEventSelect = document.getElementById('registrationsEventSelect');
    if (regEventSelect) {
        regEventSelect.addEventListener('change', (e) => {
            window.currentTargetAdminId = e.target.value;
            const analyticEventSelect = document.getElementById('analyticsEventSelect');
            if (analyticEventSelect) {
                analyticEventSelect.value = e.target.value;
            }
            loadRegistrations();
            if (document.getElementById('sec-analytics') && document.getElementById('sec-analytics').classList.contains('active')) {
                loadAnalytics();
            }
        });
    }

    // Analytics Event Select
    const analyticEventSelect = document.getElementById('analyticsEventSelect');
    if (analyticEventSelect) {
        analyticEventSelect.addEventListener('change', (e) => {
            window.currentTargetAdminId = e.target.value;
            const regEventSelect = document.getElementById('registrationsEventSelect');
            if (regEventSelect) {
                regEventSelect.value = e.target.value;
            }
            loadAnalytics();
        });
    }

    // Registrations Search
    const regSearchInput = document.querySelector('#sec-registrations input[type="text"]');
    if (regSearchInput) {
        regSearchInput.addEventListener('input', (e) => {
            currentSearch = e.target.value.toLowerCase();
            renderRegistrationsTable();
        });
    }

    // Registrations Status Filters Dropdown logic
    const regFilterBtn = document.getElementById('regFilterBtn');
    const regFilterDropdown = document.getElementById('regFilterDropdown');
    if (regFilterBtn && regFilterDropdown) {
        regFilterBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            regFilterDropdown.classList.toggle('active');
        });
    }

    document.addEventListener('click', (e) => {
        const dropdown = document.getElementById('regFilterDropdown');
        const btn = document.getElementById('regFilterBtn');
        if (dropdown && btn && !dropdown.contains(e.target) && !btn.contains(e.target)) {
            dropdown.classList.remove('active');
        }
    });

    const regFilterOptions = document.querySelectorAll('#regFilterDropdown .report-dropdown-option');
    regFilterOptions.forEach(opt => {
        opt.addEventListener('click', (e) => {
            regFilterOptions.forEach(o => o.classList.remove('active'));
            e.target.classList.add('active');
            currentFilter = e.target.getAttribute('data-filter');
            if (regFilterBtn) {
                regFilterBtn.innerHTML = `<i class="fa-solid fa-filter"></i> Status: ${currentFilter}`;
            }
            renderRegistrationsTable();
            regFilterDropdown.classList.remove('active');
        });
    });

    // Manual Entry Form
    const manualForm = document.getElementById('manualEntryForm');
    if(manualForm) {
        manualForm.addEventListener('submit', handleManualEntry);
    }

    // Profile Settings Form
    const profileForm = document.getElementById('profileSettingsForm');
    if (profileForm) {
        profileForm.addEventListener('submit', handleProfileUpdate);
    }

    // Profile Photo Preview
    const profilePhotoInput = document.getElementById('profilePhotoInput');
    const profilePhotoPreview = document.getElementById('profilePhotoPreview');
    if (profilePhotoInput && profilePhotoPreview) {
        profilePhotoInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                profilePhotoPreview.src = URL.createObjectURL(file);
            }
        });
    }

    // Security Form
    const securityForm = document.getElementById('securityForm');
    if (securityForm) {
        securityForm.addEventListener('submit', handleSecurityUpdate);
    }

    // Hydrate admin profile from local storage cache for instant render
    const cachedProfile = localStorage.getItem('adminProfile');
    if (cachedProfile) {
        try {
            displayProfile(JSON.parse(cachedProfile));
        } catch (e) {
            console.error('Error hydrating profile:', e);
        }
    }
    // Fetch latest profile asynchronously
    loadSettings();

    await fetchUnifiedData();
    loadEvents();
    loadRegistrations();
    loadNotifications();
    setupFilters();
});

async function handleManualEntry(e) {
    e.preventDefault();
    const adminId = document.getElementById('modalManualEventSelect').value;
    if(!adminId) return customAlert('Select an event from the dropdown to target first.');

    const payload = {
        scholarId: document.getElementById('manualScholarId').value.trim(),
        name: document.getElementById('manualName').value.trim(),
        mobile: document.getElementById('manualMobile').value.trim(),
        email: document.getElementById('manualEmail').value.trim(),
        course: document.getElementById('manualCourse').value.trim(),
        semester: document.getElementById('manualSemester').value.trim()
    };

    const btn = document.getElementById('btnManualEntry');
    btn.disabled = true;
    btn.textContent = 'Saving...';

    try {
        const res = await fetch(`/api/admin/event/${adminId}/manual-entry`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        
        if(res.ok) {
            customAlert(data.message);
            e.target.reset();
            closeModal('manualEntryModal');
            
            // Sync the Registrations tab state
            window.currentTargetAdminId = adminId;
            const regEventSelect = document.getElementById('registrationsEventSelect');
            if(regEventSelect) regEventSelect.value = adminId;
            
            currentSearch = '';
            const searchInput = document.querySelector('#sec-registrations input[type="text"]');
            if(searchInput) searchInput.value = '';
            
            currentFilter = 'All';
            const manualRegFilterBtn = document.getElementById('regFilterBtn');
            if (manualRegFilterBtn) manualRegFilterBtn.innerHTML = `<i class="fa-solid fa-filter"></i> Status: All`;
            const manualRegFilterOptions = document.querySelectorAll('#regFilterDropdown .report-dropdown-option');
            manualRegFilterOptions.forEach(opt => {
                if (opt.getAttribute('data-filter') === 'All') opt.classList.add('active');
                else opt.classList.remove('active');
            });
            
            loadRegistrations();
        } else {
            customAlert(data.error || 'Failed to add registration');
        }
    } catch(error) {
        customAlert('Connection Error');
    }
    btn.disabled = false;
    btn.textContent = 'Save Student';
}

async function handleProfileUpdate(e) {
    e.preventDefault();
    const btn = document.getElementById('btnSaveProfile');
    if(btn) { btn.disabled = true; btn.innerText = 'Saving...'; }

    const formData = new FormData();
    formData.append('name', document.getElementById('profileName').value);
    formData.append('email', document.getElementById('profileEmail').value);
    formData.append('phone', document.getElementById('profilePhone').value);
    formData.append('department', document.getElementById('profileDepartment').value);
    formData.append('designation', document.getElementById('profileDesignation').value);
    formData.append('bio', document.getElementById('profileBio').value);

    const fileInput = document.getElementById('profilePhotoInput');
    if (fileInput && fileInput.files.length > 0) {
        formData.append('profilePhoto', fileInput.files[0]);
    }

    try {
        const res = await fetch('/api/admin/profile', {
            method: 'PUT',
            body: formData
        });
        const data = await res.json();
        if (res.ok) {
            customAlert(data.message || 'Profile updated successfully!');
            closeModal('profileSettingsModal');
            if (data.data) {
                displayProfile(data.data);
                localStorage.setItem('adminProfile', JSON.stringify(data.data));
            } else {
                loadSettings();
            }
        } else {
            customAlert(data.error || 'Failed to update profile');
        }
    } catch(err) {
        customAlert('Network error while updating profile');
    } finally {
        if(btn) { btn.disabled = false; btn.innerText = 'Save Changes'; }
    }
}

async function handleSecurityUpdate(e) {
    e.preventDefault();
    const oldPassword = document.getElementById('securityOldPassword').value;
    const newPassword = document.getElementById('securityNewPassword').value;
    const confirmPassword = document.getElementById('securityConfirmPassword').value;

    if (newPassword !== confirmPassword) {
        return customAlert('New password and confirm password do not match.');
    }

    const btn = document.getElementById('btnRequestPasswordChange');
    if(btn) { btn.disabled = true; btn.innerText = 'Requesting...'; }

    try {
        const res = await fetch('/api/admin/change-password-request', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ oldPassword, newPassword })
        });
        const data = await res.json();
        if (res.ok) {
            customAlert(data.message);
            closeModal('securityModal');
            document.getElementById('securityForm').reset();
        } else {
            customAlert(data.error || 'Failed to request password change');
        }
    } catch (err) {
        customAlert('Network error while requesting password change');
    } finally {
        if(btn) { btn.disabled = false; btn.innerText = 'Request Change'; }
    }
}

// BULK DELETE RECORDS
async function bulkDeleteEventRecords() {
    const adminId = window.currentTargetAdminId;
    if(!adminId) return;
    
    if(!await customConfirm('Are you sure you want to delete?')) return;

    try {
        const res = await fetch(`/api/admin/event/${adminId}/records`, {
            method: 'DELETE'
        });
        const data = await res.json();
        
        if(res.ok) {
            customAlert(data.message);
            loadRegistrations(); // Refresh the table
            loadEvents(); // Refresh overall stats
        } else {
            customAlert('Failed to delete records: ' + data.error);
        }
    } catch(e) {
        customAlert('Connection error');
    }
}

// ==========================================
// INDIVIDUAL DELETE
// ==========================================
async function deleteSingleRegistration(scholarId) {
    const adminId = window.currentTargetAdminId;
    if(!adminId) return;
    if(!await customConfirm('Are you sure you want to delete?')) return;

    try {
        const res = await fetch(`/api/admin/event/${adminId}/record/${scholarId}`, { method: 'DELETE' });
        const data = await res.json();
        if(res.ok) {
            loadRegistrations();
            loadEvents();
        } else {
            customAlert('Delete failed');
        }
    } catch(e) {
        customAlert('Connection error');
    }
}

// ==========================================
// SELECTION-BASED DOWNLOAD (IMAGE/PDF)
// ==========================================

async function handleDownloadSelection() {
    const selectedCbs = document.querySelectorAll('.row-checkbox:checked');
    if (selectedCbs.length === 0) {
        customAlert('Please select at least one record to download.');
        return;
    }

    const selectedIds = Array.from(selectedCbs).map(cb => cb.getAttribute('data-id'));
    // Filter against currentRegistrationsData (global state)
    const selectedData = currentRegistrationsData.filter(r => selectedIds.includes(r.scholarId));

    if (selectedData.length === 1) {
        downloadSingleAsImage(selectedData[0]);
    } else {
        downloadMultipleAsPDF(selectedData);
    }
}

async function downloadSingleAsImage(student) {
    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.top = '-9999px';
    container.style.left = '-9999px';
    container.style.width = '650px';
    container.style.padding = '0'; // Padding moved to inner elements
    container.style.background = '#ffffff'; 
    container.style.color = '#0f172a';
    container.style.fontFamily = "'Inter', sans-serif";
    container.style.borderRadius = '16px';
    container.style.border = '1px solid #1e3a8a';
    container.style.overflow = 'hidden';
    container.style.boxShadow = '0 10px 30px rgba(0,0,0,0.1)';

    const dateStr = new Date(student.timestamp).toLocaleDateString();
    const displayId = student.scholarId || student.registrationId || '-';
    // Solid black QR code
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(displayId)}&color=000000&bgcolor=ffffff`;

    container.innerHTML = `
        <div style="text-align: center; background: #0f172a; padding: 25px 20px; border-bottom: 3px solid #1e3a8a;">
            <h1 style="color: #60a5fa; margin: 0; font-size: 26px; text-transform: uppercase; letter-spacing: 1px;">Registration Slip</h1>
            <p style="color: #94a3b8; font-size: 13px; margin-top: 5px; text-transform: uppercase; letter-spacing: 2px;">Event Management System</p>
        </div>
        <div style="display: flex; padding: 35px; align-items: center; gap: 30px;">
            <div style="flex: 1; display: grid; grid-template-columns: 1fr 1fr; gap: 25px;">
                <div>
                    <p style="color: #64748b; font-size: 11px; margin: 0; text-transform: uppercase; letter-spacing: 1px;">Scholar ID</p>
                    <p style="font-size: 18px; font-weight: 800; margin: 5px 0; color: #0ea5e9;">${displayId}</p>
                </div>
                <div>
                    <p style="color: #64748b; font-size: 11px; margin: 0; text-transform: uppercase; letter-spacing: 1px;">Mobile</p>
                    <p style="font-size: 17px; font-weight: 700; margin: 5px 0;">${student.mobile || '-'}</p>
                </div>
                <div>
                    <p style="color: #64748b; font-size: 11px; margin: 0; text-transform: uppercase; letter-spacing: 1px;">Student Name</p>
                    <p style="font-size: 17px; font-weight: 700; margin: 5px 0;">${student.name || '-'}</p>
                </div>
                <div>
                    <p style="color: #64748b; font-size: 11px; margin: 0; text-transform: uppercase; letter-spacing: 1px;">Date</p>
                    <p style="font-size: 17px; font-weight: 700; margin: 5px 0;">${dateStr}</p>
                </div>
                <div>
                    <p style="color: #64748b; font-size: 11px; margin: 0; text-transform: uppercase; letter-spacing: 1px;">Course / Sem</p>
                    <p style="font-size: 17px; font-weight: 700; margin: 5px 0;">${student.course || '-'} / ${student.semester || '-'}</p>
                </div>
                <div>
                    <p style="color: #64748b; font-size: 11px; margin: 0; text-transform: uppercase; letter-spacing: 1px;">Status</p>
                    <p style="font-size: 17px; font-weight: 800; margin: 5px 0; color: ${student.attendance === 'Present' ? '#16a34a' : '#ca8a04'};">${student.attendance || 'Pending'}</p>
                </div>
            </div>
            <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding-left: 30px; border-left: 2px dashed #cbd5e1;">
                <img src="${qrUrl}" crossorigin="anonymous" style="width: 130px; height: 130px; border-radius: 8px; border: 2px solid #e2e8f0; padding: 5px; background: white; object-fit: contain;" />
                <p style="color: #64748b; font-size: 10px; margin-top: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">Scan to Verify</p>
            </div>
        </div>
        <div style="text-align: center; padding: 15px; background: #f8fafc; border-top: 1px solid #e2e8f0;">
            <p style="color: #0ea5e9; font-size: 14px; margin: 0; font-weight: 600;">${student.email || '-'}</p>
        </div>
    `;

    document.body.appendChild(container);
    
    // Wait slightly longer to ensure QR image is fully loaded before html2canvas processes it
    await new Promise(resolve => setTimeout(resolve, 800));

    try {
        const canvas = await html2canvas(container, {
            backgroundColor: '#ffffff',
            scale: 2,
            useCORS: true,
            allowTaint: true
        });
        const link = document.createElement('a');
        link.download = `Student_${displayId}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
    } catch (e) {
        console.error(e);
        customAlert('Export failed. Please check network connection for QR code generation.');
    } finally {
        document.body.removeChild(container);
    }
}

async function downloadMultipleAsPDF(students) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('l', 'mm', 'a4');

    // Header styling matching premium blue tone from reference
    doc.setFillColor(30, 58, 138); // Deep rich blue
    doc.rect(0, 0, 297, 40, 'F');
    
    // Add fully white header text
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.text('REGISTRATIONS BULK REPORT', 148, 20, { align: 'center' });
    
    doc.setTextColor(203, 213, 225); // Slate-300 for readable subtitle
    doc.setFontSize(10);
    doc.text(`Selected Records: ${students.length} | Export Date: ${new Date().toLocaleString()}`, 148, 30, { align: 'center' });

    // Load and add DSVV Logo
    const addLogo = () => {
        return new Promise((resolve) => {
            const logoImg = new Image();
            logoImg.crossOrigin = "Anonymous";
            logoImg.src = 'https://dsvv.s3.ap-south-1.amazonaws.com/uploads/2023/03/DSVV_LOGO_PNG.png';
            logoImg.onload = () => {
                // Dimensions adjusted to fit left corner gracefully (30x30)
                doc.addImage(logoImg, 'PNG', 15, 5, 30, 30);
                resolve();
            };
            logoImg.onerror = () => {
                console.warn('Could not load logo for PDF');
                resolve();
            };
        });
    };

    await addLogo();

    const tableData = students.map(s => [
        s.scholarId || '-',
        s.name || '-',
        s.mobile || '-',
        s.email || '-',
        `${s.course || '-'} / ${s.semester || '-'}`,
        new Date(s.timestamp).toLocaleDateString(),
        s.attendance || 'Pending'
    ]);

    doc.autoTable({
        head: [['Scholar ID', 'Name', 'Mobile', 'Email', 'Course / Sem', 'Date', 'Status']],
        body: tableData,
        startY: 45,
        theme: 'plain',
        styles: { 
            font: 'helvetica',
            cellPadding: 4,
            fontSize: 10,
        },
        headStyles: { 
            textColor: [71, 85, 105],
            fontSize: 9,
            fontStyle: 'bold',
            fillColor: [248, 250, 252],
            lineWidth: { bottom: 0.5 },
            lineColor: [226, 232, 240],
            textTransform: 'uppercase'
        },
        bodyStyles: {
            textColor: [30, 41, 59],
            lineWidth: { bottom: 0.1 },
            lineColor: [226, 232, 240]
        },
        didParseCell: function(data) {
            if (data.section === 'body') {
                if (data.column.index === 0) {
                    data.cell.styles.font = 'courier';
                    data.cell.styles.textColor = [14, 165, 233];
                }
                if (data.column.index === 1) {
                    data.cell.styles.fontStyle = 'bold';
                }
                if (data.column.index === 3) {
                    data.cell.styles.textColor = [14, 165, 233];
                }
                if (data.column.index === 6) {
                    const status = data.cell.raw;
                    data.cell.styles.fontStyle = 'bold';
                    if (status === 'Present') {
                        data.cell.styles.textColor = [22, 163, 74];
                    } else {
                        data.cell.styles.textColor = [202, 138, 4];
                    }
                }
            }
        },
        margin: { top: 45 }
    });

    doc.save(`Registrations_Bulk_${new Date().getTime()}.pdf`);
}

// ==========================================
// ANALYTICS SECTION
// ==========================================
let lineChartInstance = null;
let barChartInstance = null;

async function loadAnalytics() {
    let targetAdminId = window.currentTargetAdminId;

    if (!targetAdminId) {
        if (!globalData) await fetchUnifiedData();
        if (globalData && globalData.events.length > 0) {
            targetAdminId = globalData.events[0].adminId;
        }
    }
    window.currentTargetAdminId = targetAdminId;

    // Sync selected event back to dropdowns
    const analyticsSelect = document.getElementById('analyticsEventSelect');
    if (analyticsSelect) {
        // Re-populate if it is empty
        if (globalData && (analyticsSelect.options.length <= 1)) {
            analyticsSelect.innerHTML = '<option value="">Select Event</option>';
            globalData.events.forEach(ev => {
                analyticsSelect.innerHTML += `<option value="${ev.adminId}">${ev.eventName}</option>`;
            });
        }
        analyticsSelect.value = targetAdminId || "";
    }

    const regEventSelect = document.getElementById('registrationsEventSelect');
    if (regEventSelect && regEventSelect.value !== targetAdminId) {
        regEventSelect.value = targetAdminId || "";
    }

    if (!targetAdminId) {
        renderAnalytics([]);
        return;
    }

    try {
        const res = await fetch(`/api/admin/dashboard/${targetAdminId}`);
        if (res.ok) {
            const resData = await res.json();
            const registrations = resData.registrations || [];
            renderAnalytics(registrations);
        } else {
            renderAnalytics([]);
        }
    } catch(e) {
        console.error('Error fetching analytics:', e);
        renderAnalytics([]);
    }
}

function renderAnalytics(registrations) {
    const total = registrations.length;
    const registered = registrations.filter(r => r.attendance === 'Present').length;
    const notRegistered = registrations.filter(r => r.attendance === 'Pending').length;
    const percentageVal = total > 0 ? ((registered / total) * 100).toFixed(1) : '0';

    // Retrieve active event data to get capacity and ticket price
    let targetAdminId = window.currentTargetAdminId;
    const selectedEvent = (globalData && globalData.events) ? globalData.events.find(e => e.adminId === targetAdminId) : null;
    const capacity = selectedEvent ? (selectedEvent.capacity || 100) : 100;
    const ticketPrice = selectedEvent ? (selectedEvent.price || 0) : 0;
    const totalEvents = globalData ? globalData.totalEvents : 0;

    const revenueVal = total * ticketPrice;
    
    // Calculate dynamic percentages for progress bars
    const regPct = Math.min((total / capacity) * 100, 100);
    const revPct = ticketPrice > 0 ? Math.min((revenueVal / (capacity * ticketPrice)) * 100, 100) : regPct;
    const attPct = total > 0 ? Math.min((registered / total) * 100, 100) : 0;

    // Update Visual Cards values
    const totalEventsEl = document.getElementById('analyticTotalEvents');
    if (totalEventsEl) totalEventsEl.innerText = totalEvents;

    const registrationsEl = document.getElementById('analyticRegistrations');
    if (registrationsEl) registrationsEl.innerText = total;

    const revenueEl = document.getElementById('analyticRevenue');
    if (revenueEl) {
        if (revenueVal >= 1000) {
            revenueEl.innerText = '$' + (revenueVal / 1000).toFixed(1) + 'k';
        } else {
            revenueEl.innerText = '$' + revenueVal;
        }
    }

    const attendanceEl = document.getElementById('analyticAttendance');
    if (attendanceEl) attendanceEl.innerText = registered;

    // Update Badges text dynamically
    const totalEventsBadge = document.getElementById('analyticTotalEventsBadge');
    if (totalEventsBadge) totalEventsBadge.innerText = `+${totalEvents > 0 ? '12%' : '0%'}`;

    const registrationsBadge = document.getElementById('analyticRegistrationsBadge');
    if (registrationsBadge) registrationsBadge.innerText = `+${regPct.toFixed(0)}%`;

    const revenueBadge = document.getElementById('analyticRevenueBadge');
    if (revenueBadge) revenueBadge.innerText = `+${revPct.toFixed(0)}%`;

    const attendanceBadge = document.getElementById('analyticAttendanceBadge');
    if (attendanceBadge) attendanceBadge.innerText = `+${attPct.toFixed(0)}%`;

    // Update progress lines
    const progressEvents = document.getElementById('analyticProgressEvents');
    if (progressEvents) progressEvents.style.width = '75%';

    const progressReg = document.getElementById('analyticProgressReg');
    if (progressReg) progressReg.style.width = `${regPct}%`;

    const progressRev = document.getElementById('analyticProgressRev');
    if (progressRev) progressRev.style.width = `${revPct}%`;

    const progressAtt = document.getElementById('analyticProgressAtt');
    if (progressAtt) progressAtt.style.width = `${attPct}%`;

    const noDataEl = document.getElementById('analyticsNoDataContainer');
    const chartsEl = document.getElementById('analyticsChartsContainer');

    if (total === 0) {
        if (noDataEl) noDataEl.style.display = 'flex';
        if (chartsEl) chartsEl.style.display = 'none';
        
        if (lineChartInstance) { lineChartInstance.destroy(); lineChartInstance = null; }
        if (barChartInstance) { barChartInstance.destroy(); barChartInstance = null; }
        return;
    } else {
        if (noDataEl) noDataEl.style.display = 'none';
        if (chartsEl) chartsEl.style.display = 'grid';
    }

    // Read Computed CSS variables to match premium styling and light/dark theme dynamically
    const style = getComputedStyle(document.documentElement);
    const cyanColor = style.getPropertyValue('--neon-cyan').trim() || '#38bdf8';
    const greenColor = style.getPropertyValue('--neon-green').trim() || '#22c55e';
    const textPrimary = style.getPropertyValue('--text-primary').trim() || '#cbd5e1';
    const textMuted = style.getPropertyValue('--text-muted').trim() || '#64748b';
    const glassBorder = style.getPropertyValue('--glass-border').trim() || 'rgba(255, 255, 255, 0.08)';

    // Sort registrations chronologically by timestamp
    const sortedRegs = [...registrations].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    
    const countsByDate = {};
    sortedRegs.forEach(r => {
        const dateKey = new Date(r.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        countsByDate[dateKey] = (countsByDate[dateKey] || 0) + 1;
    });

    let labels = Object.keys(countsByDate);
    const dailyCounts = Object.values(countsByDate);
    
    // Compute running cumulative total for registration trend
    let cumulative = 0;
    let lineData = dailyCounts.map(count => {
        cumulative += count;
        return cumulative;
    });

    if (labels.length === 1) {
        // Prepend a starting point to draw a proper line
        labels = ['Start', labels[0]];
        lineData = [0, lineData[0]];
    }

    // 1. Render Registration Trend (Line Chart)
    if (lineChartInstance) {
        lineChartInstance.destroy();
    }
    const ctxLine = document.getElementById('lineChartCanvas').getContext('2d');
    
    // Create a beautiful premium blue/cyan gradient for line fill
    const gradientLine = ctxLine.createLinearGradient(0, 0, 0, 300);
    gradientLine.addColorStop(0, cyanColor + '33'); // 20% opacity
    gradientLine.addColorStop(1, cyanColor + '00'); // 0% opacity

    lineChartInstance = new Chart(ctxLine, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Cumulative Registrations',
                data: lineData,
                borderColor: cyanColor,
                backgroundColor: gradientLine,
                fill: true,
                tension: 0.4,
                borderWidth: 3,
                pointBackgroundColor: cyanColor,
                pointBorderColor: textPrimary,
                pointBorderWidth: 2,
                pointRadius: 5,
                pointHoverRadius: 7
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    backgroundColor: 'rgba(15, 23, 42, 0.95)',
                    titleColor: '#fff',
                    bodyColor: '#cbd5e1',
                    borderColor: glassBorder,
                    borderWidth: 1,
                    padding: 12,
                    displayColors: false
                }
            },
            scales: {
                x: {
                    grid: { color: glassBorder, drawBorder: false },
                    ticks: { color: textMuted, font: { family: 'Inter', size: 11 } }
                },
                y: {
                    grid: { color: glassBorder, drawBorder: false },
                    ticks: {
                        color: textMuted,
                        font: { family: 'Inter', size: 11 },
                        stepSize: Math.max(1, Math.ceil(total / 10)),
                        beginAtZero: true
                    }
                }
            }
        }
    });

    // 2. Render Analytics Overview (Bar Chart displaying daily registrations distribution)
    if (barChartInstance) {
        barChartInstance.destroy();
    }
    const ctxBar = document.getElementById('barChartCanvas').getContext('2d');
    
    // Create a beautiful premium green-to-cyan gradient for bar fill
    const gradientBar = ctxBar.createLinearGradient(0, 0, 0, 300);
    gradientBar.addColorStop(0, greenColor);
    gradientBar.addColorStop(1, cyanColor);

    // Make sure we have a clean list of labels and dailyCounts (independent of line chart dummy prepend)
    const barLabels = Object.keys(countsByDate);
    const barData = Object.values(countsByDate);

    barChartInstance = new Chart(ctxBar, {
        type: 'bar',
        data: {
            labels: barLabels,
            datasets: [{
                label: 'Daily Registrations',
                data: barData,
                backgroundColor: gradientBar,
                borderRadius: { topLeft: 6, topRight: 6, bottomLeft: 0, bottomRight: 0 },
                borderSkipped: false,
                barPercentage: 0.6,
                categoryPercentage: 0.8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(15, 23, 42, 0.95)',
                    titleColor: '#fff',
                    bodyColor: '#cbd5e1',
                    borderColor: glassBorder,
                    borderWidth: 1,
                    padding: 12,
                    displayColors: false
                }
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: { color: textMuted, font: { family: 'Inter', size: 11 } }
                },
                y: {
                    grid: { color: glassBorder, drawBorder: false },
                    ticks: {
                        color: textMuted,
                        font: { family: 'Inter', size: 11 },
                        stepSize: Math.max(1, Math.ceil(Math.max(...barData) / 6)),
                        beginAtZero: true
                    }
                }
            }
        }
    });
}

// ==========================================
// FEEDBACK REQUEST LOGIC
// ==========================================
async function requestFeedback(adminId) {
    if (!window.confirm('Are you sure you want to request feedback from all "Present" students for this event? This will dispatch emails immediately.')) return;

    try {
        const theme = 'light';
        const res = await fetch(`/api/admin/event/${adminId}/request-feedback`, { 
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ theme })
        });
        const data = await res.json();
        
        if (res.ok) {
            if (data.success === false) {
                alert(data.error || 'Operation failed.');
                return;
            }
            alert(`✅ Success! Feedback requests sent to ${data.sentCount} students.`);
            
            // Open Preview Modal
            const ev = globalData.events.find(e => e.adminId === adminId);
            const eventName = ev ? ev.eventName : 'Event';
            const previewUrl = `/feedback.html?eventId=${encodeURIComponent(adminId)}&eventName=${encodeURIComponent(eventName)}&scholarId=PREVIEW-ADMIN&studentName=Admin+Preview&course=N%2FA&semester=N%2FA&theme=light`;
            document.getElementById('feedbackPreviewFrame').src = previewUrl;
            openModal('feedbackPreviewModal');
        } else {
            alert(`❌ Failed: ${data.error}`);
        }
    } catch (err) {
        alert('❌ Network error while requesting feedback.');
    }
}

// ==========================================
// FEEDBACK DASHBOARD
// ==========================================
let fbDonutChartInst = null;
let fbBarChartInst = null;
let fbLineChartInst = null;

let allFeedbackData = [];
let allFeedbackEvents = [];

if (typeof socket !== 'undefined' && socket) {
    socket.on('feedbackUpdate', (data) => {
        // If the user is currently on the feedback tab, reload data instantly
        const activeTab = document.querySelector('.sidebar a.active');
        if (activeTab && activeTab.getAttribute('data-tab') === 'feedback') {
            loadFeedbackDashboard();
        }
    });
}

async function loadFeedbackDashboard() {
    try {
        // Fetch events from main backend
        const resEvents = await fetch('/api/admin/all');
        if (!resEvents.ok) throw new Error('Failed to fetch events');
        const data = await resEvents.json();
        allFeedbackEvents = data.admins || [];
        // Populate Event Filter if empty
        const filterEl = document.getElementById('fbEventFilter');
        if (filterEl && filterEl.options.length <= 1) {
            allFeedbackEvents.forEach(ev => {
                const opt = document.createElement('option');
                opt.value = ev.eventId;
                opt.textContent = ev.eventName;
                filterEl.appendChild(opt);
            });
        }
        
        // Fetch feedback from internal mainqr backend
        const resFb = await fetch('/api/admin/feedback/all');
        if (resFb.ok) {
            allFeedbackData = await resFb.json();
        } else {
            console.warn('Could not fetch feedback from internal API.');
            allFeedbackData = [];
        }
        
        processFeedbackData();
    } catch (error) {
        console.error('Error loading feedback dashboard:', error);
    }
}

function processFeedbackData() {
    const eventFilter = document.getElementById('fbEventFilter').value;
    const dateFilter = document.getElementById('fbDateFilter').value;
    
    // Filter events
    let filteredEvents = allFeedbackEvents;
    if (eventFilter !== 'ALL') {
        filteredEvents = filteredEvents.filter(ev => ev.eventId === eventFilter);
    }
    if (dateFilter) {
        filteredEvents = filteredEvents.filter(ev => ev.date === dateFilter || ev.date.includes(dateFilter));
    }
    
    let totalSent = 0;
    let totalReceived = 0;
    
    const eventMap = {};
    filteredEvents.forEach(ev => {
        const sent = ev.feedbackEmailsSent || 0;
        totalSent += sent;
        eventMap[ev.eventId] = {
            eventName: ev.eventName,
            sent: sent,
            received: 0,
            latestRes: null
        };
    });
    
    // Filter feedbacks based on filtered events
    const validEventIds = filteredEvents.map(e => e.eventId);
    const filteredFeedbacks = allFeedbackData.filter(fb => validEventIds.includes(fb.eventId));
    
    filteredFeedbacks.forEach(fb => {
        totalReceived++;
        if (eventMap[fb.eventId]) {
            eventMap[fb.eventId].received++;
            const fbTime = new Date(fb.submittedAt).getTime();
            if (!eventMap[fb.eventId].latestRes || fbTime > new Date(eventMap[fb.eventId].latestRes).getTime()) {
                eventMap[fb.eventId].latestRes = fb.submittedAt;
            }
        }
    });
    
    const totalPending = Math.max(0, totalSent - totalReceived);
    const completionRate = totalSent > 0 ? Math.round((totalReceived / totalSent) * 100) : 0;
    
    // Update summary cards
    document.getElementById('fbSentVal').textContent = totalSent;
    document.getElementById('fbReceivedVal').textContent = totalReceived;
    document.getElementById('fbPendingVal').textContent = totalPending;
    document.getElementById('fbCompletionVal').textContent = completionRate + '%';
    document.getElementById('fbCompletionBar').style.width = completionRate + '%';
    
    // Update charts
    updateFeedbackCharts(totalReceived, totalPending, eventMap, filteredFeedbacks);
    
    // Update table
    renderFeedbackTable(eventMap);
}

function updateFeedbackCharts(received, pending, eventMap, feedbacks) {
    const textPrimary = getComputedStyle(document.body).getPropertyValue('--text-primary').trim() || '#ffffff';
    const textSecondary = getComputedStyle(document.body).getPropertyValue('--text-secondary').trim() || '#94a3b8';
    const gridColor = 'rgba(255,255,255,0.05)';

    // 1. Donut Chart (Received vs Pending)
    const donutCtx = document.getElementById('fbDonutChart').getContext('2d');
    if (fbDonutChartInst) fbDonutChartInst.destroy();
    
    fbDonutChartInst = new Chart(donutCtx, {
        type: 'doughnut',
        data: {
            labels: ['Received', 'Pending'],
            datasets: [{
                data: [received, pending],
                backgroundColor: ['#10b981', '#f59e0b'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '75%',
            plugins: {
                legend: { position: 'bottom', labels: { color: textPrimary } }
            }
        }
    });
    
    // 2. Bar Chart (Event-wise Performance)
    const labels = [];
    const receivedData = [];
    const pendingData = [];
    
    Object.values(eventMap).forEach(em => {
        labels.push(em.eventName);
        receivedData.push(em.received);
        pendingData.push(Math.max(0, em.sent - em.received));
    });
    
    const barCtx = document.getElementById('fbBarChart').getContext('2d');
    if (fbBarChartInst) fbBarChartInst.destroy();
    
    fbBarChartInst = new Chart(barCtx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                { label: 'Received', data: receivedData, backgroundColor: '#10b981', borderRadius: 4 },
                { label: 'Pending', data: pendingData, backgroundColor: '#f59e0b', borderRadius: 4 }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: { stacked: true, grid: { display: false }, ticks: { color: textSecondary } },
                y: { stacked: true, grid: { color: gridColor }, ticks: { color: textSecondary } }
            },
            plugins: {
                legend: { position: 'top', labels: { color: textPrimary } }
            }
        }
    });
    
    // 3. Line Chart (Submission Trend)
    const trendMap = {};
    feedbacks.forEach(fb => {
        const d = new Date(fb.submittedAt).toLocaleDateString();
        trendMap[d] = (trendMap[d] || 0) + 1;
    });
    
    const sortedDates = Object.keys(trendMap).sort((a,b) => new Date(a) - new Date(b));
    const trendData = sortedDates.map(d => trendMap[d]);
    
    const lineCtx = document.getElementById('fbLineChart').getContext('2d');
    if (fbLineChartInst) fbLineChartInst.destroy();
    
    fbLineChartInst = new Chart(lineCtx, {
        type: 'line',
        data: {
            labels: sortedDates,
            datasets: [{
                label: 'Submissions',
                data: trendData,
                borderColor: '#3b82f6',
                backgroundColor: 'rgba(59, 130, 246, 0.2)',
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: { grid: { display: false }, ticks: { color: textSecondary } },
                y: { grid: { color: gridColor }, ticks: { color: textSecondary, stepSize: 1 } }
            },
            plugins: {
                legend: { display: false }
            }
        }
    });
}

function renderFeedbackTable(eventMap) {
    const tbody = document.querySelector('#fbTable tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    Object.values(eventMap).forEach(em => {
        const pending = Math.max(0, em.sent - em.received);
        const compRate = em.sent > 0 ? Math.round((em.received / em.sent) * 100) : 0;
        const lastRes = em.latestRes ? new Date(em.latestRes).toLocaleString() : 'N/A';
        
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${em.eventName}</strong></td>
            <td>${em.sent}</td>
            <td style="color: #10b981; font-weight: bold;">${em.received}</td>
            <td style="color: #f59e0b; font-weight: bold;">${pending}</td>
            <td>
                <div style="display: flex; align-items: center; gap: 8px;">
                    <span>${compRate}%</span>
                    <div style="flex: 1; height: 4px; background: rgba(255,255,255,0.1); border-radius: 2px; overflow: hidden;">
                        <div style="height: 100%; width: ${compRate}%; background: ${compRate === 100 ? '#10b981' : '#3b82f6'};"></div>
                    </div>
                </div>
            </td>
            <td style="color: var(--text-secondary); font-size: 0.85rem;">${lastRes}</td>
        `;
        tbody.appendChild(tr);
    });
}

function filterFeedbackTable() {
    const query = document.getElementById('fbSearchInput').value.toLowerCase();
    const rows = document.querySelectorAll('#fbTable tbody tr');
    rows.forEach(row => {
        const name = row.cells[0].innerText.toLowerCase();
        row.style.display = name.includes(query) ? '' : 'none';
    });
}
