const mongoose = require('mongoose');
const { getClient } = require('../config/redis');

// @desc    Check system health
// @route   GET /health
// @access  Public
const getHealth = async (req, res) => {
    const redisClient = getClient();

    // Check MongoDB Connection
    // 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
    const mongoStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';

    // Check Redis Connection
    const redisStatus = redisClient && redisClient.isOpen ? 'connected' : 'disconnected';

    // Determine overall status
    const isHealthy = mongoStatus === 'connected' && redisStatus === 'connected';

    // Service Unavailable if dependencies are down
    if (!isHealthy) {
        res.status(503);
    } else {
        res.status(200);
    }

    res.json({
        status: isHealthy ? 'ok' : 'error',
        timestamp: new Date(),
        services: {
            database: mongoStatus,
            redis: redisStatus
        },
        uptime: process.uptime()
    });
};

module.exports = { getHealth };
