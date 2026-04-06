const { matchedData } = require('express-validator');
const taskService = require('../services/taskService');

const getAllUserTasks = async (req, res) => {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;

    const result = await taskService.getAllUserTasks(req.user.id, { page, limit });

    res.status(200).json({
        success: true,
        count: result.tasks.length,
        pagination: result.pagination,
        data: result.tasks
    });
};

// @desc    Get all tasks for a project
// @route   GET /api/projects/:projectId/tasks
// @access  Private
const getTasks = async (req, res) => {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;

    const result = await taskService.getTasks(req.user.id, req.params.projectId, { page, limit });

    res.status(200).json({
        success: true,
        count: result.tasks.length,
        pagination: result.pagination,
        data: result.tasks
    });
};

// @desc    Get single task
// @route   GET /api/projects/:projectId/tasks/:id
// @access  Private
const getTask = async (req, res) => {
    const task = await taskService.getTask(req.user.id, req.params.projectId, req.params.id);

    res.status(200).json({
        success: true,
        data: task
    });
};

// @desc    Get task statistics
// @route   GET /api/projects/:projectId/tasks/stats
// @access  Private
const getTaskStats = async (req, res) => {
    const data = await taskService.getTaskStats(req.user.id, req.params.projectId);

    res.status(200).json({
        success: true,
        data
    });
};

// @desc    Create task
// @route   POST /api/projects/:projectId/tasks
// @access  Private
const createTask = async (req, res) => {
    const taskData = matchedData(req, { locations: ['body'] });
    const task = await taskService.createTask(req.user.id, req.params.projectId, taskData);

    // Dispatch task:assigned event
    try {
        if (task.assignedTo && task.assignedTo.length > 0) {
            const notificationService = require('../services/notificationService');
            notificationService.emit('task:assigned', task);
        }
    } catch (err) {
        console.error('Event Emission Error (task_assigned):', err.message);
    }

    res.status(201).json({
        success: true,
        data: task
    });
};

// @desc    Update task
// @route   PUT /api/projects/:projectId/tasks/:id
// @access  Private
const updateTask = async (req, res) => {
    const updateData = matchedData(req, { locations: ['body'] });

    if (Object.keys(updateData).length === 0) {
        return res.status(400).json({
            success: false,
            message: 'Please provide fields to update'
        });
    }

    const task = await taskService.updateTask(req.user.id, req.params.projectId, req.params.id, updateData);

    // Broadcast updated task and notify of status change
    try {
        const io = require('../socket/socketHandler').getIo();
        io.to(`project_${req.params.projectId}`).emit('task_updated', task);

        // Notify of status change if applicable
        if (updateData.status) {
            const notificationService = require('../services/notificationService');
            notificationService.emit('task:statusChanged', {
                task,
                oldStatus: 'previous', // ideally we'd pass old data here, but for now 'previous' works
                actor: req.user
            });
        }
    } catch (err) {
        console.error('Socket/Event Error (task_updated):', err.message);
    }

    res.status(200).json({
        success: true,
        data: task
    });
};

// @desc    Delete task
// @route   DELETE /api/projects/:projectId/tasks/:id
// @access  Private
const deleteTask = async (req, res) => {
    await taskService.deleteTask(req.user.id, req.params.projectId, req.params.id);

    // Broadcast deleted task ID to project room
    try {
        const io = require('../socket/socketHandler').getIo();
        io.to(`project_${req.params.projectId}`).emit('task_deleted', { id: req.params.id });
    } catch (err) {
        console.error('Socket Error (task_deleted):', err.message);
    }

    res.status(200).json({
        success: true,
        data: {},
        message: 'Task deleted successfully'
    });
};

module.exports = {
    getAllUserTasks,
    getTasks,
    getTask,
    getTaskStats,
    createTask,
    updateTask,
    deleteTask
};

