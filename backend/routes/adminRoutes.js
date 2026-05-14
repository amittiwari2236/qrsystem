const express = require('express');
const router = express.Router();
const multer = require('multer');
const adminController = require('../controllers/adminController');
const studentController = require('../controllers/studentController');

const upload = multer({ storage: multer.memoryStorage() });

// Super Admin: Login
router.post('/login', adminController.login);

// Super Admin: Create a new Admin Card (generates the Sheet)
router.post('/create-card', upload.single('image'), adminController.createAdminCard);

// Super Admin: View all active admins
router.get('/all', adminController.getActiveAdmins);

// Admin: Get their specific dashboard details and registrations
router.get('/dashboard/:adminId', adminController.getAdminDashboard);

// Unified Dashboard Analytics
router.get('/analytics', adminController.getUnifiedAnalytics);

// Delete Event
router.delete('/event/:adminId', adminController.deleteEvent);

// Update Event Image
router.put('/event/:adminId/image', upload.single('image'), adminController.updateEventImage);

// Notifications
router.get('/notifications', adminController.getNotifications);
router.post('/notifications/read-all', adminController.markAllNotificationsRead);

// Unified event records management
router.delete('/event/:adminId/records', adminController.deleteEventRecords);
router.delete('/event/:adminId/record/:scholarId', adminController.deleteSingleRecord);
router.post('/event/:adminId/manual-entry', adminController.addManualRegistration);

// QR/ID Scanner Check-in
router.post('/verify', adminController.verifyRegistration);

module.exports = router;
