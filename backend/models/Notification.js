const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    type: { type: String, required: true }, // 'registration', 'alert', 'reminder', 'system'
    title: { type: String, required: true },
    message: { type: String, required: true },
    isRead: { type: Boolean, default: false },
    timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Notification', notificationSchema);
