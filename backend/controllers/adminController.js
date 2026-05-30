const googleSheetsService = require('../services/googleSheetsService');
const QRCode = require('qrcode');
const cloudinaryService = require('../services/cloudinaryService');

const Event = require('../models/Event');
const QRData = require('../models/QRData');
const Notification = require('../models/Notification');

const Admin = require('../models/Admin');

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;
        
        const admin = await Admin.findOne({ email });
        if (admin && admin.password === password) {
            return res.status(200).json({ message: 'Login successful' });
        } else {
            // Fallback for static default credentials
            if (email === 'amittiwari2236@gmail.com' && password === 'Scholar@1910') {
                return res.status(200).json({ message: 'Login successful' });
            }
            return res.status(401).json({ error: 'Invalid Email or Password' });
        }
    } catch (err) {
        console.error('Login controller error:', err);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};

exports.createAdminCard = async (req, res) => {
    try {
        const { adminName, eventName, email, date, time, venue, organizer, description, capacity, price } = req.body;
        
        if (!adminName || !eventName) {
            return res.status(400).json({ error: 'Admin Name and Event Name are required' });
        }

        const dateStr = date || new Date().toISOString().split('T')[0];
        const sheetTitle = `${eventName}_${adminName}_${dateStr}`.replace(/\s+/g, '_').substring(0, 90);
        
        const masterSheetId = process.env.MASTER_SHEET_ID;
        if (!masterSheetId || masterSheetId === '1waWXqYJf2zabpcUVW85VQ9gYFJufXJwlqyb7szWpdNQ') {
            return res.status(500).json({ error: 'Please set your actual MASTER_SHEET_ID in the .env file first.' });
        }

        // 1. & 5. Perform Google Sheets initialization and Cloudinary upload in parallel
        const columns = ['Scholar ID', 'Name', 'Mobile', 'Email', 'Course', 'Semester', 'Registration ID', 'Date', 'Event Name', 'Venue', 'Time', 'QR Status'];
        
        let tabName;
        let imageUrl = 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?q=80&w=600&auto=format&fit=crop';

        const [sheetRes, cloudinaryRes] = await Promise.allSettled([
            googleSheetsService.createSheetTab(masterSheetId, sheetTitle).then(async (name) => {
                tabName = name;
                await googleSheetsService.initializeSheetColumns(masterSheetId, name, columns);
                return name;
            }),
            req.file ? cloudinaryService.uploadImage(req.file.buffer, 'events', `${eventName.replace(/\s+/g, '_')}_hero`) : Promise.resolve(null)
        ]);

        if (sheetRes.status === 'fulfilled') tabName = sheetRes.value;
        else throw new Error('Failed to initialize Google Sheet: ' + sheetRes.reason);

        if (cloudinaryRes.status === 'fulfilled' && cloudinaryRes.value) {
            imageUrl = cloudinaryRes.value.secure_url;
        }

        // 3. Generate Unique IDs (CSSDC + 4 random + 2 serial)
        const eventCount = await Event.countDocuments();
        const serialNum = String(eventCount + 1).padStart(2, '0');
        const randomDigits = Math.floor(1000 + Math.random() * 9000);
        const adminId = `CSSDC${randomDigits}${serialNum}`;
        const qrId = adminId;
        const eventId = `EVT_${Math.floor(Math.random() * 100000)}`;
 
        // 4. Generate Base64 QR Image with direct URL link
        const qrUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/user.html`;
        const qrDataURL = await QRCode.toDataURL(qrUrl, {
            color: { dark: '#06b6d4', light: '#0000' } 
        });

        const newEvent = new Event({
            adminId,
            eventId,
            adminName,
            eventName,
            organizer: organizer,
            description: description || 'Join us for this exclusive event!',
            spreadsheetId: masterSheetId,
            sheetName: tabName,
            email,
            date: dateStr,
            time: time || '10:00 AM',
            venue: venue || 'Main Hall',
            capacity: capacity || 100,
            price: price || 0,
            qrCodeData: qrId,
            qrImage: qrDataURL,
            imageUrl: imageUrl
        });

        await newEvent.save();

        const newQR = new QRData({
            qrId,
            qrImage: qrDataURL,
            eventName,
            adminName
        });
        await newQR.save();
        
        // Save to master sheet if configured
        await googleSheetsService.saveToMasterSheet(newEvent);

        res.status(201).json({
            message: 'Event/Admin Card created and Google Sheet assigned successfully!',
            data: newEvent
        });
    } catch (error) {
        console.error('Error creating admin card:', error);
        res.status(500).json({ error: 'Failed to create Admin Card and Sheet' });
    }
};

exports.updateEventImage = async (req, res) => {
    try {
        const { adminId } = req.params;
        const event = await Event.findOne({ adminId });
        
        if (!event) {
            return res.status(404).json({ error: 'Event not found' });
        }

        if (!req.file) {
            return res.status(400).json({ error: 'No image provided' });
        }

        // Upload to Cloudinary with Optimization
        const uploadResult = await cloudinaryService.uploadImage(
            req.file.buffer, 
            'events', 
            `update_${adminId}_${Date.now()}`
        );

        // Update image URL in DB
        event.imageUrl = uploadResult.secure_url;
        await event.save();

        res.status(200).json({
            message: 'Image updated successfully!',
            imageUrl: event.imageUrl
        });
    } catch (error) {
        console.error('Error updating event image:', error);
        res.status(500).json({ error: 'Failed to update image' });
    }
};

exports.getAdminDashboard = async (req, res) => {
    try {
        const { adminId } = req.params;
        const adminData = await Event.findOne({ adminId });
        
        if (!adminData) {
            return res.status(404).json({ error: 'Admin not found' });
        }

        const Registration = require('../models/Registration');
        const registrations = await Registration.find({ eventId: adminData.eventId }).sort({ timestamp: -1 });
        
        // Update registration count
        adminData.registrationsCount = registrations.length;
        await adminData.save();

        res.status(200).json({
            adminInfo: adminData,
            registrations: registrations,
            totalRegistrations: registrations.length
        });
    } catch (error) {
        console.error('Error fetching dashboard:', error);
        res.status(500).json({ error: 'Failed to load dashboard data' });
    }
};



exports.getActiveAdmins = async (req, res) => {
    try {
        const admins = await Event.find().sort({ createdAt: -1 });
        res.status(200).json({ admins });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch active admins' });
    }
};

// Return total unified analytics
exports.getUnifiedAnalytics = async (req, res) => {
    try {
        const admins = await Event.find().lean();
        const qrHistory = await QRData.find().sort({ timestamp: -1 }).lean();
        let totalEvents = admins.length;
        let totalRegistrations = 0;
        let totalAttendance = 0;
        let revenue = 0;

        const Registration = require('../models/Registration');

        // Optimized Aggregation: Get counts for all events in one pass
        const stats = await Registration.aggregate([
            {
                $group: {
                    _id: "$eventId",
                    totalReg: { $sum: 1 },
                    presentCount: { $sum: { $cond: [{ $eq: ["$attendance", "Present"] }, 1, 0] } }
                }
            }
        ]);

        const statsMap = stats.reduce((acc, curr) => {
            acc[curr._id] = curr;
            return acc;
        }, {});

        for (let admin of admins) {
            const s = statsMap[admin.eventId] || { totalReg: 0, presentCount: 0 };
            admin.registrationsCount = s.totalReg;
            totalRegistrations += s.totalReg;
            totalAttendance += s.presentCount;
            revenue += (s.totalReg * Number(admin.price || 0));
        }

        res.status(200).json({
            totalEvents,
            totalRegistrations,
            totalAttendance,
            revenue,
            activeQRs: qrHistory.length,
            events: admins,
            qrHistory
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to generate analytics' });
    }
};

exports.deleteEvent = async (req, res) => {
    try {
        const { adminId } = req.params;
        const event = await Event.findOne({ adminId });
        
        if (!event) {
            return res.status(404).json({ error: 'Event not found' });
        }

        // 1. Delete corresponding Google Sheet TAB dynamically
        try {
            await googleSheetsService.deleteSheetTab(event.spreadsheetId, event.sheetName);
        } catch (sheetError) {
            console.warn('Could not delete Google Sheet tab, proceeding with DB deletion:', sheetError.message);
        }

        // 2. Remove all registrations related to that event from DB
        const Registration = require('../models/Registration'); // local import to avoid circular dependency
        await Registration.deleteMany({ eventId: event.eventId });

        // 3. Remove QR mapping
        await QRData.findOneAndDelete({ qrId: event.qrCodeData });

        // 4. Remove event entry
        await Event.findOneAndDelete({ adminId });

        // Add System Notification
        await Notification.create({
            type: 'system',
            title: 'Event Deleted',
            message: `${event.eventName} was deleted by Admin.`
        });

        res.status(200).json({ message: 'Event successfully deleted from Database and Google Sheets' });
    } catch (error) {
        console.error('Error deleting event:', error);
        res.status(500).json({ error: 'Failed to delete event' });
    }
};

exports.getNotifications = async (req, res) => {
    try {
        const notifications = await Notification.find().sort({ timestamp: -1 }).limit(50);
        res.status(200).json({ notifications });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch notifications' });
    }
};

exports.markAllNotificationsRead = async (req, res) => {
    try {
        await Notification.updateMany({ isRead: false }, { isRead: true });
        res.status(200).json({ message: 'All notifications marked as read' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update notifications' });
    }
};

exports.deleteEventRecords = async (req, res) => {
    try {
        const { adminId } = req.params;
        const event = await Event.findOne({ adminId });
        
        if (!event) {
            return res.status(404).json({ error: 'Event not found' });
        }

        const Registration = require('../models/Registration');
        
        // Delete from MongoDB
        const deleteResult = await Registration.deleteMany({ eventId: event.eventId });

        // Clear Google Sheet (Fail Gracefully)
        try {
            const columns = ['Scholar ID', 'Name', 'Mobile', 'Email', 'Course', 'Semester', 'Attendance', 'Timestamp'];
            await googleSheetsService.clearSheetTab(event.spreadsheetId, event.sheetName, columns);
        } catch (sheetError) {
            console.error('Google Sheets clear failed, but deleted from MongoDB:', sheetError.message);
        }

        res.status(200).json({ message: `Successfully deleted ${deleteResult.deletedCount} records.` });
    } catch (error) {
        console.error('Error deleting event records:', error);
        res.status(500).json({ error: 'Failed to delete event records' });
    }
};

exports.deleteSingleRecord = async (req, res) => {
    try {
        const { adminId, scholarId } = req.params;
        const event = await Event.findOne({ adminId });
        if (!event) return res.status(404).json({ error: 'Event not found' });

        const Registration = require('../models/Registration');
        await Registration.deleteOne({ eventId: event.eventId, scholarId });

        try {
            await googleSheetsService.deleteRegistrationRow(event.spreadsheetId, event.sheetName, scholarId);
        } catch (sheetError) {
            console.error('Google Sheets delete failed, but deleted from MongoDB:', sheetError.message);
        }

        res.status(200).json({ message: `Successfully deleted record for ${scholarId}` });
    } catch (error) {
        console.error('Error deleting single record:', error);
        res.status(500).json({ error: 'Failed to delete record' });
    }
};

exports.addManualRegistration = async (req, res) => {
    try {
        const { adminId } = req.params;
        let { scholarId, name, mobile, email, course, semester } = req.body;
        
        if (!scholarId || !name || !mobile || !email || !course || !semester) {
            return res.status(400).json({ error: 'All fields are required.' });
        }
        
        scholarId = String(scholarId).trim();

        const event = await Event.findOne({ adminId });
        if (!event) return res.status(404).json({ error: 'Event not found' });

        const Registration = require('../models/Registration');
        const timestamp = new Date().toISOString();

        const d = new Date();
        const yy = String(d.getFullYear()).slice(2);
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        const dateStr = yy + mm + dd;
        const randomCode = Math.floor(10000 + Math.random() * 90000);
        const registrationId = `CSDSVV${randomCode}-${dateStr}`;

        // Save to MongoDB
        await Registration.findOneAndUpdate(
            { eventId: event.eventId, scholarId },
            { registrationId, eventId: event.eventId, scholarId, name, mobile, email, course, semester, attendance: 'Pending', timestamp },
            { upsert: true }
        );

        try {
            const formattedDate = new Date().toISOString().split('T')[0];
            const rowData = [scholarId, name, mobile, email, course, semester, registrationId, formattedDate, event.eventName, event.venue || 'Main Venue', event.time || '10:00 AM', 'Pending'];
            await googleSheetsService.appendRegistrationRow(event.spreadsheetId, event.sheetName, rowData);
        } catch (sheetError) {
            console.error('Google Sheets append failed, but saved to MongoDB:', sheetError.message);
        }

        res.status(201).json({ message: 'Registration added manually successfully.' });
    } catch (error) {
        console.error('Error adding manual registration:', error);
        res.status(500).json({ error: 'Failed to add registration' });
    }
};

exports.verifyRegistration = async (req, res) => {
    try {
        const { searchId } = req.body;
        if (!searchId) return res.status(400).json({ error: 'ID is required' });

        const Registration = require('../models/Registration');
        
        // Priority 1: Check by Scholar ID
        let reg = await Registration.findOne({ 
            scholarId: { $regex: new RegExp('^' + String(searchId).trim() + '$', 'i') } 
        });

        // Priority 2: Fallback to Registration ID
        if (!reg) {
            reg = await Registration.findOne({
                registrationId: { $regex: new RegExp('^' + String(searchId).trim() + '$', 'i') }
            });
        }

        if (!reg) {
            return res.status(404).json({ error: 'Registration not found' });
        }

        // Update attendance to Present
        if (reg.attendance !== 'Present') {
            reg.attendance = 'Present';
            await reg.save();

            // Also update Google Sheet (requires event lookup)
            const event = await Event.findOne({ eventId: reg.eventId });
            if (event) {
                // Find and update row
                const records = await googleSheetsService.getRegistrations(event.spreadsheetId, event.sheetName);
                const sId = String(searchId).trim().toLowerCase();
                const rowIndex = records.findIndex(r => 
                    String(r[0]).trim().toLowerCase() === sId || 
                    String(r[6]).trim().toLowerCase() === sId
                );
                
                if (rowIndex > 0) {
                    // Update QR Status column (index 11, column L)
                    const range = `${event.sheetName}!L${rowIndex + 1}`;
                    await googleSheetsService.updateCell(event.spreadsheetId, range, 'Present');
                }
            }
        }

        res.status(200).json({
            message: 'Check-in Successful',
            registration: reg
        });
    } catch (error) {
        console.error('Error verifying registration:', error);
        res.status(500).json({ error: 'Failed to verify registration' });
    }
};

// Admin Profile Endpoints
exports.getProfile = async (req, res) => {
    try {
        let admin = await Admin.findOne();
        if (!admin) {
            admin = new Admin({
                name: 'Amit Tiwari',
                email: 'amittiwari2236@gmail.com',
                password: 'Scholar@1910',
                designation: 'Super Admin'
            });
            await admin.save();
        }
        res.status(200).json(admin);
    } catch (error) {
        console.error('Error getting profile:', error);
        res.status(500).json({ error: 'Failed to fetch admin profile' });
    }
};

exports.updateProfile = async (req, res) => {
    try {
        let admin = await Admin.findOne();
        if (!admin) {
            admin = new Admin({
                name: 'Amit Tiwari',
                email: 'amittiwari2236@gmail.com',
                password: 'Scholar@1910',
                designation: 'Super Admin'
            });
        }

        const { name, email, phone, department, designation, bio } = req.body;

        if (name !== undefined) admin.name = name;
        if (email !== undefined) admin.email = email;
        if (phone !== undefined) admin.phone = phone;
        if (department !== undefined) admin.department = department;
        if (designation !== undefined) admin.designation = designation;
        if (bio !== undefined) admin.bio = bio;

        if (req.file) {
            const uploadResult = await cloudinaryService.uploadImage(
                req.file.buffer,
                'profiles',
                `admin_avatar_${admin._id}`
            );
            admin.profilePhoto = uploadResult.secure_url;
        }

        await admin.save();
        res.status(200).json({ message: 'Profile updated successfully!', data: admin });
    } catch (error) {
        console.error('Error updating profile:', error);
        res.status(500).json({ error: 'Failed to update admin profile' });
    }
};

// Password Change Verification Loop
exports.requestPasswordChange = async (req, res) => {
    try {
        const { oldPassword, newPassword } = req.body;
        if (!oldPassword || !newPassword) {
            return res.status(400).json({ error: 'Old password and new password are required.' });
        }

        const admin = await Admin.findOne();
        if (!admin) {
            return res.status(404).json({ error: 'Admin not found.' });
        }

        if (admin.password !== oldPassword) {
            return res.status(400).json({ error: 'Incorrect current password.' });
        }

        const crypto = require('crypto');
        const token = crypto.randomBytes(20).toString('hex');

        admin.tempPasswordResetToken = token;
        admin.tempNewPassword = newPassword;
        await admin.save();

        const mailService = require('../services/mailService');
        const confirmUrl = `${req.protocol}://${req.get('host')}/api/admin/confirm-password-change?token=${token}`;

        await mailService.sendPasswordChangeRequestEmail(admin.email, confirmUrl);

        res.status(200).json({ message: 'A verification link has been sent to your registered Gmail address. Please confirm the change from your email.' });
    } catch (error) {
        console.error('Error requesting password change:', error);
        res.status(500).json({ error: 'Failed to request password change.' });
    }
};

