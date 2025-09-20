const jwt = require('jsonwebtoken');
const User = require('../models/User');
const config = require('../config/config');

const auth = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');

        if (!token) {
            return res.status(401).json({ message: 'Access denied. No token provided.' });
        }

        const decoded = jwt.verify(token, config.jwtSecret);
        const user = await User.findById(decoded.userId).select('-password');

        if (!user) {
            return res.status(401).json({ message: 'Invalid token. User not found.' });
        }

        if (user.role === 'ngo' && !user.isApproved) {
            return res.status(403).json({ message: 'Account not approved yet.' });
        }

        req.user = {
            userId: user._id,
            email: user.email,
            role: user.role,
            profile: user.profile
        };

        next();
    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ message: 'Invalid token.' });
        }
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ message: 'Token expired.' });
        }
        console.error('Auth middleware error:', error);
        res.status(500).json({ message: 'Server error in authentication.' });
    }
};

const authorizeRole = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ message: 'Authentication required.' });
        }

        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ 
                message: `Access denied. Required role: ${roles.join(' or ')}` 
            });
        }

        next();
    };
};

const authorizeMinistry = authorizeRole('ministry');
const authorizeNGO = authorizeRole('ngo');
const authorizeAny = authorizeRole('ministry', 'ngo');

module.exports = {
    auth,
    authorizeRole,
    authorizeMinistry,
    authorizeNGO,
    authorizeAny
};