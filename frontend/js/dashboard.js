// dashboard.js - Core SPA Logic
function formatDate(dateStr) {
    if (!dateStr) return 'TBD';
    if (dateStr.includes('/')) return dateStr; // Already formatted
    const [y, m, d] = dateStr.split('-');
    if (!y || !m || !d) return dateStr;
    return `${d}/${m}/${y}`;
}

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
        'scanner': ['QR Scanner', 'Verify attendance in real-time'],
        'reports': ['Reports', 'Generate and export event data']
    };
    
    document.getElementById('pageTitle').innerText = titles[tabId][0];
    document.getElementById('pageSubtitle').innerText = titles[tabId][1];

    if(tabId === 'events') loadEvents();
    if(tabId === 'registrations') loadRegistrations();
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
    window.location.href = 'index.html';
}

// Set Date
const dateDisplay = document.getElementById('currentDateDisplay');
if(dateDisplay) {
    dateDisplay.innerText = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

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
        const res = await fetch('http://localhost:3000/api/admin/analytics');
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
        } else {
            // If data not loaded yet, just load it
            fetchUnifiedData().then(() => {
                if (document.getElementById('sec-events').classList.contains('active')) loadEvents();
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
    
    if (container) container.innerHTML = '';
    if (uploadSelect) uploadSelect.innerHTML = '<option value="">Select Event to Target</option>';
    if (modalUploadSelect) modalUploadSelect.innerHTML = '<option value="">Select Event to Target</option>';
    if (modalManualSelect) modalManualSelect.innerHTML = '<option value="">Select Event to Target</option>';
    if (registrationsSelect) registrationsSelect.innerHTML = '<option value="">All Events / Select Filter</option>';

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
                        <div style="border-left: 2px solid var(--neon-cyan); padding-left: 1rem;">
                            <p style="font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 0.2rem;">Quick Stats</p>
                            <p style="font-size: 0.9rem;">Venue: <strong>${ev.venue || 'Main Hall'}</strong></p>
                            <p style="font-size: 0.9rem;">Time: <strong>${ev.time || '10:00 AM'}</strong></p>
                            <p style="font-size: 0.9rem;">Capacity: <strong>${ev.capacity}</strong></p>
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
                        <a href="https://docs.google.com/spreadsheets/d/${ev.spreadsheetId}" target="_blank" class="btn-glow" style="text-decoration: none; padding: 0.5rem 1rem; flex: 1; font-size: 0.85rem;">📊 Sheet</a>
                        <button class="btn-glow" style="padding: 0.5rem 1rem; flex: 1; font-size: 0.85rem;" onclick="triggerImageUpdate('${ev.adminId}')">📷 Image</button>
                        <button class="btn-glow" style="background: #ef4444; padding: 0.5rem 1rem; flex: 1; font-size: 0.85rem;" onclick="deleteEvent('${ev.adminId}')">Delete</button>
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
        const res = await fetch('http://localhost:3000/api/admin/create-card', { 
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
            alert('🎉 Success! Event has been deployed and Google Sheet is synchronized.');
        } else {
            const error = await res.json();
            alert('Deployment Error: ' + (error.error || 'Unknown error'));
        }
    } catch(e) { 
        console.error('Deployment flow error:', e);
        alert('Network or System Error occurred during deployment.');
    }
    finally { btn.innerText = 'Generate System'; btn.disabled = false; }
});

async function deleteEvent(id) {
    if(!confirm('Are you sure you want to delete this event? The Google Sheet tab will also be deleted.')) return;
    try {
        await fetch(`http://localhost:3000/api/admin/event/${id}`, { method: 'DELETE' });
        
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
            const res = await fetch(`http://localhost:3000/api/admin/event/${adminId}/image`, {
                method: 'PUT',
                body: formData
            });
            const data = await res.json();
            if(res.ok) {
                alert('Image updated successfully!');
                loadEvents();
            } else {
                alert('Failed to update image: ' + data.error);
            }
        } catch(err) {
            alert('Network error while updating image');
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
    if(!adminId) return alert('Select an event first from the dropdown!');

    const fileInput = document.getElementById('bulkFile');
    const formData = new FormData();
    formData.append('file', fileInput.files[0]);

    const btn = document.getElementById('btnUpload');
    btn.innerText = 'Extracting...'; btn.disabled = true;

    try {
        const res = await fetch(`http://localhost:3000/api/events/upload/${adminId}`, {
            method: 'POST',
            body: formData
        });
        const data = await res.json();
        if(res.ok) {
            alert(`Success! ${data.message}`);
            closeModal('uploadModal');
            loadRegistrations(); // Refresh table
        } else {
            alert('Upload Failed: ' + data.error);
        }
    } catch(err) {
        alert('Network error during upload');
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

// Setup filter buttons
const filterButtons = document.querySelectorAll('#sec-registrations .btn-outline');
filterButtons.forEach(btn => {
    if (['All', 'Present', 'Pending'].includes(btn.innerText)) {
        btn.addEventListener('click', (e) => {
            filterButtons.forEach(b => {
                if(['All', 'Present', 'Pending'].includes(b.innerText)) {
                    b.classList.remove('active');
                }
            });
            e.target.classList.add('active');
            currentFilter = e.target.innerText;
            renderRegistrationsTable();
        });
    }
});

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
        const res = await fetch(`http://localhost:3000/api/admin/dashboard/${targetAdminId}`);
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
                    <td style="font-family: monospace; color: var(--neon-cyan);">${displayId}</td>
                    <td style="font-weight:600;">${row.name || '-'}</td>
                    <td>${row.mobile || '-'}</td>
                    <td style="color:var(--neon-cyan);">${row.email || '-'}</td>
                    <td>${row.course || '-'} / ${row.semester || '-'}</td>
                    <td>${dateStr}</td>
                    <td><span class="status-badge ${statClass}">${row.attendance || 'Pending'}</span></td>
                    <td>
                        <button class="btn-outline" style="padding: 4px 8px; font-size: 0.75rem;" onclick="openViewQrModal('${displayId}', '${row.name}', '${row.course}', '${row.semester}', '${qrUrl}')">
                            <i class="fas fa-qrcode"></i> View QR
                        </button>
                    </td>
                    <td><button class="btn-glow" style="background: #ef4444; padding: 4px 8px; font-size: 0.8rem;" onclick="deleteSingleRegistration('${row.scholarId}')">Delete</button></td>
                </tr>
            `;
        });
    } else {
        tbody.innerHTML = '<tr><td colspan="9" style="text-align:center; padding: 2rem; color: var(--text-secondary);">No matching registrations found.</td></tr>';
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
        linkEl.innerText = portalUrl;
        linkEl.style.display = 'inline-block';
    }
    
    openModal('viewQrModal');
}

async function downloadModalQr() {
    const modalContent = document.querySelector('#viewQrModal .modal-content');
    const scholarId = document.getElementById('modalQrId').innerText || 'QR_Code';
    
    // Select the download button to show loading state
    const btn = document.querySelector('#viewQrModal button.btn-primary');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> GENERATING...';
    btn.disabled = true;

    try {
        // Use html2canvas to capture the full card aesthetic with custom overrides for the export
        const canvas = await html2canvas(modalContent, {
            useCORS: true,
            allowTaint: true,
            backgroundColor: null,
            scale: 3, // Ultra-high resolution
            logging: false,
            onclone: (clonedDoc) => {
                // 1. Remove Background Image strictly from Export
                const clonedBg = clonedDoc.getElementById('modalQrBg');
                if (clonedBg) {
                    clonedBg.style.display = 'none';
                }

                // 2. Apply solid background to the card for clean export
                const clonedContent = clonedDoc.querySelector('#viewQrModal .modal-content');
                if (clonedContent) {
                    clonedContent.style.background = '#ffffff';
                    clonedContent.style.boxShadow = 'none';
                    clonedContent.style.border = '1px solid #e2e8f0';
                }

                // 3. Styling overrides for the clean white export image
                const header = clonedDoc.getElementById('modalQrHeader');
                const id = clonedDoc.getElementById('modalQrId');
                const name = clonedDoc.getElementById('modalQrName');
                const course = clonedDoc.getElementById('modalQrCourse');
                const qrImg = clonedDoc.getElementById('modalQrImage');

                if (header) {
                    header.style.color = '#0284c7'; 
                    header.style.textShadow = 'none';
                }
                if (id) {
                    id.style.color = '#0284c7';
                    id.style.fontWeight = '900';
                    id.style.textShadow = 'none';
                }
                if (name) {
                    name.style.color = '#1e293b'; // Dark blue/black for name
                    name.style.fontWeight = '800';
                    name.style.textShadow = 'none';
                }
                if (course) {
                    course.style.color = '#64748b'; // Slate grey for details
                    course.style.fontWeight = '600';
                    course.style.opacity = '1';
                }
                if (qrImg) {
                    qrImg.style.filter = 'contrast(1.2)';
                    qrImg.parentElement.style.background = '#ffffff';
                    qrImg.parentElement.style.boxShadow = '0 10px 30px rgba(0,0,0,0.1)';
                    qrImg.parentElement.style.border = '1px solid #f1f5f9';
                }
            }
        });
        
        const url = canvas.toDataURL('image/png', 1.0);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${scholarId}_QR_Card.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    } catch (err) {
        console.error('Full card capture failed:', err);
        // Fallback to direct image download if canvas fails
        const qrUrl = document.getElementById('modalQrImage').src;
        const a = document.createElement('a');
        a.href = qrUrl;
        a.download = `${scholarId}_QR_Only.png`;
        a.click();
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
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
        const res = await fetch('http://localhost:3000/api/admin/verify', {
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
            loadDashboard();
            loadRegistrations();
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
        alert('Network Error');
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
async function loadReports() {
    const data = await fetchUnifiedData();
    if(!data) return;
    document.getElementById('repTotalEvents').innerText = data.totalEvents;
    document.getElementById('repTotalReg').innerText = data.totalRegistrations;
    document.getElementById('repRevenue').innerText = '$' + (data.revenue || 0).toLocaleString();
    document.getElementById('repAttendance').innerText = data.totalAttendance > 0 ? ((data.totalAttendance / data.totalRegistrations) * 100).toFixed(1) + '%' : '0%';

    const tbody = document.getElementById('reportPreviewTable');
    tbody.innerHTML = '';
    data.events.forEach(ev => {
        tbody.innerHTML += `
            <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
                <td style="padding: 1rem;">${ev.eventName}</td>
                <td style="padding: 1rem;">${ev.date}</td>
                <td style="padding: 1rem;">${ev.registrationsCount || 0}/${ev.capacity}</td>
                <td style="padding: 1rem; color: var(--neon-green);">$${((ev.registrationsCount || 0) * (ev.price || 0)).toLocaleString()}</td>
            </tr>
        `;
    });
}

function exportReport(format) {
    alert(`Exporting report as ${format.toUpperCase()}...`);
}

// ==========================================
// NOTIFICATIONS SECTION
// ==========================================
async function loadNotifications() {
    try {
        const res = await fetch('http://localhost:3000/api/admin/notifications');
        const data = await res.json();
        renderNotifications(data.notifications, 'all');
    } catch(e) { console.error(e); }
}

function renderNotifications(notifs, filter) {
    const container = document.getElementById('notificationsContainer');
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
            <div style="background: rgba(255,255,255,0.03); border-left: 4px solid ${color}; padding: 1.5rem; border-radius: 8px; display: flex; gap: 1rem; position: relative; margin-bottom: 1rem;">
                ${!n.isRead ? '<div style="width: 8px; height: 8px; background: #ef4444; border-radius: 50%; position: absolute; top: 1.5rem; right: 1.5rem;"></div>' : ''}
                <div style="font-size: 1.5rem;">${icon}</div>
                <div>
                    <h4 style="color: white; margin-bottom: 0.2rem;">${n.title}</h4>
                    <p style="color: var(--text-secondary); font-size: 0.9rem;">${n.message}</p>
                    <p style="color: #888; font-size: 0.75rem; margin-top: 0.5rem;">${new Date(n.timestamp).toLocaleString()}</p>
                </div>
            </div>
        `;
    });
}

async function markAllNotificationsRead() {
    try {
        await fetch('http://localhost:3000/api/admin/notifications/read-all', { method: 'POST' });
        loadNotifications();
    } catch(e) {}
}

async function filterNotifications(filter) {
    const res = await fetch('http://localhost:3000/api/admin/notifications');
    const data = await res.json();
    renderNotifications(data.notifications, filter);
}

// ==========================================
// SETTINGS SECTION
// ==========================================
function loadSettings() {
    // Static
}

function toggleLightMode() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
}

