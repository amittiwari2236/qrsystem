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
    } catch (error) {
        console.error("❌ MongoDB connection failed:", error.message);
        process.exit(1);
    }
};

module.exports = connectDB;
