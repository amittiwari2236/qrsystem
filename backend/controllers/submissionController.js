const googleSheetsService = require('../services/googleSheetsService');
const mailService = require('../services/mailService');
const Event = require('../models/Event');
const Student = require('../models/Student');
const Registration = require('../models/Registration');

exports.submitRegistration = async (req, res) => {
    try {
        const { eventId, scholarId } = req.body;

        if (!eventId || !scholarId) {
            return res.status(400).json({ error: 'Event ID and Scholar ID are required.' });
        }

        // 1. Validate Event (support both eventId and adminId)
        const eventData = await Event.findOne({ $or: [{ eventId }, { adminId: eventId }] });
        if (!eventData || !eventData.spreadsheetId) {
            return res.status(404).json({ error: 'Invalid Event or Sheet not found.' });
        }

        const actualEventId = eventData.eventId;

        // 3. Check if already registered (imported) using resolved eventId
        const existingReg = await Registration.findOne({ eventId: actualEventId, scholarId });
        if (!existingReg) {
            return res.status(404).json({ error: 'Student is not imported for this event.' });
        }

        if (existingReg.attendance === 'Present') {
            return res.status(400).json({ error: 'You are already registered/present for this event.' });
        }

        const ipAddress = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.ip || req.connection?.remoteAddress || 'Unknown IP';
        const timestamp = new Date().toISOString();

        // 4. Update MongoDB to 'Present'
        existingReg.attendance = 'Present';
        existingReg.timestamp = timestamp;
        existingReg.ipAddress = ipAddress;
        
        // Ensure venue and time are present for validation
        if (!existingReg.venue) existingReg.venue = eventData.venue || 'Main Venue';
        if (!existingReg.time) existingReg.time = eventData.time || '10:00 AM';
        
        await existingReg.save();

        // 5. Update Google Sheet status to 'Present' (Sync)
        try {
            await googleSheetsService.updateRegistrationStatus(eventData.spreadsheetId, eventData.sheetName, scholarId, 'Present');
        } catch (sheetError) {
            console.error('Failed to sync "Present" status to Google Sheets:', sheetError.message);
        }

        // 6. Send welcome email to user and admin notification (Non-blocking)
        try {
            await Promise.all([
                mailService.sendUserWelcomeEmail(existingReg, eventData),
                mailService.sendAdminNotificationEmail(existingReg, eventData)
            ]);
        } catch (emailError) {
            console.error('Error sending registration emails:', emailError.message);
            // Don't fail registration if emails fail - log and continue
        }

        // 7. Emit Real-time WebSocket Event
        const io = req.app.get('socketio');
        if (io) {
            io.emit('newSubmission', { eventId: actualEventId, scholarId, totalScans: eventData.registrationsCount });
        }

        res.status(200).json({
            message: 'Registration successful!',
            scholarId: scholarId
        });

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Failed to process registration' });
    }
};
