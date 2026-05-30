const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
    adminId: { type: String, required: true, unique: true },
    eventId: { type: String, required: true, unique: true },
    adminName: { type: String, required: true },
    eventName: { type: String, required: true },
    organizer: { type: String, required: true, default: '' },
    description: { type: String, default: 'No description provided' },
    spreadsheetId: { type: String, required: true },
    sheetName: { type: String, required: true },
    email: { type: String, required: false },
    feedbackEmailsSent: { type: Number, default: 0 },
    date: { type: String, required: true },
    time: { type: String, default: '10:00 AM' },
    venue: { type: String, default: 'Main Hall' },
    capacity: { type: Number, default: 100 },
    price: { type: Number, default: 0 },
    registrationsCount: { type: Number, default: 0 },
    status: { type: String, default: 'upcoming' },
    qrCodeData: { type: String, required: true },
    qrImage: { type: String, required: true },
    imageUrl: { type: String, default: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?q=80&w=600&auto=format&fit=crop' },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Event', eventSchema);
