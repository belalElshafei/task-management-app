const Invitation = require('../models/Invitation');
const Project = require('../models/Project');
const Task = require('../models/Task');
const User = require('../models/User');
const { getClient } = require('../config/redis');
const logger = require('../utils/logger');

// Helper to verify user permissions
const hasPermission = async (userId, targetType, targetId) => {
    if (targetType === 'Project') {
        const project = await Project.findById(targetId);
        if (!project) return false;

        // Owner or any project member can invite
        return (
            project.owner.toString() === userId.toString() ||
            project.members.some((m) => m.toString() === userId.toString())
        );
    } else if (targetType === 'Task') {
        const task = await Task.findById(targetId);
        if (!task) return false;

        const project = await Project.findById(task.project);
        if (!project) return false;

        const isProjectOwner = project.owner.toString() === userId.toString();
        const isProjectMember = project.members.some(
            (m) => m.toString() === userId.toString()
        );
        const isTaskCreator = task.createdBy.toString() === userId.toString();
        const isTaskAssignee = task.assignedTo.some(
            (a) => a.toString() === userId.toString()
        );

        // Permission rule: project owner, task creator, or existing task assignee may invite others to the task
        return isProjectOwner || isTaskCreator || isTaskAssignee;
    }
    return false;
};

// @desc    Create and send an invitation
// @route   POST /api/invitations
// @access  Private
const createInvitation = async (req, res, next) => {
    try {
        const { recipientId, targetType, targetId } = req.body;
        const senderId = req.user.id;

        if (!recipientId || !targetType || !targetId) {
            return res.status(400).json({ success: false, message: 'Please provide all required fields' });
        }

        if (recipientId === senderId) {
            return res.status(400).json({ success: false, message: 'Cannot invite yourself' });
        }

        // Check permissions
        const canInvite = await hasPermission(senderId, targetType, targetId);
        if (!canInvite) {
            return res.status(403).json({ success: false, message: 'Not authorized to send invitations for this resource' });
        }

        // Check if recipient is already part of the target
        if (targetType === 'Project') {
            const project = await Project.findById(targetId);
            if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

            const recipientIdStr = recipientId.toString();
            const isOwner = project.owner.toString() === recipientIdStr;
            const isMember = project.members.some(m => m.toString() === recipientIdStr);

            if (isOwner || isMember) {
                return res.status(400).json({ success: false, message: 'User is already a member or owner of this project' });
            }
        } else if (targetType === 'Task') {
            const task = await Task.findById(targetId);
            if (!task) return res.status(404).json({ success: false, message: 'Task not found' });

            const recipientIdStr = recipientId.toString();
            const isCreator = task.createdBy.toString() === recipientIdStr;
            const isAssigned = task.assignedTo.some(a => a.toString() === recipientIdStr);

            if (isCreator || isAssigned) {
                return res.status(400).json({ success: false, message: 'User is already assigned to or created this task' });
            }

            // Check if user is a member of the parent project
            const Project = require('../models/Project');
            const project = await Project.findById(task.project);
            
            const isProjectOwner = project && project.owner.toString() === recipientIdStr;
            const isProjectMember = project && project.members.some(m => m.toString() === recipientIdStr);

            if (!project || (!isProjectOwner && !isProjectMember)) {
                return res.status(400).json({ success: false, message: 'User must be a member of the project before being invited to a task' });
            }
        }

        // Create invitation
        const invitation = await Invitation.create({
            sender: senderId,
            recipient: recipientId,
            targetType,
            targetId,
        });

        // -------------------------------------------------------------
        // DISPATCH EVENT: NotificationService will handle the DB record and Socket emission
        // -------------------------------------------------------------
        const notificationService = require('../services/notificationService');
        notificationService.emit('invitation:created', invitation);

        res.status(201).json({ success: true, data: invitation });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ success: false, message: 'A pending invitation already exists' });
        }
        logger.error(`Error in createInvitation: ${error.message}`);
        next(error);
    }
};