function exportData() { alert("Exporting all admin data as ZIP..."); }
function clearCache() { alert("Local cache cleared successfully."); }
function deleteAccount() {
    if(confirm("Are you sure you want to PERMANENTLY delete your Super Admin account?")) {
        alert("Account scheduled for deletion. Logging out.");
        logout();
    }
}

// Initialize DOM elements
document.addEventListener('DOMContentLoaded', async () => {
    // Registrations Event Select
    const regEventSelect = document.getElementById('registrationsEventSelect');
    if (regEventSelect) {
        regEventSelect.addEventListener('change', (e) => {
            window.currentTargetAdminId = e.target.value;
            loadRegistrations();
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

    // Registrations Status Filters
    const filterButtons = document.querySelectorAll('#sec-registrations .btn-outline');
    filterButtons.forEach(btn => {
        if (['All', 'Present', 'Pending'].includes(btn.innerText)) {
            btn.addEventListener('click', (e) => {
                filterButtons.forEach(b => {
                    if(['All', 'Present', 'Pending'].includes(b.innerText)) {
                        b.classList.remove('active');
                    }
                });
                e.target.classList.add('active');
                currentFilter = e.target.innerText;
                renderRegistrationsTable();
            });
        }
    });

    // Manual Entry Form
    const manualForm = document.getElementById('manualEntryForm');
    if(manualForm) {
        manualForm.addEventListener('submit', handleManualEntry);
    }

    await fetchUnifiedData();
    loadEvents();
    loadRegistrations();
    loadNotifications();
    setupFilters();
});

async function handleManualEntry(e) {
    e.preventDefault();
    const adminId = document.getElementById('modalManualEventSelect').value;
    if(!adminId) return alert('Select an event from the dropdown to target first.');

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
        const res = await fetch(`http://localhost:3000/api/admin/event/${adminId}/manual-entry`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        
        if(res.ok) {
            alert(data.message);
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
            document.querySelectorAll('#sec-registrations .btn-outline').forEach(b => {
                if(['All', 'Present', 'Pending'].includes(b.innerText)) {
                    if (b.innerText === 'All') b.classList.add('active');
                    else b.classList.remove('active');
                }
            });
            
            loadRegistrations();
        } else {
            alert(data.error || 'Failed to add registration');
        }
    } catch(error) {
        alert('Connection Error');
    }
    btn.disabled = false;
    btn.textContent = 'Save Student';
}

// ==========================================
// BULK DELETE RECORDS
// ==========================================
async function bulkDeleteEventRecords() {
    const adminId = window.currentTargetAdminId;
    if(!adminId) return;
    
    if(!confirm('Are you sure you want to delete?')) return;

    try {
        const res = await fetch(`http://localhost:3000/api/admin/event/${adminId}/records`, {
            method: 'DELETE'
        });
        const data = await res.json();
        
        if(res.ok) {
            alert(data.message);
            loadRegistrations(); // Refresh the table
            loadEvents(); // Refresh overall stats
        } else {
            alert('Failed to delete records: ' + data.error);
        }
    } catch(e) {
        alert('Connection error');
    }
}

// ==========================================
// INDIVIDUAL DELETE
// ==========================================
async function deleteSingleRegistration(scholarId) {
    const adminId = window.currentTargetAdminId;
    if(!adminId) return;
    if(!confirm('Are you sure you want to delete?')) return;

    try {
        const res = await fetch(`http://localhost:3000/api/admin/event/${adminId}/record/${scholarId}`, { method: 'DELETE' });
        const data = await res.json();
        if(res.ok) {
            loadRegistrations();
            loadEvents();
        } else {
            alert('Failed to delete: ' + data.error);
        }
    } catch(e) { alert('Connection error'); }
}


