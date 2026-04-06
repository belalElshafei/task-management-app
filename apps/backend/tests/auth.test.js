const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const { generateAccessToken } = require('../src/utils/tokenGenerator');

// Set env vars for test
process.env.JWT_ACCESS_SECRET = 'testsecret';
process.env.JWT_REFRESH_SECRET = 'refreshtestsecret';

describe('Auth Utilities', () => {
    it('should generate a valid JWT access token', () => {
        const userId = new mongoose.Types.ObjectId();
        const token = generateAccessToken(userId);
        expect(token).toBeDefined();
        // Decode
        const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
        expect(decoded.id).toBe(userId.toString());
    });
});
