const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');

let io;

const initializeSocket = (server) => {
    io = socketIo(server, {
        cors: {
            origin: process.env.FRONTEND_URL || 'http://localhost:3000',
            methods: ['GET', 'POST'],
            credentials: true,
        },
    });

    // Authentication Middleware for WebSocket Connections
    io.use((socket, next) => {
        // Tokens can be passed in headers, query, or auth object
        let token = null;

        // Try getting token from auth object
        if (socket.handshake.auth && socket.handshake.auth.token) {
            token = socket.handshake.auth.token;
        }
        // Try getting token from cookies if available
        else if (socket.handshake.headers.cookie) {
            const cookies = socket.handshake.headers.cookie.split(';');
            for (let cookie of cookies) {
                const [name, value] = cookie.trim().split('=');
                if (name === 'token') {
                    token = value;
                    break;
                }
            }
        }

        if (!token) {
            return next(new Error('Authentication Error: Token missing'));
        }

        try {
            // Use the same secret that signs access tokens
            const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
            // Attach user info to socket
            socket.user = decoded;
            next();
        } catch (err) {
            console.error('Socket authentication failed:', err.message);
            next(new Error('Authentication Error: Invalid token'));
        }
    });

    io.on('connection', (socket) => {
        console.log(`[Socket] User connected: ${socket.user.id} (Socket ID: ${socket.id})`);

        // Join personal room for direct notifications (e.g. Invitations)
        socket.join(`user_${socket.user.id}`);
        console.log(`[Socket] Joined personal room: user_${socket.user.id}`);

        // Join Project Room
        socket.on('join_project', (projectId) => {
            const roomName = `project_${projectId}`;
            socket.join(roomName);
            console.log(`[Socket] User ${socket.user.id} joined ${roomName}`);
        });

        // Leave Project Room
        socket.on('leave_project', (projectId) => {
            const roomName = `project_${projectId}`;
            socket.leave(roomName);
            console.log(`[Socket] User ${socket.user.id} left ${roomName}`);
        });

        socket.on('disconnect', () => {
            console.log(`[Socket] User disconnected: ${socket.user.id}`);
        });
    });
};

const getIo = () => {
    if (!io) {
        throw new Error('Socket.io has not been initialized!');
    }
    return io;
};

module.exports = {
    initializeSocket,
    getIo,
};
