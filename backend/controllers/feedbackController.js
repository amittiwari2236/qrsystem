const googleSheetsService = require('../services/googleSheetsService');
const Event = require('../models/Event');
const Registration = require('../models/Registration');

exports.submitFeedback = async (req, res) => {
    try {
        const { eventId, eventName, scholarId, studentName, course, semester, rating, relevance, valuableGain, nextLearn } = req.body;

        if (!eventId || !scholarId || !rating) {
            return res.status(400).json({ error: 'Event ID, Scholar ID, and Rating are required.' });
        }

        const spreadsheetId = process.env.MASTER_SHEET_ID;
        const tabName = 'Feedback';

        // Check if tab exists, if not create and initialize
        try {
            await googleSheetsService.getRegistrations(spreadsheetId, tabName);
        } catch (error) {
            console.log("Feedback tab doesn't exist. Creating it...");
            await googleSheetsService.createSheetTab(spreadsheetId, tabName);
            await googleSheetsService.initializeSheetColumns(spreadsheetId, tabName, [
                'Timestamp', 'Event ID', 'Event Name', 'Scholar ID', 'Student Name', 'Email', 'Course', 'Semester', 'Overall Rating', 'Relevance Rating', 'Most Valuable Learning', 'Next Session Interest', 'IP Address'
            ]);
        }

        // Try to fetch email from Registration if not provided
        let email = 'N/A';
        try {
            const reg = await Registration.findOne({ eventId, scholarId });
            if (reg && reg.email) {
                email = reg.email;
            }
        } catch (e) {
            console.warn("Could not fetch email for feedback", e);
        }

        const ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'Unknown IP';
        const timestamp = new Date().toISOString();

        const rowData = [
            timestamp,
            eventId,
            eventName || 'Unknown',
            scholarId,
            studentName || 'Unknown',
            email,
            course || 'N/A',
            semester || 'N/A',
            rating,
            relevance || 'N/A',
            valuableGain || 'N/A',
            nextLearn || 'N/A',
            ipAddress
        ];

        // Ensure we don't save duplicates
        const existingData = await googleSheetsService.getRegistrations(spreadsheetId, tabName);
        const isDuplicate = existingData.some(row => row[1] === eventId && row[3] === scholarId);
        
        if (isDuplicate) {
            return res.status(409).json({ error: 'Feedback already submitted for this event.' });
        }

        await googleSheetsService.appendRegistrationRow(spreadsheetId, tabName, rowData);

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
