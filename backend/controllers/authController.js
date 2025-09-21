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

        console.log('Login attempt:', { email, role }); // Debug log

        // Find user by email and role
        const user = await User.findOne({ email, role });
        if (!user) {
            console.log('User not found:', { email, role });
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        console.log('User found:', { email: user.email, role: user.role, isApproved: user.isApproved });

        // Check if NGO user is approved
        if (user.role === 'ngo' && !user.isApproved) {
            return res.status(401).json({ message: 'Account pending approval' });
        }

        // Verify password
        const isPasswordValid = await user.comparePassword(password);
        if (!isPasswordValid) {
            console.log('Invalid password for user:', email);
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        console.log('Login successful for:', email);

        const token = generateToken(user._id);
        
        res.json({
            token,
            user: {
                id: user._id,
                email: user.email,
                role: user.role,
                profile: user.profile,
                isApproved: user.isApproved
            }
        });
    } catch (error) {
        console.error('Login error:', error);
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
            profile,
            isApproved: role === 'ministry' // Auto-approve ministry users
        });

        await user.save();

        res.status(201).json({ 
            message: role === 'ministry' ? 'Registration successful.' : 'Registration successful. Awaiting approval.'
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};
