const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const pattaRoutes = require('./routes/patta');
const ngoRoutes = require('./routes/ngo');
const assignmentRoutes = require('./routes/assignment');
const policyRoutes = require('./routes/policy');

const app = express();

// Middleware
app.use(cors({
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.static(path.join(__dirname, '../frontend')));

// Database connection
const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/fra_patta_db', {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log(`MongoDB Connected: ${conn.connection.host}`);
        
        // Create default ministry user if not exists
        await createDefaultUsers();
    } catch (error) {
        console.error('Database connection error:', error);
        process.exit(1);
    }
};

// Create default users
const createDefaultUsers = async () => {
    try {
        const User = require('./models/User');
        
        // Check if ministry user exists
        const ministryUser = await User.findOne({ email: 'ministry@fra.gov.in' });
        if (!ministryUser) {
            const newMinistryUser = new User({
                email: 'ministry@fra.gov.in',
                password: 'admin123', // This will be hashed by pre-save middleware
                role: 'ministry',
                isApproved: true,
                profile: {
                    name: 'Ministry Official',
                    organization: 'Ministry of Tribal Affairs',
                    district: 'Delhi'
                }
            });
            await newMinistryUser.save();
            console.log('Default ministry user created: ministry@fra.gov.in / admin123');
        }
    } catch (error) {
        console.error('Error creating default users:', error);
    }
};

// Connect to database
connectDB();

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/patta', pattaRoutes);
app.use('/api/ngo', ngoRoutes);
app.use('/api/assignment', assignmentRoutes);
app.use('/api/policy', policyRoutes);

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Error:', error);
    res.status(error.status || 500).json({
        message: error.message || 'Internal server error',
        ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    });
});

// Serve frontend for all non-API routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Frontend URL: http://localhost:${PORT}`);
    console.log(`API URL: http://localhost:${PORT}/api`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
    console.log('Unhandled Promise Rejection:', err.message);
    process.exit(1);
});
