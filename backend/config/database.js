const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/fra_patta_db', {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });

        console.log(`MongoDB Connected: ${conn.connection.host}`);
        
        // Create indexes for better performance
        await createIndexes();
    } catch (error) {
        console.error('Database connection error:', error);
        process.exit(1);
    }
};

const createIndexes = async () => {
    try {
        const User = require('../models/User');
        const Patta = require('../models/Patta');
        const NGO = require('../models/NGO');
        
        // Create indexes
        await User.createIndexes();
        await Patta.createIndexes();
        await NGO.createIndexes();
        
        console.log('Database indexes created successfully');
    } catch (error) {
        console.error('Error creating indexes:', error);
    }
};

module.exports = connectDB;