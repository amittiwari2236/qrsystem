const nodemailer = require('nodemailer');

// Create transporter with Gmail SMTP configuration
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false, // Use TLS
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
});

// Send welcome email to user
exports.sendUserWelcomeEmail = async (registration, eventData) => {
    try {
        if (!registration.email) {
            console.warn('User email not available, skipping welcome email');
            return false;
        }

        const mailOptions = {
            from: process.env.MAIL_FROM || process.env.SMTP_USER,
            to: registration.email,
            subject: `Thank You for Registration - ${eventData.eventName}`,
            html: `
                <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                    <div style="max-width: 600px; margin: 0 auto; border: 1px solid #ddd; border-radius: 8px; overflow: hidden;">
                        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center;">
                            <h1 style="margin: 0; font-size: 28px;">Registration Confirmed!</h1>
                        </div>
                        <div style="padding: 30px;">
                            <p style="margin-bottom: 20px;">Dear <strong>${registration.name}</strong>,</p>
                            
                            <p style="margin-bottom: 20px;">
                                Thank you for registering for <strong>${eventData.eventName}</strong>! 
                                We're excited to have you join us.
                            </p>

                            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 6px; margin: 20px 0;">
                                <h3 style="margin-top: 0; color: #667eea;">Event Details</h3>
                                <table style="width: 100%; border-collapse: collapse;">
                                    <tr>
                                        <td style="padding: 10px; font-weight: bold; color: #555;">Event:</td>
                                        <td style="padding: 10px;">${eventData.eventName}</td>
                                    </tr>
                                    <tr style="background-color: #fff;">
                                        <td style="padding: 10px; font-weight: bold; color: #555;">Date:</td>
                                        <td style="padding: 10px;">${eventData.date}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 10px; font-weight: bold; color: #555;">Time:</td>
                                        <td style="padding: 10px;">${eventData.time}</td>
                                    </tr>
                                    <tr style="background-color: #fff;">
                                        <td style="padding: 10px; font-weight: bold; color: #555;">Venue:</td>
                                        <td style="padding: 10px;">${eventData.venue}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 10px; font-weight: bold; color: #555;">Scholar ID:</td>
                                        <td style="padding: 10px;">${registration.scholarId}</td>
                                    </tr>
                                    <tr style="background-color: #fff;">
                                        <td style="padding: 10px; font-weight: bold; color: #555;">Registration ID:</td>
                                        <td style="padding: 10px;">${registration.registrationId}</td>
                                    </tr>
                                </table>
                            </div>

                            <p style="margin-top: 20px; margin-bottom: 10px;">
                                Please make sure to arrive on time. If you have any questions, feel free to contact the event organizer.
                            </p>

                            <p style="margin-top: 20px; color: #666; font-size: 14px;">
                                Best regards,<br/>
                                <strong>${eventData.eventName} Team</strong>
                            </p>
                        </div>
                        <div style="background-color: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 12px;">
                            <p style="margin: 0;">© ${new Date().getFullYear()} Event Management System. All rights reserved.</p>
                        </div>
                    </div>
                </div>
            `
        };

        await transporter.sendMail(mailOptions);
        console.log("Welcome email sent to " + registration.email);
        return true;
    } catch (error) {
        console.error('Error sending welcome email:', error.message);
        return false;
    }
};

