document.addEventListener('DOMContentLoaded', () => {
    // 1. Handle Animation Load
    setTimeout(() => {
        document.body.classList.add('loaded');
    }, 500);

    // 2. Parse URL Parameters
    const urlParams = new URLSearchParams(window.location.search);
    const eventId = urlParams.get('eventId') || '';
    const eventName = urlParams.get('eventName') || 'Unknown Event';
    const scholarId = urlParams.get('scholarId') || '';
    const studentName = urlParams.get('studentName') || '';
    const course = urlParams.get('course') || '';
    const semester = urlParams.get('semester') || '';
    const theme = 'light';

    // Apply theme
    document.documentElement.setAttribute('data-theme', theme);

    // If critical data is missing, maybe show an error or just proceed (let backend validate)
    
    // Auto-fill DOM
    document.getElementById('eventId').value = eventId;
    document.getElementById('eventName').value = eventName;
    document.getElementById('scholarId').value = scholarId;
    
    document.getElementById('eventTitle').innerText = eventName;
    document.getElementById('studentName').value = studentName;
    document.getElementById('course').value = course;
    document.getElementById('semester').value = semester;

    // 3. Handle Rating Emojis
    const emojiBtns = document.querySelectorAll('.emoji-btn');
    const ratingInput = document.getElementById('ratingValue');

    emojiBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Remove active from all
            emojiBtns.forEach(b => b.classList.remove('active'));
            // Add active to clicked
            btn.classList.add('active');
            // Set value
            ratingInput.value = btn.getAttribute('data-val');
        });
    });

    // 4. Handle Form Submission
    const form = document.getElementById('feedbackForm');
    const submitBtn = document.getElementById('submitBtn');
    const successMsg = document.getElementById('successMessage');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (!ratingInput.value) {
            alert('Please select a rating emoji before submitting.');
            return;
        }

        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());

        // UI Loading
        submitBtn.classList.add('loading');
        submitBtn.disabled = true;

        try {
            const response = await fetch('/api/events/feedback/submit', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            const result = await response.json();

            if (response.ok) {
                form.style.display = 'none';
                successMsg.classList.remove('hidden');
                document.querySelector('.form-header p').innerText = 'Completed';
            } else {
                alert(result.error || 'Failed to submit feedback.');
            }
        } catch (error) {
            alert('Network error. Please try again later.');
            console.error('Submit error:', error);
        } finally {
            submitBtn.classList.remove('loading');
            submitBtn.disabled = false;
        }
    });
});
