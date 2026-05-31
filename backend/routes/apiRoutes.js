const express = require('express');
const router = express.Router();
const submissionController = require('../controllers/submissionController');
const uploadController = require('../controllers/uploadController');
const studentController = require('../controllers/studentController');
const feedbackController = require('../controllers/feedbackController');
const Event = require('../models/Event');

// User Registration form submit (targets specific admin sheet)
router.post('/register/:eventId', submissionController.submitRegistration);

// Feedback Submission Endpoint
router.post('/feedback/submit', feedbackController.submitFeedback);

// File Bulk Upload for an Event
router.post('/upload/:adminId', uploadController.uploadMiddleware, uploadController.uploadAndExtract);

// User Flow: Validate Scholar ID against imported records for a specific event
router.get('/student/:eventId/:scholarId', async (req, res) => {
    try {
        const { eventId, scholarId } = req.params;
        const searchId = String(scholarId).trim();
        
        // Resolve eventId in case adminId was passed
        const event = await Event.findOne({ $or: [{ eventId }, { adminId: eventId }] });
        if (!event) return res.status(404).json({ error: 'Event not found.' });

        const reg = await require('../models/Registration').findOne({ 
            eventId: event.eventId, 
            scholarId: { $regex: new RegExp('^' + searchId + '$', 'i') }
        });
        if (!reg) return res.status(404).json({ error: 'Invalid Scholar ID for this event.' });
        res.status(200).json(reg);
    } catch (err) {
        console.error('Error in /student/:eventId/:scholarId:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// User Flow: Fetch events linked to a specific Scholar ID
router.get('/student-events/:scholarId', async (req, res) => {
    try {
        const searchId = String(req.params.scholarId).trim();
        const Registration = require('../models/Registration');
        const registrations = await Registration.find({ 
            scholarId: { $regex: new RegExp('^' + searchId + '$', 'i') } 
        });
        if (!registrations || registrations.length === 0) {
            return res.status(404).json({ error: 'Scholar ID not found in any registration.' });
        }
        
        const eventIds = registrations.map(r => r.eventId);
        const events = await Event.find({ eventId: { $in: eventIds } });
        
        res.status(200).json(events);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// User Flow: Fetch event details by eventId or adminId
router.get('/details/:eventId', async (req, res) => {
    try {
        const event = await Event.findOne({ 
            $or: [{ eventId: req.params.eventId }, { adminId: req.params.eventId }] 
        });
        if (!event) return res.status(404).json({ error: 'Event not found.' });
        res.status(200).json(event);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