exports.sendFeedbackRequestEmail = async (student, eventData, theme = 'dark') => {
    try {
        if (!student.email) return false;

        const feedbackUrl = `http://localhost:4000/?eventId=${encodeURIComponent(eventData.adminId)}&eventName=${encodeURIComponent(eventData.eventName)}&scholarId=${encodeURIComponent(student.scholarId)}&studentName=${encodeURIComponent(student.name)}&course=${encodeURIComponent(student.course)}&semester=${encodeURIComponent(student.semester)}&theme=${encodeURIComponent(theme)}`;

        const isLight = theme === 'light';
        const bgColor = isLight ? '#f8fafc' : '#020617';
        const cardBg = isLight ? '#ffffff' : '#0f172a';
        const textColor = isLight ? '#334155' : '#f8fafc';
        const mutedColor = isLight ? '#64748b' : '#94a3b8';
        const borderColor = isLight ? '#e2e8f0' : 'rgba(255,255,255,0.1)';
        const headerBg = isLight ? '#ffffff' : 'linear-gradient(135deg, #1e293b, #0f172a)';
        const headerText = isLight ? '#0f172a' : '#ffffff';

        const mailOptions = {
            from: `"DSVV Events Team" <${process.env.SMTP_USER}>`,
            to: student.email,
            subject: `Feedback Requested: ${eventData.eventName}`,
            html: `
                <div style="font-family: 'Arial', sans-serif; background-color: ${bgColor}; padding: 20px;">
                    <div style="max-width: 600px; margin: 0 auto; background: ${cardBg}; padding: 0; border: 1px solid ${borderColor}; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
                        <div style="background: ${headerBg}; padding: 40px 20px; text-align: center; border-bottom: 4px solid #0284c7;">
                            <img src="https://www.addressguru.in/images/1801593532.png" alt="DSVV Logo" style="height: 70px; margin-bottom: 20px;">
                            <h1 style="color: ${headerText}; font-size: 24px; margin: 0; font-weight: 700; letter-spacing: -0.5px;">We Value Your Feedback</h1>
                        </div>
                        
                        <div style="padding: 40px 30px;">
                            <p style="color: ${textColor}; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">Dear <strong>${student.name}</strong>,</p>
                            
                            <p style="color: ${textColor}; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
                                Thank you for attending <strong>${eventData.eventName}</strong>. We hope you found the session valuable and informative. Your feedback is extremely important to us and helps us improve future sessions.
                            </p>

                            <div style="text-align: center; margin: 40px 0;">
                                <a href="${feedbackUrl}" style="background-color: #0284c7; color: #ffffff; padding: 14px 32px; font-size: 16px; font-weight: 600; text-decoration: none; border-radius: 8px; display: inline-block; box-shadow: 0 4px 6px rgba(2, 132, 199, 0.25);">Submit Feedback</a>
                            </div>
                            
                            <p style="color: ${mutedColor}; font-size: 14px; line-height: 1.6; margin-top: 30px; border-top: 1px solid ${borderColor}; padding-top: 20px;">
                                Best Regards,<br>
                                <strong>DSVV Event Management Team</strong>
                            </p>
                        </div>
                    </div>
                </div>
            `
        };

        await transporter.sendMail(mailOptions);
        console.log(`Feedback email sent to ${student.email} with theme ${theme}`);
        return true;
    } catch (error) {
        console.error('Failed to send feedback email:', error);
        return false;
    }
};

