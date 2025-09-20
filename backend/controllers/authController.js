const User = require('../models/User');
const jwt = require('jsonwebtoken');

const generateToken = (userId) => {
    return jwt.sign({ userId }, process.env.JWT_SECRET || 'fallback_secret', {
        expiresIn: '7d'
    });
};

exports.login = async (req, res) => {
    try {
        const { email, password, role } = req.body;

        const user = await User.findOne({ email, role });
        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        if (!user.isApproved && user.role === 'ngo') {
            return res.status(401).json({ message: 'Account pending approval' });
        }

        const isPasswordValid = await user.comparePassword(password);
        if (!isPasswordValid) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const token = generateToken(user._id);
        
        res.json({
            token,
            user: {
                id: user._id,
                email: user.email,
                role: user.role,
                profile: user.profile
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

exports.register = async (req, res) => {
    try {
        const { email, password, role, profile } = req.body;

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists' });
        }

        const user = new User({
            email,
            password,
            role,
            profile
        });

        await user.save();

        res.status(201).json({ message: 'Registration successful. Awaiting approval.' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};