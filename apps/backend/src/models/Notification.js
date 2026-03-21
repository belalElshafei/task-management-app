const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
    {
        recipient: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        type: {
            type: String,
            enum: ['INVITATION_RECEIVED', 'TASK_ASSIGNED', 'TASK_STATUS_CHANGED'],
            required: true,
        },
        referenceId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            // Can refer to Invitation or Task
        },
        metadata: {
            type: Map,
            of: String,
            default: {},
        },
        title: {
            type: String,
            required: true,
        },
        message: {
            type: String,
            required: true,
        },
        link: {
            type: String,
            required: true,
        },
        isRead: {
            type: Boolean,
            default: false,
        },
    },
    {
        timestamps: true,
    }
);

// Index for performance when fetching notifications for a user
notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
