const mongoose = require('mongoose');

const registrationSchema = new mongoose.Schema({
    registrationId: { type: String, unique: true, sparse: true }, // REG-1-001 format
    scholarId: { type: String, required: true, index: true }, // Links to Student.scholarId
    eventId: { type: String, required: true, index: true }, // Links to Event.eventId
    name: { type: String, required: true },
    mobile: { type: String, required: true },
    email: { type: String, required: true },
    course: { type: String, required: true },
    semester: { type: String, required: true },
    venue: { type: String, required: false, default: 'Main Venue' },
    time: { type: String, required: false, default: '10:00 AM' },
    attendance: { type: String, default: 'Pending' },
    ipAddress: { type: String, default: 'Unknown IP' },
    timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Registration', registrationSchema);
