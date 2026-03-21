const mongoose = require('mongoose');

const invitationSchema = new mongoose.Schema(
    {
        sender: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        recipient: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        targetType: {
            type: String,
            enum: ['Project', 'Task'],
            required: true,
        },
        targetId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            // Dynamic reference depending on targetType
            refPath: 'targetType',
        },
        status: {
            type: String,
            enum: ['Pending', 'Accepted', 'Declined'],
            default: 'Pending',
        },
    },
    {
        timestamps: true,
    }
);

// Prevent duplicate pending invitations between the same parties for the same target
invitationSchema.index({ sender: 1, recipient: 1, targetId: 1, status: 1 }, { unique: true, partialFilterExpression: { status: 'Pending' } });

module.exports = mongoose.model('Invitation', invitationSchema);
