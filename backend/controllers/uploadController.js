const multer = require('multer');
const xlsx = require('xlsx');
const pdfParse = require('pdf-parse');
const fs = require('fs');
const googleSheetsService = require('../services/googleSheetsService');
const Event = require('../models/Event');
const Student = require('../models/Student');
const Notification = require('../models/Notification');

// Multer Config
const upload = multer({ dest: 'uploads/' });

exports.uploadMiddleware = upload.single('file');

exports.uploadAndExtract = async (req, res) => {
    try {
        const { adminId } = req.params;
        const adminData = await Event.findOne({ adminId });
        
        if (!adminData || !adminData.spreadsheetId) {
            if (req.file) fs.unlinkSync(req.file.path);
            return res.status(404).json({ error: 'Invalid Event or Admin assigned. Sheet not found.' });
        }

        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const filePath = req.file.path;
        const fileType = req.file.mimetype;
        const ext = req.file.originalname.split('.').pop().toLowerCase();
        
        let extractedData = [];

        // 1. Excel / CSV Parsing
        if (ext === 'xlsx' || ext === 'xls' || ext === 'csv') {
            const workbook = xlsx.readFile(filePath, { cellDates: true });
            const sheetName = workbook.SheetNames[0];
            const sheet = workbook.Sheets[sheetName];
            
            // Read as 2D array
            const rows = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: '' });
            
            if (rows.length > 0) {
                // Find first non-empty row to use as headers
                let headerRowIndex = 0;
                while (headerRowIndex < rows.length && rows[headerRowIndex].filter(String).length === 0) {
                    headerRowIndex++;
                }

                if (headerRowIndex < rows.length) {
                    const headers = rows[headerRowIndex].map(h => String(h).toLowerCase().replace(/[\s_]+/g, ''));
                    
                    // Map headers to indices with fuzzy matching
                    const colMap = {
                        scholarId: headers.findIndex(h => h.includes('id') || h.includes('roll') || h.includes('enroll') || h.includes('scholar')),
                        name: headers.findIndex(h => h.includes('name') || h.includes('student')),
                        mobile: headers.findIndex(h => h.includes('mobile') || h.includes('phone') || h.includes('contact')),
                        email: headers.findIndex(h => h.includes('email') || h.includes('mail')),
                        course: headers.findIndex(h => h.includes('course') || h.includes('program') || h.includes('dept')),
                        semester: headers.findIndex(h => h.includes('sem') || h.includes('year')),
                    };

                    // Fallback to standard order if we absolutely cannot find any expected header
                    if (colMap.scholarId === -1 && colMap.name === -1) {
                        colMap.scholarId = 0;
                        colMap.name = 1;
                        colMap.mobile = 2;
                        colMap.email = 3;
                        colMap.course = 4;
                        colMap.semester = 5;
                        // Don't skip the first row since it's likely data
                    } else {
                        // Skip header row
                        headerRowIndex++;
                    }

                    // Extract data
                    for (let i = headerRowIndex; i < rows.length; i++) {
                        const row = rows[i];
                        if (!row || row.filter(String).length === 0) continue; // Skip completely empty rows
                        
                        const scholarId = colMap.scholarId !== -1 ? String(row[colMap.scholarId] || '').trim() : '';
                        const name = colMap.name !== -1 ? String(row[colMap.name] || '').trim() : '';
                        const mobile = colMap.mobile !== -1 ? String(row[colMap.mobile] || '').trim() : '';
                        const email = colMap.email !== -1 ? String(row[colMap.email] || '').trim() : '';
                        const course = colMap.course !== -1 ? String(row[colMap.course] || '').trim() : '';
                        const semester = colMap.semester !== -1 ? String(row[colMap.semester] || '').trim() : '';
                        
                        // Need at least an ID or a Name to consider it a valid student record
                        if (!scholarId && !name) continue;
                        
                        extractedData.push([
                            scholarId || 'Unknown',
                            name || 'Unknown',
                            mobile || 'N/A',
                            email || 'N/A',
                            course || 'N/A',
                            semester || 'N/A'
                        ]);
                    }
                }
            }
        } 
        // 2. PDF Parsing (Basic text extraction)
        else if (ext === 'pdf') {
            const dataBuffer = fs.readFileSync(filePath);
            const pdfData = await pdfParse(dataBuffer);
            
            const lines = pdfData.text.split('\n').map(l => l.trim()).filter(l => l.length > 10);
            extractedData = lines.map(line => {
                // Split by multiple spaces, tabs, or commas
                const parts = line.split(/\s{2,}|\t|,/).map(p => p.trim()).filter(p => p);
                
                // If it looks like a valid student row (has enough columns), map strictly
                if(parts.length >= 6) {
                    return [
                        parts[0] ? parts[0] : 'Unknown', // Scholar ID
                        parts[1] ? parts[1] : 'Unknown', // Name
                        parts[2] ? parts[2] : 'N/A',     // Mobile
                        parts[3] ? parts[3] : 'N/A',     // Email
                        parts[4] ? parts[4] : 'N/A',     // Course
                        parts[5] ? parts[5] : 'N/A'      // Semester
                    ];
                }
                return null;
            }).filter(row => row !== null);
        } else {
            fs.unlinkSync(filePath);
            return res.status(400).json({ error: 'Unsupported file format. Please upload Excel, CSV, or PDF.' });
        }

        // Clean up uploaded file
        fs.unlinkSync(filePath);

        if (extractedData.length === 0) {
            return res.status(400).json({ error: 'No readable data found in file.' });
        }

        // Filter out those with 'Unknown' scholar IDs
        extractedData = extractedData.filter(row => row[0] !== 'Unknown');

        // 3. Save to MongoDB (Registration collection)
        const Registration = require('../models/Registration');
        
        const registrationDocs = extractedData.map(row => {
            const d = new Date();
            const yy = String(d.getFullYear()).slice(2);
            const mm = String(d.getMonth() + 1).padStart(2, '0');
            const dd = String(d.getDate()).padStart(2, '0');
            const dateStr = yy + mm + dd;
            const randomCode = Math.floor(10000 + Math.random() * 90000);
            
            return {
                registrationId: `CSDSVV${randomCode}-${dateStr}`,
                eventId: adminData.eventId,
                scholarId: String(row[0]).trim(),
                name: row[1],
                mobile: row[2],
                email: row[3],
                course: row[4],
                semester: row[5],
                venue: adminData.venue || 'N/A',
                time: adminData.time || 'N/A',
                attendance: 'Pending',
                timestamp: new Date().toISOString()
            };
        });
        
        // Upsert registrations based on eventId and scholarId
        const bulkOps = registrationDocs.map(reg => ({
            updateOne: {
                filter: { eventId: reg.eventId, scholarId: reg.scholarId },
                update: { $set: reg },
                upsert: true
            }
        }));
        
        await Registration.bulkWrite(bulkOps);

        // 4. Append to Google Sheet in bulk
        // Format: ['Scholar ID', 'Name', 'Mobile', 'Email', 'Course', 'Semester', 'Registration ID', 'Date', 'Event Name', 'QR Status']
        const formattedDate = new Date().toISOString().split('T')[0];
        const values = registrationDocs.map((reg, idx) => [
            reg.scholarId, 
            reg.name, 
            reg.mobile, 
            reg.email, 
            reg.course, 
            reg.semester, 
            reg.registrationId, 
            formattedDate, 
            adminData.eventName, 
            adminData.venue || 'N/A',
            adminData.time || 'N/A',
            'Pending'
        ]);
        await googleSheetsService.appendBulkRows(adminData.spreadsheetId, adminData.sheetName, values);

        // 5. Create System Notification
        await Notification.create({
            type: 'import',
            title: 'New Student Data Imported',
            message: `${extractedData.length} students imported into the system.`
        });

        res.status(200).json({
            message: `Successfully extracted and saved ${extractedData.length} student records to DB and Google Sheets.`,
            count: extractedData.length
        });

    } catch (error) {
        console.error('File extraction error:', error);
        if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        res.status(500).json({ error: 'Failed to process file' });
    }
};
