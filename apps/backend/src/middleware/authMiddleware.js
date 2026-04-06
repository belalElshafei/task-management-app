const jwt = require('jsonwebtoken');
const User = require('../models/User');

const logger = require('../utils/logger');

const protect = async (req, res, next) => {
    let token;

    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    ) {
        // Get token from header
        token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies && req.cookies.token) {
        // Get token from cookie
        token = req.cookies.token;
    }

    if (!token) {
        res.status(401);
        throw new Error('Not authorized, no token');
    }

    try {
        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);

        // Get user from token
        req.user = await User.findById(decoded.id).select('-password');

        if (!req.user) {
            res.clearCookie('token');
            res.clearCookie('refreshToken');
            res.status(401);
            throw new Error('User not found');
        }

        next();
    } catch (error) {
        logger.error(`Auth Error: ${error.message}`);
        res.clearCookie('token');
        res.clearCookie('refreshToken');
        res.status(401);
        throw new Error('Not authorized, token failed');
    }
};

// Admin middleware
const admin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        res.status(403);
        throw new Error('Not authorized as admin');
    }
};

module.exports = { protect, admin };