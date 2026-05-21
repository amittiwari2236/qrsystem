const cron = require('node-cron');
const Event = require('../models/Event');
const Registration = require('../models/Registration');
const ReminderLog = require('../models/ReminderLog');
const mailService = require('./mailService');

// Helper function to parse date and time strings into a Date object
const parseEventDateTime = (dateStr, timeStr) => {
    try {
        // dateStr format: "YYYY-MM-DD" or "DD/MM/YYYY"
        // timeStr format: "HH:MM AM/PM" or "HH:MM"
        
        let date;
        if (dateStr.includes('-')) {
            // YYYY-MM-DD format
            date = new Date(dateStr);
        } else if (dateStr.includes('/')) {
            // DD/MM/YYYY format
            const [day, month, year] = dateStr.split('/');
            date = new Date(`${year}-${month}-${day}`);
        } else {
            return null;
        }

        // Parse time
        let hours = 0, minutes = 0;
        if (timeStr) {
            const timeParts = timeStr.match(/(\d+):(\d+)\s*(AM|PM|am|pm)?/);
            if (timeParts) {
                hours = parseInt(timeParts[1]);
                minutes = parseInt(timeParts[2]);
                const period = timeParts[3]?.toUpperCase();
                
                if (period === 'PM' && hours !== 12) {
                    hours += 12;
                } else if (period === 'AM' && hours === 12) {
                    hours = 0;
                }
            }
        }

        date.setHours(hours, minutes, 0, 0);
        return date;
    } catch (error) {
        console.error('Error parsing event date/time:', error.message);
        return null;
    }
};

// Check if a reminder has already been sent
const hasReminderBeenSent = async (registrationId, eventId, reminderType) => {
    try {
        const existingLog = await ReminderLog.findOne({
            registrationId,
            eventId,
            reminderType
        });
        return !!existingLog;
    } catch (error) {
        console.error('Error checking reminder log:', error.message);
        return false;
    }
};

// Log a sent reminder
const logReminder = async (registrationId, eventId, reminderType) => {
    try {
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7); // Keep log for 7 days
        
        await ReminderLog.create({
            registrationId,
            eventId,
            reminderType,
            expiresAt
        });
    } catch (error) {
        console.error('Error logging reminder:', error.message);
    }
};

// Process reminders for a single event
const processEventReminders = async (event) => {
    try {
        const eventDateTime = parseEventDateTime(event.date, event.time);
        if (!eventDateTime) {
            console.warn(`Could not parse date/time for event ${event.eventId}`);
            return;
        }

        const now = new Date();
        const timeUntilEvent = eventDateTime.getTime() - now.getTime();
        const hoursUntilEvent = timeUntilEvent / (1000 * 60 * 60);

        // Get all registrations for this event
        const registrations = await Registration.find({ eventId: event.eventId });

        if (registrations.length === 0) {
            return;
        }

        // 24-hour reminder (within 24-26 hours window)
        if (hoursUntilEvent <= 24 && hoursUntilEvent > 22) {
            for (const registration of registrations) {
                const hasBeenSent = await hasReminderBeenSent(
                    registration._id.toString(),
                    event.eventId,
                    '24h'
                );

                if (!hasBeenSent) {
                    const eventData = {
                        eventName: event.eventName,
                        date: event.date,
                        time: event.time,
                        venue: event.venue
                    };

                    const emailSent = await mailService.send24HourReminderEmail(
                        registration,
                        eventData
                    );

                    if (emailSent) {
                        await logReminder(registration._id.toString(), event.eventId, '24h');
                    }
                }
            }
        }

        // 1-hour reminder (within 1-1.5 hours window)
        if (hoursUntilEvent <= 1.5 && hoursUntilEvent > 0.5) {
            for (const registration of registrations) {
                const hasBeenSent = await hasReminderBeenSent(
                    registration._id.toString(),
                    event.eventId,
                    '1h'
                );

                if (!hasBeenSent) {
                    const eventData = {
                        eventName: event.eventName,
                        date: event.date,
                        time: event.time,
                        venue: event.venue
                    };

                    const emailSent = await mailService.send1HourReminderEmail(
                        registration,
                        eventData
                    );

                    if (emailSent) {
                        await logReminder(registration._id.toString(), event.eventId, '1h');
                    }
                }
            }
        }
    } catch (error) {
        console.error(`Error processing reminders for event:`, error.message);
    }
};

// Main scheduler job
const startReminderScheduler = () => {
    // Run every minute to check for reminders
    const job = cron.schedule('* * * * *', async () => {
        try {
            // Fetch all upcoming events
            const events = await Event.find({ status: 'upcoming' });

            for (const event of events) {
                await processEventReminders(event);
            }
        } catch (error) {
            console.error('Error in reminder scheduler:', error.message);
        }
    });

    console.log('✓ Reminder email scheduler started (runs every minute)');
    return job;
};

module.exports = {
    startReminderScheduler,
    processEventReminders
};