// @desc    Get user's pending invitations
// @route   GET /api/invitations
// @access  Private
const getMyInvitations = async (req, res, next) => {
    try {
        const invitations = await Invitation.find({ recipient: req.user.id, status: 'Pending' })
            .populate('sender', 'name email')
            .populate('targetId', 'title name'); // Populates 'name' for Project, 'title' for Task

        res.status(200).json({ success: true, data: invitations });
    } catch (error) {
        logger.error(`Error in getMyInvitations: ${error.message}`);
        next(error);
    }
};

// @desc    Accept an invitation
// @route   POST /api/invitations/:id/accept
// @access  Private
const acceptInvitation = async (req, res, next) => {
    try {
        const invitation = await Invitation.findOne({ _id: req.params.id, recipient: req.user.id, status: 'Pending' })
            .populate('sender', 'name email')
            .populate('targetId', 'title name');

        if (!invitation) {
            return res.status(404).json({ success: false, message: 'Invitation not found or already processed' });
        }

        // Add user to the respective target
        if (invitation.targetType === 'Project') {
            await Project.findByIdAndUpdate(invitation.targetId._id, {
                $addToSet: { members: req.user.id }
            });
        } else if (invitation.targetType === 'Task') {
            await Task.findByIdAndUpdate(invitation.targetId._id, {
                $addToSet: { assignedTo: req.user.id }
            });
        }

        // Invalidate projects cache for this user so their Projects tab updates
        const redisClient = getClient();
        if (redisClient && redisClient.isOpen) {
            try {
                await redisClient.del(`projects:${req.user.id.toString()}`);
            } catch (cacheError) {
                logger.error(`Redis cache invalidation error (projects:${req.user.id}): ${cacheError.message}`);
            }
        }

        invitation.status = 'Accepted';
        await invitation.save();

        // -------------------------------------------------------------
        // SOCKET.IO EVENT: Refresh Dashboard for Sender & Recipient
        // -------------------------------------------------------------
        try {
            const io = require('../socket/socketHandler').getIo();

            // Notify recipient that it worked
            io.to(`user_${req.user.id}`).emit('invitation_accepted', invitation);

            // Dispatch event to NotificationService
            const notificationService = require('../services/notificationService');
            notificationService.emit('invitation:accepted', invitation);

            // Optionally, we could notify the sender that their invite was accepted
            if (invitation.sender && invitation.sender._id) {
                io.to(`user_${invitation.sender._id}`).emit('invitation_accepted_by_user', {
                    invitationId: invitation._id,
                    recipientName: req.user.name,
                    targetName: invitation.targetId?.name || invitation.targetId?.title
                });
            }

            // If they joined a project, consider emitting a 'project_updated' event to the project room here.
        } catch (socketError) {
            logger.error(`Socket Error (invitation_accepted): ${socketError.message}`);
        }

        res.status(200).json({ success: true, data: invitation });
    } catch (error) {
        logger.error(`Error in acceptInvitation: ${error.message}`);
        next(error);
    }
};

// @desc    Decline an invitation
// @route   POST /api/invitations/:id/decline
// @access  Private
const declineInvitation = async (req, res, next) => {
    try {
        const invitation = await Invitation.findOne({ _id: req.params.id, recipient: req.user.id, status: 'Pending' });

        if (!invitation) {
            return res.status(404).json({ success: false, message: 'Invitation not found or already processed' });
        }

        invitation.status = 'Declined';
        await invitation.save();

        // -------------------------------------------------------------
        // SOCKET.IO EVENT
        // -------------------------------------------------------------
        try {
            const io = require('../socket/socketHandler').getIo();
            io.to(`user_${req.user.id}`).emit('invitation_declined', { id: invitation._id });

            // Dispatch event to NotificationService
            const notificationService = require('../services/notificationService');
            notificationService.emit('invitation:declined', invitation);
        } catch (socketError) {
            logger.error(`Socket Error (invitation_declined): ${socketError.message}`);
        }

        res.status(200).json({ success: true, data: invitation });
    } catch (error) {
        logger.error(`Error in declineInvitation: ${error.message}`);
        next(error);
    }
};

module.exports = {
    createInvitation,
    getMyInvitations,
    acceptInvitation,
    declineInvitation
};
