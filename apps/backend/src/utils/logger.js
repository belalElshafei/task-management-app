const winston = require('winston');

const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
    ),
    defaultMeta: { service: 'task-management-api' },
    transports: [
        // Always log to console for cloud compatibility
        new winston.transports.Console({
            format: process.env.NODE_ENV === 'production'
                ? winston.format.json()
                : winston.format.combine(
                    winston.format.colorize(),
                    winston.format.simple()
                ),
        }),
        // - Write ONLY critical failures (Level 0) to error.log
        new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
        // - Write general info, warnings, and errors to combined.log
        new winston.transports.File({ filename: 'logs/combined.log' }),
    ],
});

module.exports = logger;
