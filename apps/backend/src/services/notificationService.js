const EventEmitter = require('events');
const Notification = require('../models/Notification');
const logger = require('../utils/logger');

class NotificationService extends EventEmitter {
    constructor() {
        super();
        this.init();
    }

    init() {
        // --- INVITATION LISTENERS ---
        this.on('invitation:created', async (invitation) => {
            try {
                // We've already populated sender/target in some cases, but here we just need IDs
                let link = '/dashboard/notifications';
                let projectId = null;

                if (invitation.targetType === 'Project') {
                    link = `/dashboard/projects/${invitation.targetId}`;
                } else if (invitation.targetType === 'Task') {
                    const Task = require('../models/Task');
                    const task = await Task.findById(invitation.targetId);
                    if (task) {
                        projectId = task.project.toString();
                        link = `/dashboard/projects/${projectId}/tasks/${task._id}`;
                    }
                }

                await this.createNotification({
                    recipient: invitation.recipient,
                    type: 'INVITATION_RECEIVED',
                    referenceId: invitation._id,
                    title: 'New Invitation',
                    message: `You have received a new invitation for a ${invitation.targetType}.`,
                    link,
                    metadata: {
                        targetType: invitation.targetType,
                        targetId: invitation.targetId.toString(),
                        ...(projectId && { projectId })
                    }
                });
            } catch (err) {
                logger.error(`Error in invitation:created listener: ${err.message}`);
            }
        });

        // Auto-read notification when invitation is handled elsewhere
        const handleInvitationHandled = async (invitation) => {
            try {
                await Notification.updateMany(
                    { referenceId: invitation._id, recipient: invitation.recipient },
                    { isRead: true }
                );

                const io = require('../socket/socketHandler').getIo();
                io.to(`user_${invitation.recipient}`).emit('new_notification', { type: 'INVITATION_HANDLED', invitationId: invitation._id });
            } catch (err) {
                logger.error(`Error in invitation:handled listener: ${err.message}`);
            }
        };

        this.on('invitation:accepted', handleInvitationHandled);
        this.on('invitation:declined', handleInvitationHandled);

        // --- TASK LISTENERS ---
        this.on('task:assigned', async (task) => {
            try {
                const notifications = task.assignedTo.map((assigneeId) => ({
                    recipient: assigneeId,
                    type: 'TASK_ASSIGNED',
                    referenceId: task._id,
                    title: 'Task Assigned',
                    message: `You have been assigned to task: "${task.title}".`,
                    link: `/dashboard/projects/${task.project}/tasks/${task._id}`,
                    metadata: {
                        projectId: task.project.toString(),
                        taskId: task._id.toString()
                    }
                }));

                await Notification.insertMany(notifications);

                // Emit socket notifications for each assignee
                const io = require('../socket/socketHandler').getIo();
                task.assignedTo.forEach((assigneeId) => {
                    io.to(`user_${assigneeId}`).emit('new_notification', { type: 'TASK_ASSIGNED' });
                });
            } catch (err) {
                logger.error(`Error in task:assigned listener: ${err.message}`);
            }
        });

        this.on('task:statusChanged', async ({ task, oldStatus, actor }) => {
            try {
                // Notify all assignees except the one who changed it
                const recipients = task.assignedTo.filter(id => id.toString() !== actor.id.toString());

                if (recipients.length === 0) return;

                const notifications = recipients.map((recipientId) => ({
                    recipient: recipientId,
                    type: 'TASK_STATUS_CHANGED',
                    referenceId: task._id,
                    title: 'Task Status Updated',
                    message: `Task "${task.title}" moved from ${oldStatus} to ${task.status}.`,
                    link: `/dashboard/projects/${task.project}/tasks/${task._id}`,
                    metadata: {
                        projectId: task.project.toString(),
                        taskId: task._id.toString(),
                        newStatus: task.status
                    }
                }));

                await Notification.insertMany(notifications);

                const io = require('../socket/socketHandler').getIo();
                recipients.forEach((recipientId) => {
                    io.to(`user_${recipientId}`).emit('new_notification', { type: 'TASK_STATUS_CHANGED' });
                });
            } catch (err) {
                logger.error(`Error in task:statusChanged listener: ${err.message}`);
            }
        });
    }

    async createNotification(data) {
        try {
            const notification = await Notification.create(data);

            // Emit socket event to recipient's room
            try {
                const io = require('../socket/socketHandler').getIo();
                io.to(`user_${data.recipient}`).emit('new_notification', notification);
            } catch (socketErr) {
                logger.error(`Socket Error in createNotification: ${socketErr.message}`);
            }

            return notification;
        } catch (err) {
            logger.error(`Error creating notification record: ${err.message}`);
            throw err;
        }
    }
}

// Singleton instance
const notificationService = new NotificationService();
module.exports = notificationService;