// Send admin notification email with registration details in table format
exports.sendAdminNotificationEmail = async (registration, eventData) => {
    try {
        const adminEmail = process.env.ADMIN_EMAIL;
        if (!adminEmail) {
            console.warn('Admin email not configured, skipping admin notification');
            return false;
        }

        const registrationDate = new Date(registration.timestamp || Date.now()).toLocaleString('en-IN');

        const mailOptions = {
            from: process.env.MAIL_FROM || process.env.SMTP_USER,
            to: adminEmail,
            subject: `New Registration: ${registration.scholarId} - ${eventData.eventName}`,
            html: `
                <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                    <div style="max-width: 700px; margin: 0 auto; border: 1px solid #ddd; border-radius: 8px; overflow: hidden;">
                        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center;">
                            <h1 style="margin: 0; font-size: 28px;">New Registration Received</h1>
                        </div>
                        <div style="padding: 30px;">
                            <p style="margin-bottom: 20px;">
                                A new participant has registered for <strong>${eventData.eventName}</strong>.
                            </p>

                            <h3 style="margin-top: 25px; margin-bottom: 15px; color: #667eea; border-bottom: 2px solid #667eea; padding-bottom: 10px;">
                                Registration Details
                            </h3>

                            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                                <thead>
                                    <tr style="background-color: #667eea; color: white;">
                                        <th style="padding: 12px; text-align: left; border: 1px solid #ddd;">Field</th>
                                        <th style="padding: 12px; text-align: left; border: 1px solid #ddd;">Value</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr style="background-color: #f8f9fa;">
                                        <td style="padding: 12px; border: 1px solid #ddd; font-weight: bold;">Scholar ID</td>
                                        <td style="padding: 12px; border: 1px solid #ddd;">${registration.scholarId}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 12px; border: 1px solid #ddd; font-weight: bold;">Full Name</td>
                                        <td style="padding: 12px; border: 1px solid #ddd;">${registration.name}</td>
                                    </tr>
                                    <tr style="background-color: #f8f9fa;">
                                        <td style="padding: 12px; border: 1px solid #ddd; font-weight: bold;">Email</td>
                                        <td style="padding: 12px; border: 1px solid #ddd;">
                                            <a href="mailto:${registration.email}" style="color: #667eea; text-decoration: none;">
                                                ${registration.email}
                                            </a>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 12px; border: 1px solid #ddd; font-weight: bold;">Mobile</td>
                                        <td style="padding: 12px; border: 1px solid #ddd;">${registration.mobile}</td>
                                    </tr>
                                    <tr style="background-color: #f8f9fa;">
                                        <td style="padding: 12px; border: 1px solid #ddd; font-weight: bold;">Course</td>
                                        <td style="padding: 12px; border: 1px solid #ddd;">${registration.course}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 12px; border: 1px solid #ddd; font-weight: bold;">Semester</td>
                                        <td style="padding: 12px; border: 1px solid #ddd;">${registration.semester}</td>
                                    </tr>
                                    <tr style="background-color: #f8f9fa;">
                                        <td style="padding: 12px; border: 1px solid #ddd; font-weight: bold;">Registration ID</td>
                                        <td style="padding: 12px; border: 1px solid #ddd;">
                                            <strong>${registration.registrationId}</strong>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 12px; border: 1px solid #ddd; font-weight: bold;">Attendance Status</td>
                                        <td style="padding: 12px; border: 1px solid #ddd;">
                                            <span style="background-color: #d4edda; color: #155724; padding: 5px 10px; border-radius: 4px; font-weight: bold;">
                                                ${registration.attendance}
                                            </span>
                                        </td>
                                    </tr>
                                    <tr style="background-color: #f8f9fa;">
                                        <td style="padding: 12px; border: 1px solid #ddd; font-weight: bold;">Registration Time</td>
                                        <td style="padding: 12px; border: 1px solid #ddd;">${registrationDate}</td>
                                    </tr>
                                </tbody>
                            </table>

                            <h3 style="margin-top: 25px; margin-bottom: 15px; color: #667eea; border-bottom: 2px solid #667eea; padding-bottom: 10px;">
                                Event Information
                            </h3>

                            <table style="width: 100%; border-collapse: collapse;">
                                <tbody>
                                    <tr style="background-color: #f8f9fa;">
                                        <td style="padding: 12px; border: 1px solid #ddd; font-weight: bold; width: 30%;">Event Name</td>
                                        <td style="padding: 12px; border: 1px solid #ddd;">${eventData.eventName}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 12px; border: 1px solid #ddd; font-weight: bold;">Event Date</td>
                                        <td style="padding: 12px; border: 1px solid #ddd;">${eventData.date}</td>
                                    </tr>
                                    <tr style="background-color: #f8f9fa;">
                                        <td style="padding: 12px; border: 1px solid #ddd; font-weight: bold;">Event Time</td>
                                        <td style="padding: 12px; border: 1px solid #ddd;">${eventData.time}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 12px; border: 1px solid #ddd; font-weight: bold;">Venue</td>
                                        <td style="padding: 12px; border: 1px solid #ddd;">${eventData.venue}</td>
                                    </tr>
                                    <tr style="background-color: #f8f9fa;">
                                        <td style="padding: 12px; border: 1px solid #ddd; font-weight: bold;">Organizer</td>
                                        <td style="padding: 12px; border: 1px solid #ddd;">${eventData.adminName}</td>
                                    </tr>
                                </tbody>
                            </table>

                            <p style="margin-top: 25px; color: #666; font-size: 14px;">
                                This is an automated notification. Please do not reply to this email.
                            </p>
                        </div>
                        <div style="background-color: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 12px;">
                            <p style="margin: 0;">© ${new Date().getFullYear()} Event Management System. All rights reserved.</p>
                        </div>
                    </div>
                </div>
            `
        };

        await transporter.sendMail(mailOptions);
        console.log(`✓ Admin notification email sent for registration ${registration.scholarId}`);
        return true;
    } catch (error) {
        console.error('Error sending admin notification email:', error.message);
        return false;
    }
};

