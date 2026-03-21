const mongoose = require('mongoose');
const logger = require('../utils/logger');

const maxRetries = 15;
const retryDelayMs = 2000;

const connectDB = async () => {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const conn = await mongoose.connect(process.env.MONGO_URI);
            logger.info(`MongoDB Connected: ${conn.connection.host}`);
            return;
        } catch (error) {
            logger.error(`MongoDB connection attempt ${attempt}/${maxRetries} failed: ${error.message}`);
            if (process.env.NODE_ENV === 'test') {
                throw error;
            }
            if (attempt === maxRetries) {
                logger.error('Max retries reached. Exiting.');
                process.exit(1);
            }
            await new Promise((r) => setTimeout(r, retryDelayMs));
        }
    }
};

module.exports = connectDB;