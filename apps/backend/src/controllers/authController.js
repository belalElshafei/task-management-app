const { matchedData } = require('express-validator');
const authService = require('../services/authService');
const logger = require('../utils/logger');

// Helper to set cookie and send response
const sendTokenResponse = (authData, statusCode, res) => {
    const { user, accessToken, refreshToken } = authData;

    // Cookie options
    const options = {
        httpOnly: true,
        secure: true, // Required for sameSite: 'none'
        sameSite: 'none',
        partitioned: true, // Required for cross-site on public suffixes like Railway
        path: '/',
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
    sendTokenResponse(authData, 201, res);
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res) => {
    const credentials = matchedData(req, { locations: ['body'] });
    const authData = await authService.loginUser(credentials.email, credentials.password);
    sendTokenResponse(authData, 200, res);
};

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res) => {
    res.status(200).json({
        success: true,
        data: req.user
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
    const cookieOptions = {
        httpOnly: true,
        secure: true,
        sameSite: 'none',
        partitioned: true,
        path: '/'
    };
    res.clearCookie('refreshToken', cookieOptions);
    res.clearCookie('token', cookieOptions);

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