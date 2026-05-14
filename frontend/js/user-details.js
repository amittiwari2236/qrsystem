document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const scholarId = urlParams.get('scholarId');
    const eventId = urlParams.get('eventId');

    if (!scholarId || !eventId) {
        window.location.href = 'user.html';
        return;
    }

    const interestedCheck = document.getElementById('interestedCheck');
    const submitBtn = document.getElementById('submitBtn');
    const statusMsg = document.getElementById('statusMsg');

    try {
        // Fetch specific event details
        const resEvent = await fetch(`/api/events/details/${eventId}`);
        if (resEvent.ok) {
            const evt = await resEvent.json();
            document.getElementById('panelEventTitle').textContent = evt.eventName;
            document.getElementById('panelOrganizer').textContent = (evt.organizer && evt.organizer !== 'Admin') ? evt.organizer : 'University Organizer';
            
            // Format Date to dd/mm/yyyy
            if (evt.date) {
                const dateObj = new Date(evt.date);
                const dd = String(dateObj.getDate()).padStart(2, '0');
                const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
                const yyyy = dateObj.getFullYear();
                document.getElementById('panelDate').textContent = `${dd}/${mm}/${yyyy}`;
            }

            document.getElementById('panelVenue').textContent = evt.venue;
            document.getElementById('panelTime').textContent = evt.time || '10:00 AM';

            // Poster background is now decoupled from event image and follows CSS design
            
            // Set description with visibility check
            const descEl = document.getElementById('panelDesc');
            if (evt.description && evt.description !== 'No description provided') {
                descEl.textContent = evt.description;
            } else {
                descEl.textContent = 'Join us for this exclusive event at DSVV! Don\'t miss out on this incredible opportunity.';
            }
        }

        // Fetch validated student details from imported records
        const resStudent = await fetch(`/api/events/student/${eventId}/${scholarId}`);
        if (resStudent.ok) {
            const data = await resStudent.json();
            document.getElementById('studentScholarId').value = data.scholarId;
            document.getElementById('studentName').value = data.name;
            document.getElementById('studentMobile').value = data.mobile;
            document.getElementById('studentEmail').value = data.email;
            document.getElementById('studentCourse').value = data.course;
            document.getElementById('studentSemester').value = data.semester;
        } else {
            alert('Invalid Session. Redirecting.');
            window.location.href = 'user.html';
        }
    } catch (err) {
        console.error('Error loading details:', err);
    }

    interestedCheck.addEventListener('change', (e) => {
        if (e.target.checked) {
            submitBtn.disabled = false;
            submitBtn.style.opacity = '1';
            submitBtn.style.cursor = 'pointer';
        } else {
            submitBtn.disabled = true;
            submitBtn.style.opacity = '0.5';
            submitBtn.style.cursor = 'not-allowed';
        }
    });

    document.getElementById('registrationConfirmForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!interestedCheck.checked) return;

        submitBtn.disabled = true;
        submitBtn.textContent = 'Submitting...';

        const payload = {
            scholarId: scholarId,
            eventId: eventId
        };

        try {
            // Note: Since the imported record is already in DB as 'Pending',
            // submitRegistration should update it to 'Registered'/'Present' 
            // and emit websocket.
            const res = await fetch(`/api/events/register/${eventId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();

            if (res.ok) {
                statusMsg.style.color = '#10b981';
                statusMsg.textContent = 'Registration Confirmed Successfully!';
                
                // Show clean success modal
                document.getElementById('successModal').style.display = 'flex';
            } else {
                statusMsg.style.color = '#ef4444';
                statusMsg.textContent = data.error || 'Registration failed';
                submitBtn.disabled = false;
                submitBtn.textContent = 'Finalize Registration';
            }
        } catch (err) {
            statusMsg.style.color = '#ef4444';
            statusMsg.textContent = 'Connection Error';
            submitBtn.disabled = false;
            submitBtn.textContent = 'Finalize Registration';
        }
    });
});