// Send 24-hour reminder email
exports.send24HourReminderEmail = async (registration, eventData) => {
    try {
        if (!registration.email) {
            console.warn('User email not available, skipping 24-hour reminder email');
            return false;
        }

        const mailOptions = {
            from: process.env.MAIL_FROM || process.env.SMTP_USER,
            to: registration.email,
            subject: `📢 Reminder: ${eventData.eventName} Starts in Next 24 Hours!`,
            html: `
                <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                    <div style="max-width: 600px; margin: 0 auto; border: 1px solid #ddd; border-radius: 8px; overflow: hidden;">
                        <div style="background: linear-gradient(135deg, #FF6B6B 0%, #FFD93D 100%); color: white; padding: 30px; text-align: center;">
                            <h1 style="margin: 0; font-size: 28px;">📢 Reminder: Your Event Starts in Next 24 Hours!</h1>
                        </div>
                        <div style="padding: 30px;">
                            <p style="margin-bottom: 20px; font-size: 16px;">🎉 Hello <strong>${registration.name}</strong>,</p>
                            
                            <p style="margin-bottom: 20px; font-size: 15px;">
                                Thank you for registering for <strong>${eventData.eventName}</strong>. 
                                ⏰ Your event will begin in the <strong>next 24 hours</strong>, so please take some time out of your busy schedule and make sure to attend.
                            </p>

                            <div style="background-color: #fff3cd; padding: 20px; border-left: 4px solid #FFD93D; border-radius: 4px; margin: 20px 0;">
                                <h3 style="margin-top: 0; color: #FF6B6B;">📍 Event Details</h3>
                                <table style="width: 100%; border-collapse: collapse;">
                                    <tr>
                                        <td style="padding: 10px; font-weight: bold; color: #555;">📍 Venue:</td>
                                        <td style="padding: 10px;">${eventData.venue}</td>
                                    </tr>
                                    <tr style="background-color: #fffbf0;">
                                        <td style="padding: 10px; font-weight: bold; color: #555;">🕒 Time:</td>
                                        <td style="padding: 10px;">${eventData.time}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 10px; font-weight: bold; color: #555;">📅 Date:</td>
                                        <td style="padding: 10px;">${eventData.date}</td>
                                    </tr>
                                </table>
                            </div>

                            <p style="margin-top: 20px; font-size: 15px;">
                                We look forward to your presence 😊✨
                            </p>

                            <hr style="border: none; border-top: 1px solid #ddd; margin: 25px 0;">

                            <p style="margin-top: 15px; color: #666; font-size: 12px; text-align: center;">
                                ⚠️ <strong>This is a system generated mail, so please don't reply.</strong><br/>
                                If you have any query, contact <strong>Computer Science Department, DSVV</strong>.
                            </p>
                        </div>
                        <div style="background-color: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 12px;">
                            <p style="margin: 0;">© ${new Date().getFullYear()} Event Management System. All rights reserved.</p>
                        </div>
                    </div>
                </div>
            `
        };

        await transporter.sendMail(mailOptions);
        console.log(`✓ 24-hour reminder email sent to ${registration.email}`);
        return true;
    } catch (error) {
        console.error('Error sending 24-hour reminder email:', error.message);
        return false;
    }
};

// Send 1-hour reminder email
exports.send1HourReminderEmail = async (registration, eventData) => {
    try {
        if (!registration.email) {
            console.warn('User email not available, skipping 1-hour reminder email');
            return false;
        }

        const mailOptions = {
            from: process.env.MAIL_FROM || process.env.SMTP_USER,
            to: registration.email,
            subject: `🚨 Reminder: ${eventData.eventName} Starts in Next 1 Hour!`,
            html: `
                <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                    <div style="max-width: 600px; margin: 0 auto; border: 1px solid #ddd; border-radius: 8px; overflow: hidden;">
                        <div style="background: linear-gradient(135deg, #FF6B6B 0%, #FF1744 100%); color: white; padding: 30px; text-align: center;">
                            <h1 style="margin: 0; font-size: 28px;">🚨 Reminder: Your Event Starts in Next 1 Hour!</h1>
                        </div>
                        <div style="padding: 30px;">
                            <p style="margin-bottom: 20px; font-size: 16px;">🎊 Hello <strong>${registration.name}</strong>,</p>
                            
                            <p style="margin-bottom: 20px; font-size: 15px;">
                                ⏳ The event you registered for is starting in the <strong>next 1 hour</strong>. 
                                Please be prepared and make sure that you will be present in the event 💼✨
                            </p>

                            <div style="background-color: #ffebee; padding: 20px; border-left: 4px solid #FF1744; border-radius: 4px; margin: 20px 0;">
                                <h3 style="margin-top: 0; color: #FF6B6B;">📍 Event Details</h3>
                                <table style="width: 100%; border-collapse: collapse;">
                                    <tr>
                                        <td style="padding: 10px; font-weight: bold; color: #555;">📍 Venue:</td>
                                        <td style="padding: 10px;">${eventData.venue}</td>
                                    </tr>
                                    <tr style="background-color: #fff5f5;">
                                        <td style="padding: 10px; font-weight: bold; color: #555;">🕒 Time:</td>
                                        <td style="padding: 10px;">${eventData.time}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 10px; font-weight: bold; color: #555;">📅 Date:</td>
                                        <td style="padding: 10px;">${eventData.date}</td>
                                    </tr>
                                </table>
                            </div>

                            <hr style="border: none; border-top: 1px solid #ddd; margin: 25px 0;">

                            <p style="margin-top: 15px; color: #666; font-size: 12px; text-align: center;">
                                ⚠️ <strong>This is a system generated mail, so please don't reply.</strong><br/>
                                If you have any query, contact <strong>Computer Science Department, DSVV</strong>.
                            </p>
                        </div>
                        <div style="background-color: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 12px;">
                            <p style="margin: 0;">© ${new Date().getFullYear()} Event Management System. All rights reserved.</p>
                        </div>
                    </div>
                </div>
            `
        };

        await transporter.sendMail(mailOptions);
        console.log(`✓ 1-hour reminder email sent to ${registration.email}`);
        return true;
    } catch (error) {
        console.error('Error sending 1-hour reminder email:', error.message);
        return false;
    }
};

