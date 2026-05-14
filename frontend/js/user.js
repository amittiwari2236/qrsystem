document.addEventListener('DOMContentLoaded', async () => {
    const eventSelect = document.getElementById('eventSelect');
    const scholarIdInput = document.getElementById('scholarId');
    const validateBtn = document.getElementById('validateBtn');
    const errorMsg = document.getElementById('errorMsg');
    const form = document.getElementById('startRegistrationForm');

    // Check for eventId in URL
    const urlParams = new URLSearchParams(window.location.search);
    const lockedEventId = urlParams.get('eventId');

    // Initially disable dropdown and button
    eventSelect.disabled = true;
    validateBtn.disabled = true;

    if (lockedEventId) {
        // Mode: Specific Event Linked (QR/Direct Link)
        try {
            const res = await fetch(`/api/events/details/${lockedEventId}`);
            if (res.ok) {
                const event = await res.json();
                eventSelect.innerHTML = `<option value="${event.eventId}" selected>${event.eventName}</option>`;
                eventSelect.disabled = true; // Lock it
            } else {
                showError('Linked event not found. Using general mode.');
            }
        } catch (err) {
            console.error('Error fetching event details:', err);
        }
    }

    // Listener for Scholar ID input
    scholarIdInput.addEventListener('input', async (e) => {
        const scholarId = e.target.value.trim();
        
        if (scholarId.length < 3) {
            if (!lockedEventId) resetDropdown();
            validateBtn.disabled = true;
            return;
        }

        try {
            if (lockedEventId) {
                // Validate strictly for the locked event
                const res = await fetch(`/api/events/student/${lockedEventId}/${scholarId}`);
                if (res.ok) {
                    errorMsg.style.display = 'none';
                    validateBtn.disabled = false;
                } else {
                    const data = await res.json();
                    showError(data.error || 'You are not registered for this specific event.');
                    validateBtn.disabled = true;
                }
            } else {
                // General Mode: Fetch all events student is registered for
                const res = await fetch(`/api/events/student-events/${scholarId}`);
                if (res.ok) {
                    const events = await res.json();
                    populateDropdown(events);
                    errorMsg.style.display = 'none';
                    eventSelect.disabled = false;
                    validateBtn.disabled = false;
                } else {
                    resetDropdown();
                    showError('Scholar ID not found in any registrations.');
                }
            }
        } catch (err) {
            console.error('Fetch error:', err);
        }
    });

    function populateDropdown(events) {
        if (events.length === 1) {
            eventSelect.innerHTML = `<option value="${events[0].eventId}" selected>${events[0].eventName}</option>`;
        } else {
            eventSelect.innerHTML = '<option value="" disabled selected>Select Registered Event</option>';
            events.forEach(evt => {
                eventSelect.innerHTML += `<option value="${evt.eventId}">${evt.eventName}</option>`;
            });
        }
    }

    function resetDropdown() {
        eventSelect.innerHTML = '<option value="" disabled selected>Select Event</option>';
        eventSelect.disabled = true;
        validateBtn.disabled = true;
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const scholarId = scholarIdInput.value.trim();
        const eventId = eventSelect.value;

        if (!scholarId || !eventId) {
            showError('Please enter Scholar ID and select an Event.');
            return;
        }

        // Success! Redirect to the details page with params
        window.location.href = `user-details.html?scholarId=${scholarId}&eventId=${eventId}`;
    });

    function showError(msg) {
        errorMsg.textContent = msg;
        errorMsg.style.display = 'block';
    }
});
