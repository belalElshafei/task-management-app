const errorHandler = (err, req, res, next) => {
    let statusCode = res.statusCode === 200 ? 500 : res.statusCode;
    let message = err.message;

    // Mongoose bad ObjectId
    if (err.name === 'CastError') {
        message = 'Resource not found';
        statusCode = 404;
    }

    // Mongoose duplicate key
    if (err.code === 11000) {
        message = 'Duplicate field value entered';
        statusCode = 400;
    }

    // Mongoose validation error
    if (err.name === 'ValidationError') {
        message = Object.values(err.errors)
            .map((val) => val.message)
            .join(', ');
        statusCode = 400;
    }

    // Manual Not Found Errors
    if (message === 'Project not found' || message === 'Task not found') {
        statusCode = 404;
    }

    // Authorization & Authentication Errors
    if (message.includes('Not authorized') || message === 'Invalid email or password') {
        const isAuthError = message.includes('no token') || message.includes('failed') || message === 'Invalid email or password';
        statusCode = isAuthError ? 401 : 403;
    }

    res.status(statusCode).json({
        success: false,
        message,
        stack: process.env.NODE_ENV === 'production' ? null : err.stack,
    });
};

module.exports = errorHandler;