// Verify transporter connection on startup
exports.verifyTransporter = async () => {
    try {
        await transporter.verify();
        console.log('✓ Mail transporter verified successfully');
        return true;
    } catch (error) {
        console.error('✗ Mail transporter verification failed:', error.message);
        console.warn('⚠ Email service may not work. Check SMTP credentials in .env');
        return false;
    }
};

// Send password change request email with confirm button
exports.sendPasswordChangeRequestEmail = async (adminEmail, confirmUrl) => {
    try {
        const mailOptions = {
            from: process.env.MAIL_FROM || process.env.SMTP_USER,
            to: adminEmail,
            subject: 'Password Change Confirmation',
            html: `
                <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                    <div style="max-width: 600px; margin: 0 auto; border: 1px solid #ddd; border-radius: 8px; overflow: hidden;">
                        <div style="background: linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%); color: white; padding: 30px; text-align: center;">
                            <h1 style="margin: 0; font-size: 28px;">Password Change Request</h1>
                        </div>
                        <div style="padding: 30px; text-align: center;">
                            <p style="font-size: 16px; margin-bottom: 20px; text-align: left;">Dear Administrator,</p>
                            <p style="font-size: 15px; margin-bottom: 25px; text-align: left;">
                                We received a request to change the password for your Admin account. Was this you?
                            </p>
                            
                            <div style="margin: 30px 0;">
                                <a href="${confirmUrl}" style="background: #1e3a8a; color: white; padding: 12px 30px; border-radius: 8px; font-weight: bold; text-decoration: none; display: inline-block; box-shadow: 0 4px 15px rgba(30, 58, 138, 0.3);">
                                    Confirm Password Change
                                </a>
                            </div>

                            <p style="font-size: 13px; color: #666; margin-top: 30px; text-align: left;">
                                If you did not make this request, please ignore this email. Your password will remain unchanged and active.
                            </p>
                            <hr style="border: none; border-top: 1px solid #ddd; margin: 25px 0;">
                            <p style="color: #888; font-size: 11px;">
                                This is an automated email. Please do not reply to this message.
                            </p>
                        </div>
                    </div>
                </div>
            `
        };
        await transporter.sendMail(mailOptions);
        console.log("Password reset request email sent to " + adminEmail);
        return true;
    } catch (error) {
        console.error('Error sending password reset request email:', error.message);
        return false;
    }
};

// Send password changed success email
exports.sendPasswordChangedSuccessEmail = async (adminEmail) => {
    try {
        const mailOptions = {
            from: process.env.MAIL_FROM || process.env.SMTP_USER,
            to: adminEmail,
            subject: 'Password Changed Successfully',
            html: `
                <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                    <div style="max-width: 600px; margin: 0 auto; border: 1px solid #ddd; border-radius: 8px; overflow: hidden;">
                        <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; text-align: center;">
                            <h1 style="margin: 0; font-size: 28px;">Password Updated Successfully</h1>
                        </div>
                        <div style="padding: 30px;">
                            <p style="font-size: 16px; margin-bottom: 20px;">Dear Administrator,</p>
                            <p style="font-size: 15px; margin-bottom: 20px;">
                                Your admin password has been successfully changed.
                            </p>
                            <p style="font-size: 15px; color: #ef4444; font-weight: bold; margin-bottom: 20px;">
                                You can now log in using your new password.
                            </p>
                            <hr style="border: none; border-top: 1px solid #ddd; margin: 25px 0;">
                            <p style="color: #888; font-size: 11px;">
                                This is an automated security email. Please do not reply to this message.
                            </p>
                        </div>
                    </div>
                </div>
            `
        };
        await transporter.sendMail(mailOptions);
        console.log("Password changed success email sent to " + adminEmail);
        return true;
    } catch (error) {
        console.error('Error sending password changed success email:', error.message);
        return false;
    }
};
