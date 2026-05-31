const googleSheetsService = require('../services/googleSheetsService');
const Event = require('../models/Event');
const Registration = require('../models/Registration');

exports.submitFeedback = async (req, res) => {
    try {
        const { eventId, eventName, scholarId, studentName, course, semester, rating, relevance, valuableGain, nextLearn } = req.body;

        if (!eventId || !scholarId || !rating) {
            return res.status(400).json({ error: 'Event ID, Scholar ID, and Rating are required.' });
        }

        const event = await Event.findOne({ eventId });
        if (!event || !event.spreadsheetId || !event.sheetName) {
            return res.status(404).json({ error: 'Event not found or Google Sheet not configured.' });
        }

        const spreadsheetId = event.spreadsheetId;
        const tabName = event.sheetName;

        const existingData = await googleSheetsService.getRegistrations(spreadsheetId, tabName);
        if (!existingData || existingData.length === 0) {
            return res.status(404).json({ error: 'Event sheet is empty.' });
        }

        const sId = String(scholarId).trim().toLowerCase();
        const rowIndex = existingData.findIndex(row => String(row[0]).trim().toLowerCase() === sId);

        if (rowIndex === -1) {
            return res.status(404).json({ error: 'Scholar ID not found in the event sheet.' });
        }

        const existingRow = existingData[rowIndex];
        // Column M is index 12 ('Feedback Submitted')
        if (existingRow[12] && String(existingRow[12]).trim().toLowerCase() === 'yes') {
            return res.status(409).json({ error: 'Feedback already submitted for this event.' });
        }

        const timestamp = new Date().toISOString();

        // Prepare feedback array corresponding to columns M to R
        // ['Feedback Submitted', 'Overall Rating', 'Relevance Rating', 'Most Valuable Learning', 'Next Session Interest', 'Feedback Timestamp']
        const feedbackArray = [
            'Yes',
            rating,
            relevance || 'N/A',
            valuableGain || 'N/A',
            nextLearn || 'N/A',
            timestamp
        ];

        const success = await googleSheetsService.updateRegistrationFeedback(spreadsheetId, tabName, scholarId, feedbackArray);

        if (!success) {
            return res.status(500).json({ error: 'Failed to save feedback to Google Sheet.' });
        }

        // Emit WebSocket event so dashboard updates in real time
        const io = req.app.get('socketio');
        if (io) {
            io.emit('feedbackUpdate', { eventId, message: 'New feedback received' });
        }

        res.status(201).json({ message: 'Feedback submitted successfully.' });
    } catch (error) {
        console.error('Error submitting feedback:', error);
        res.status(500).json({ error: 'Failed to submit feedback' });
    }
};
