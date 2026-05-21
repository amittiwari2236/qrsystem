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
        console.log(`✓ Welcome email sent to ${registration.email}`);
        return true;
    } catch (error) {
        console.error('Error sending welcome email:', error.message);
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
