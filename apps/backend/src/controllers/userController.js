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
            let projectOwnerId = null;
            let taskCreatorId = null;

            if (targetType === 'Project') {
                const Project = require('../models/Project');
                const project = await Project.findById(targetId);
                if (project) {
                    memberIds = project.members.map(id => id.toString());
                    projectOwnerId = project.owner.toString();
                }
            } else if (targetType === 'Task') {
                const Task = require('../models/Task');
                projectTask = await Task.findById(targetId);
                if (projectTask) {
                    // Task-specific membership
                    memberIds = projectTask.assignedTo.map(id => id.toString());
                    taskCreatorId = projectTask.createdBy.toString();

                    // Find parent project membership for validation
                    const Project = require('../models/Project');
                    const project = await Project.findById(projectTask.project);
                    if (project) {
                        const projectMemberIds = project.members.map(id => id.toString());
                        projectOwnerId = project.owner.toString();
                        
                        // We decorate users with a flag if they are NOT in the project
                        usersWithFlags = usersWithFlags.map(user => {
                            const userIdStr = user._id.toString();
                            const isProjectMember = projectMemberIds.includes(userIdStr);
                            return {
                                ...user,
                                isProjectMember,
                                // Validation rule: only project members can receive task invites
                                canReceiveTaskInvite: isProjectMember
                            };
                        });
                    }
                }
            }

            // Find pending invitations for this specific target
            const pendingInvitations = await Invitation.find({ targetType, targetId, status: 'Pending' });
            let invitedUserIds = pendingInvitations.map(inv => inv.recipient.toString());

            // If this is a Task, also check if the user is already invited to the parent Project
            if (targetType === 'Task' && projectTask) {
                const projectPendingInvites = await Invitation.find({ targetType: 'Project', targetId: projectTask.project, status: 'Pending' });
                invitedUserIds = [...invitedUserIds, ...projectPendingInvites.map(inv => inv.recipient.toString())];
            }

            usersWithFlags = usersWithFlags.map(user => {
                const userIdStr = user._id.toString();
                
                // --- Membership logic update ---
                const isProjectOwner = projectOwnerId === userIdStr;
                const isTaskCreator = taskCreatorId === userIdStr;

                const isMemberFinal = memberIds.includes(userIdStr) || isProjectOwner || isTaskCreator;

                return {
                    ...user,
                    isMember: isMemberFinal,
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
