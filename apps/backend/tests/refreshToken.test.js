const { refreshToken } = require('../src/controllers/authController');
const User = require('../src/models/User');
const jwt = require('jsonwebtoken');
const { generateAccessToken } = require('../src/utils/tokenGenerator');

// Mock dependencies
jest.mock('../src/models/User');
jest.mock('jsonwebtoken');
jest.mock('../src/utils/tokenGenerator');

describe('Refresh Token Controller Scenario', () => {
    let req, res;

    beforeEach(() => {
        req = {
            cookies: {},
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };
        jest.clearAllMocks();
    });

    it('should return 401 if no refresh token is present', async () => {
        await expect(refreshToken(req, res)).rejects.toThrow('Not authorized, no refresh token');
    });

    it('should return 401 if refresh token is invalid', async () => {
        req.cookies.refreshToken = 'invalid_token';
        jwt.verify.mockImplementation(() => { throw new Error('jwt malformed'); });

        await expect(refreshToken(req, res)).rejects.toThrow('Not authorized, token failed');
    });

    it('should return new access token if refresh token is valid', async () => {
        req.cookies.refreshToken = 'valid_refresh_token';
        const mockUser = { _id: 'user123' };
        const mockPayload = { id: 'user123' };

        // Mocks
        jwt.verify.mockReturnValue(mockPayload);
        User.findById.mockResolvedValue(mockUser);
        generateAccessToken.mockReturnValue('new_access_token');

        // Execute
        await refreshToken(req, res);

        // Assertions "The Scenario"
        expect(jwt.verify).toHaveBeenCalledWith('valid_refresh_token', process.env.JWT_REFRESH_SECRET);
        expect(User.findById).toHaveBeenCalledWith('user123');
        expect(generateAccessToken).toHaveBeenCalledWith('user123');
        expect(res.json).toHaveBeenCalledWith({
            success: true,
            accessToken: 'new_access_token'
        });
    });
});
