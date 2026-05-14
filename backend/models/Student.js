const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
    scholarId: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    mobile: { type: String, required: true },
    email: { type: String, required: true },
    course: { type: String, required: true },
    semester: { type: String, required: true },
    importedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Student', studentSchema);
