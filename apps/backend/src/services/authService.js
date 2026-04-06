const User = require('../models/User');
const { generateAccessToken, generateRefreshToken } = require('../utils/tokenGenerator');
const jwt = require('jsonwebtoken');

class AuthService {
    /**
     * Register a new user
     * @param {Object} userData 
     */
    async registerUser(userData) {
        const { name, email, password } = userData;

        const userExists = await User.findOne({ email });
        if (userExists) {
            throw new Error('User already exists');
        }

        const user = await User.create({
            name,
            email,
            password,
        });

        return this._generateAuthResponse(user);
    }

    /**
     * Login user
     * @param {string} email 
     * @param {string} password 
     */
    async loginUser(email, password) {
        const user = await User.findOne({ email }).select('+password');

        if (user && (await user.matchPassword(password))) {
            return this._generateAuthResponse(user);
        } else {
            throw new Error('Invalid email or password');
        }
    }

    /**
     * Refresh Access Token
     * @param {string} refreshToken 
     */
    async refreshAccessToken(token) {
        if (!token) {
            throw new Error('Not authorized, no refresh token');
        }

        try {
            const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
            const user = await User.findById(decoded.id);

            if (!user) {
                throw new Error('Not authorized: User no longer exists');
            }

            return { accessToken: generateAccessToken(user._id) };
        } catch (error) {
            throw new Error('Not authorized, token failed');
        }
    }

    /**
     * Helper to generate tokens and user data
     * @param {Object} user 
     */
    _generateAuthResponse(user) {
        const accessToken = generateAccessToken(user._id);
        const refreshToken = generateRefreshToken(user._id);

        return {
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role
            },
            accessToken,
            refreshToken
        };
    }
}

module.exports = new AuthService();
