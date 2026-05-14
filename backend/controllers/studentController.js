const Student = require('../models/Student');
const Registration = require('../models/Registration');

exports.getAllStudents = async (req, res) => {
    try {
        const students = await Student.find().sort({ importedAt: -1 });
        res.status(200).json(students);
    } catch (error) {
        console.error('Error fetching students:', error);
        res.status(500).json({ error: 'Failed to fetch students' });
    }
};

exports.deleteStudent = async (req, res) => {
    try {
        const { scholarId } = req.params;
        await Student.findOneAndDelete({ scholarId });
        // Optionally, delete registrations related to this student
        await Registration.deleteMany({ scholarId });
        
        // Note: Google Sheets sync deletion might be tricky if they are appended blindly.
        // Usually, a full sheet overwrite or finding the exact row is needed, which is slow.
        // For now, we only delete from MongoDB.

        res.status(200).json({ message: 'Student deleted successfully' });
    } catch (error) {
        console.error('Error deleting student:', error);
        res.status(500).json({ error: 'Failed to delete student' });
    }
};

exports.bulkDeleteStudents = async (req, res) => {
    try {
        const { scholarIds } = req.body; // Array of scholar IDs
        if (!scholarIds || !Array.isArray(scholarIds)) {
            return res.status(400).json({ error: 'Invalid scholar IDs provided' });
        }
        await Student.deleteMany({ scholarId: { $in: scholarIds } });
        await Registration.deleteMany({ scholarId: { $in: scholarIds } });
        
        res.status(200).json({ message: `${scholarIds.length} students deleted successfully` });
    } catch (error) {
        console.error('Error bulk deleting students:', error);
        res.status(500).json({ error: 'Failed to bulk delete students' });
    }
};
