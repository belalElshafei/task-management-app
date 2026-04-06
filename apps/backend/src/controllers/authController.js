const { matchedData } = require('express-validator');
const authService = require('../services/authService');
const logger = require('../utils/logger');

// Helper to set cookie and send response
const sendTokenResponse = (authData, statusCode, req, res) => {
    const { user, accessToken, refreshToken } = authData;

    // Intelligent Secure flag
    const host = req.headers.host || '';
    const isLocal = host.includes('localhost') || host.includes('127.0.0.1');
    const isSecure = process.env.NODE_ENV === 'production' && !isLocal;

    const options = {
        httpOnly: true,
        secure: isSecure,
        sameSite: 'strict',
    };

    const refreshOptions = {
        ...options,
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    };

    const accessOptions = {
        ...options,
        maxAge: 1 * 60 * 60 * 1000, // 1 hour (align with your JWT expiry)
    };

    res.status(statusCode)
        .cookie('refreshToken', refreshToken, refreshOptions)
        .cookie('token', accessToken, accessOptions)
        .json({
            success: true,
            data: {
                ...user,
                accessToken
            }
        });
};

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
const register = async (req, res) => {
    const userData = matchedData(req, { locations: ['body'] });
    const authData = await authService.registerUser(userData);
    sendTokenResponse(authData, 201, req, res);
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res) => {
    const credentials = matchedData(req, { locations: ['body'] });
    const authData = await authService.loginUser(credentials.email, credentials.password);
    sendTokenResponse(authData, 200, req, res);
};

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res) => {
    const user = req.user.toObject ? req.user.toObject() : { ...req.user };
    user.name = user.name || user.email || 'User';
    res.status(200).json({
        success: true,
        data: user
    });
};

// @desc    Refresh Access Token
// @route   POST /api/auth/refresh
// @access  Public (Cookie based)
const refreshToken = async (req, res) => {
    const { accessToken } = await authService.refreshAccessToken(req.cookies.refreshToken);

    res.status(200).json({
        success: true,
        accessToken
    });
};

// @desc    Logout user / Clear cookie
// @route   POST /api/auth/logout
// @access  Private
const logout = async (req, res) => {
    const host = req.headers.host || '';
    const isLocal = host.includes('localhost') || host.includes('127.0.0.1');
    const isSecure = process.env.NODE_ENV === 'production' && !isLocal;

    res.clearCookie('refreshToken', { httpOnly: true, secure: isSecure, sameSite: 'strict' });
    res.clearCookie('token', { httpOnly: true, secure: isSecure, sameSite: 'strict' });

    logger.info('User logged out successfully');

    res.status(200).json({
        success: true,
        data: {}
    });
};

module.exports = {
    register,
    login,
    getMe,
    refreshToken,
    logout
};