const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');
const connectDB = require('./config/db');

dotenv.config({ path: path.resolve(__dirname, '.env') });
require('./config/googleConfig'); // Ensure Google config is loaded

// Connect to MongoDB
connectDB();
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend files
app.use(express.static(path.join(__dirname, '../frontend')));

// Routes
const adminRoutes = require('./routes/adminRoutes');
const apiRoutes = require('./routes/apiRoutes');

app.use('/api/admin', adminRoutes);
app.use('/api/events', apiRoutes);


const http = require('http');
const socketIo = require('socket.io');

const server = http.createServer(app);
const io = socketIo(server, {
    cors: { origin: '*' }
});

// Make io accessible to our router/controllers
app.set('socketio', io);

io.on('connection', (socket) => {
    console.log('New client connected', socket.id);
    socket.on('disconnect', () => {
        console.log('Client disconnected', socket.id);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});
