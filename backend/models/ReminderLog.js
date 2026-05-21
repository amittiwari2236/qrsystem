const mongoose = require('mongoose');

const reminderLogSchema = new mongoose.Schema({
    registrationId: { type: String, required: true, index: true },
    eventId: { type: String, required: true, index: true },
    reminderType: { type: String, enum: ['24h', '1h'], required: true },
    sentAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true, index: true } // For automatic deletion (TTL)
});

// TTL index: automatically delete documents 7 days after expiresAt
reminderLogSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('ReminderLog', reminderLogSchema);