exports.confirmPasswordChange = async (req, res) => {
    try {
        const { token } = req.query;
        if (!token) {
            return res.status(400).send('<h1>Error</h1><p>Confirmation token is missing.</p>');
        }

        const admin = await Admin.findOne({ tempPasswordResetToken: token });
        if (!admin) {
            return res.status(400).send('<h1>Error</h1><p>Invalid or expired confirmation link.</p>');
        }

        admin.password = admin.tempNewPassword;
        admin.tempNewPassword = '';
        admin.tempPasswordResetToken = '';
        await admin.save();

        const mailService = require('../services/mailService');
        await mailService.sendPasswordChangedSuccessEmail(admin.email);

        res.status(200).send(`
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Password Updated successfully</title>
                <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap" rel="stylesheet">
                <style>
                    body { font-family: 'Plus Jakarta Sans', sans-serif; background: #020617; color: #cbd5e1; height: 100vh; display: flex; align-items: center; justify-content: center; margin: 0; }
                    .success-card { background: #0f172a; padding: 3rem; border-radius: 16px; border: 1px solid rgba(255,255,255,0.08); text-align: center; max-width: 480px; box-shadow: 0 20px 40px rgba(0,0,0,0.3); }
                    .success-icon { font-size: 4rem; color: #10b981; margin-bottom: 1.5rem; }
                    h1 { font-size: 2rem; color: #ffffff; margin-bottom: 1rem; }
                    p { font-size: 1rem; color: #94a3b8; line-height: 1.6; margin-bottom: 2rem; }
                    .btn { background: #2563eb; color: white; padding: 12px 30px; border-radius: 8px; font-weight: bold; text-decoration: none; display: inline-block; transition: background 0.3s; }
                    .btn:hover { background: #1d4ed8; }
                </style>
            </head>
            <body>
                <div class="success-card">
                    <div class="success-icon">✓</div>
                    <h1>Password Changed!</h1>
                    <p>Your password has been successfully updated in our database. A final confirmation email has been sent. You can now close this tab and log in using your new password.</p>
                    <a href="/index.html" class="btn">Go to Login</a>
                </div>
            </body>
            </html>
        `);
    } catch (error) {
        console.error('Error confirming password change:', error);
        res.status(500).send('<h1>Server Error</h1><p>An error occurred while confirming your password change.</p>');
    }
};

