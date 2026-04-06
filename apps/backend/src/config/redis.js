const redis = require('redis');
const logger = require('../utils/logger');

let client;

const connectRedis = async () => {
    // Check if we already have a client (singleton pattern)
    if (client && client.isOpen) {
        return client;
    }

    // Default to localhost, or use env var
    const redisUrl = process.env.REDIS_URL;

    client = redis.createClient({
        url: redisUrl
    });

    client.on('error', (err) => {
        logger.error(`Redis Client Error: ${err.message}`);
    });

    client.on('connect', () => {
        logger.info('Redis Client Connected');
    });

    try {
        await client.connect();
    } catch (error) {
        logger.error(`Failed to connect to Redis: ${error.message}`);
        // We don't throw here to avoid crashing the app if Redis is down
        // The service layer should handle 'client.isOpen' checks
    }

    return client;
};

// Getter to retrieve the connected client
const getClient = () => client;

module.exports = { connectRedis, getClient };
