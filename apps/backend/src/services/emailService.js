const nodemailer = require('nodemailer');
const notificationService = require('./notificationService');
const User = require('../models/User');
const logger = require('../utils/logger');

class EmailService {
    constructor() {
        this.transporter = null;
        this.initTransporter();
        this.initListeners();
    }

    initTransporter() {
        this.transporter = nodemailer.createTransport({
            host: process.env.EMAIL_HOST,
            port: process.env.EMAIL_PORT,
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });

        // Verify connection configuration
        this.transporter.verify((error, success) => {
            if (error) {
                logger.error(`Email Transporter Error: ${error.message}`);
            } else {
                logger.info('Email Transporter is ready to send messages');
            }
        });
    }

    initListeners() {
        // --- INVITATION EMAIL ---
        notificationService.on('invitation:created', async (invitation) => {
            try {
                // Fetch the recipient and sender
                const recipient = await User.findById(invitation.recipient);
                const sender = await User.findById(invitation.sender);

                if (!recipient || !recipient.email) return;

                const mailOptions = {
                    from: `"TaskFlow" <${process.env.EMAIL_FROM}>`,
                    to: recipient.email,
                    subject: `New Invitation: ${invitation.targetType}`,
                    html: `
                        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
                            <div style="background-color: #2563eb; padding: 20px; text-align: center;">
                                <h2 style="color: white; margin: 0;">TaskFlow</h2>
                            </div>
                            <div style="padding: 30px;">
                                <h3>Hello ${recipient.name || 'there'},</h3>
                                <p><strong>${sender ? sender.name : 'Someone'}</strong> has invited you to join a <strong>${invitation.targetType}</strong>.</p>
                                <p>You can view and respond to this invitation in your dashboard.</p>
                                <div style="text-align: center; margin-top: 30px;">
                                    <a href="${process.env.FRONTEND_URL}/dashboard/notifications" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">View Invitation</a>
                                </div>
                            </div>
                            <div style="background-color: #f3f4f6; padding: 15px; text-align: center; color: #6b7280; font-size: 12px;">
                                <p>This email was sent automatically by TaskFlow.</p>
                            </div>
                        </div>
                    `
                };

                await this.transporter.sendMail(mailOptions);
                logger.info(`Invitation email sent to ${recipient.email}`);
            } catch (err) {
                logger.error(`Error sending invitation email: ${err.message}`);
            }
        });

        // --- TASK ASSIGNED EMAIL ---
        notificationService.on('task:assigned', async (task) => {
            try {
                for (const assigneeId of task.assignedTo) {
                    const assignee = await User.findById(assigneeId);
                    if (!assignee || !assignee.email) continue;

                    const mailOptions = {
                        from: `"TaskFlow" <${process.env.EMAIL_FROM}>`,
                        to: assignee.email,
                        subject: `New Task Assignment: ${task.title}`,
                        html: `
                            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
                                <div style="background-color: #2563eb; padding: 20px; text-align: center;">
                                    <h2 style="color: white; margin: 0;">TaskFlow</h2>
                                </div>
                                <div style="padding: 30px;">
                                    <h3>Hello ${assignee.name || 'there'},</h3>
                                    <p>You have been assigned to a new task: <strong>${task.title}</strong>.</p>
                                    <p>Please log in to review the task details and begin work.</p>
                                    <div style="text-align: center; margin-top: 30px;">
                                        <a href="${process.env.FRONTEND_URL}/dashboard/projects/${task.project}/tasks/${task._id}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">View Task</a>
                                    </div>
                                </div>
                            </div>
                        `
                    };

                    await this.transporter.sendMail(mailOptions);
                    logger.info(`Task assignment email sent to ${assignee.email}`);
                }
            } catch (err) {
                logger.error(`Error sending task assignment email: ${err.message}`);
            }
        });

        // --- TASK STATUS CHANGED EMAIL ---
        notificationService.on('task:statusChanged', async ({ task, oldStatus, actor }) => {
            try {
                const recipients = task.assignedTo.filter(id => id.toString() !== actor.id.toString());

                for (const recipientId of recipients) {
                    const assignee = await User.findById(recipientId);
                    if (!assignee || !assignee.email) continue;

                    const mailOptions = {
                        from: `"TaskFlow" <${process.env.EMAIL_FROM}>`,
                        to: assignee.email,
                        subject: `Task Status Update: ${task.title}`,
                        html: `
                            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
                                <div style="background-color: #2563eb; padding: 20px; text-align: center;">
                                    <h2 style="color: white; margin: 0;">TaskFlow</h2>
                                </div>
                                <div style="padding: 30px;">
                                    <h3>Hello ${assignee.name || 'there'},</h3>
                                    <p>A task you are assigned to has been updated.</p>
                                    <p><strong>${task.title}</strong> moved from <span style="color: #6b7280; text-decoration: line-through;">${oldStatus}</span> to <span style="background-color: #dbeafe; color: #1e40af; padding: 2px 6px; border-radius: 4px; font-weight: bold;">${task.status}</span>.</p>
                                    <div style="text-align: center; margin-top: 30px;">
                                        <a href="${process.env.FRONTEND_URL}/dashboard/projects/${task.project}/tasks/${task._id}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">View Task</a>
                                    </div>
                                </div>
                            </div>
                        `
                    };

                    await this.transporter.sendMail(mailOptions);
                    logger.info(`Task status email sent to ${assignee.email}`);
                }
            } catch (err) {
                logger.error(`Error sending task status email: ${err.message}`);
            }
        });
    }
}

// Singleton instance
const emailService = new EmailService();
module.exports = emailService;
