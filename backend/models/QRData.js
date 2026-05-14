const mongoose = require('mongoose');

const qrDataSchema = new mongoose.Schema({
    qrId: { type: String, required: true, unique: true },
    qrImage: { type: String, required: true },
    eventName: { type: String, required: true },
    adminName: { type: String, required: true },
    timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('QRData', qrDataSchema);
