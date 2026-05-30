const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        if (!process.env.MONGO_URI) {
            console.warn("⚠️ MONGO_URI is missing in .env. Falling back to local MongoDB or skipping persistence depending on setup.");
            // Optional: fallback to local
            // await mongoose.connect('mongodb://localhost:27017/eventSystem');
            return;
        }
        
        await mongoose.connect(process.env.MONGO_URI);
        console.log("✅ MongoDB Connected successfully!");

        // Seed default Admin if not exists
        try {
            const Admin = require('../models/Admin');
            const count = await Admin.countDocuments();
            if (count === 0) {
                const defaultAdmin = new Admin({
                    name: 'Amit Tiwari',
                    email: 'amittiwari2236@gmail.com',
                    password: 'Scholar@1910',
                    designation: 'Super Admin'
                });
                await defaultAdmin.save();
                console.log("✅ Default Super Admin initialized in database.");
            }
        } catch (seedError) {
            console.error("❌ Seeding admin failed:", seedError.message);
        }
    } catch (error) {
        console.error("❌ MongoDB connection failed:", error.message);
        process.exit(1);
    }
};

module.exports = connectDB;
