const mongoose = require('mongoose');

const adminSchema = new mongoose.Schema({
    name: { type: String, default: 'Amit Tiwari' },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    phone: { type: String, default: '' },
    department: { type: String, default: '' },
    designation: { type: String, default: 'Super Admin' },
    bio: { type: String, default: '' },
    profilePhoto: { type: String, default: '' },
    tempPasswordResetToken: { type: String, default: '' },
    tempNewPassword: { type: String, default: '' },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Admin', adminSchema);
