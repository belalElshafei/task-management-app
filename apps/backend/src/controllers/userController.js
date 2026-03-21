const User = require('../models/User');
const logger = require('../utils/logger');

// @desc    Search users by name or email
// @route   GET /api/users/search?q=...
// @access  Private
const searchUsers = async (req, res, next) => {
    try {
        const query = req.query.q;
        const { targetType, targetId } = req.query;

        if (!query) {
            return res.status(400).json({
                success: false,
                message: 'Please provide a search query (q)',
            });
        }

        // Search by partial name (case-insensitive) or email
        const users = await User.find({
            $or: [
                { name: { $regex: query, $options: 'i' } },
                { email: query.toLowerCase() },
            ],
            _id: { $ne: req.user.id } // exclude current user
        })
            .select('name email _id') // Only return safe fields
            .limit(10); // Limit results for performance

        // If target context is provided, figure out who is already a member or invited
        let usersWithFlags = users.map(u => u.toObject());

        if (targetType && targetId) {
            const Invitation = require('../models/Invitation');
            let memberIds = [];

            if (targetType === 'Project') {
                const Project = require('../models/Project');
                const project = await Project.findById(targetId);
                if (project) {
                    memberIds = project.members.map(id => id.toString());
                }
            } else if (targetType === 'Task') {
                const Task = require('../models/Task');
                const task = await Task.findById(targetId);
                if (task) {
                    memberIds = task.assignedTo.map(id => id.toString());
                }
            }

            // Find pending invitations for this target
            const pendingInvitations = await Invitation.find({ targetType, targetId, status: 'Pending' });
            const invitedUserIds = pendingInvitations.map(inv => inv.recipient.toString());

            usersWithFlags = usersWithFlags.map(user => {
                const userIdStr = user._id.toString();
                return {
                    ...user,
                    isMember: memberIds.includes(userIdStr),
                    isInvited: invitedUserIds.includes(userIdStr)
                };
            });
        }

        res.status(200).json({
            success: true,
            data: usersWithFlags,
        });
    } catch (error) {
        logger.error(`Error in searchUsers: ${error.message}`);
        next(error);
    }
};

module.exports = {
    searchUsers,
};