// Notification Deletion Controllers
exports.deleteAllNotifications = async (req, res) => {
    try {
        await Notification.deleteMany({});
        res.status(200).json({ message: 'All notifications deleted successfully.' });
    } catch (error) {
        console.error('Error deleting all notifications:', error);
        res.status(500).json({ error: 'Failed to delete notifications.' });
    }
};

exports.deleteSingleNotification = async (req, res) => {
    try {
        const { id } = req.params;
        await Notification.findByIdAndDelete(id);
        res.status(200).json({ message: 'Notification deleted successfully.' });
    } catch (error) {
        console.error('Error deleting notification:', error);
        res.status(500).json({ error: 'Failed to delete notification.' });
    }
};

exports.requestFeedback = async (req, res) => {
    try {
        const { adminId } = req.params;
        const { theme } = req.body || {};
        const event = await Event.findOne({ adminId });
        if (!event) return res.status(404).json({ error: 'Event not found.' });

        const Registration = require('../models/Registration');
        const presentStudents = await Registration.find({ eventId: event.eventId, attendance: 'Present' });

        if (presentStudents.length === 0) {
            return res.status(400).json({ error: 'No students marked as "Present" for this event.' });
        }

        const mailService = require('../services/mailService');
        
        let sentCount = 0;
        const emailPromises = presentStudents.map(async (student) => {
            try {
                await mailService.sendFeedbackRequestEmail(student, event, 'light');
                sentCount++;
            } catch (err) {
                console.error(`Failed to send feedback email to ${student.email}:`, err.message);
            }
        });

        await Promise.all(emailPromises);

        // Also log to Notification
        const Notification = require('../models/Notification');
        await Notification.create({
            type: 'system',
            title: 'Feedback Requested',
            message: `Feedback requests dispatched to ${sentCount} attendees for ${event.eventName}.`
        });

        // Update tracking stat
        event.feedbackEmailsSent = (event.feedbackEmailsSent || 0) + sentCount;
        await event.save();

        res.status(200).json({ message: 'Feedback requests dispatched', sentCount });
    } catch (error) {
        console.error('Error requesting feedback:', error);
        res.status(500).json({ error: 'Failed to request feedback' });
    }
};
