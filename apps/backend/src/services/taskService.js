const Task = require('../models/Task');
const Project = require('../models/Project');
const mongoose = require('mongoose');
const { getClient } = require('../config/redis');

class TaskService {
    /**
     * Create a new task
     * @param {string} userId - ID of the creating user
     * @param {string} projectId - ID of the project
     * @param {Object} taskData - The task data
     */
    async createTask(userId, projectId, taskData) {
        const project = await Project.findOne({
            _id: projectId,
            members: userId
        });

        if (!project) {
            throw new Error('Project not found');
        }

        const assignees = taskData.assignedTo || [];

        const task = await Task.create({
            ...taskData,
            project: projectId,
            createdBy: userId,
            assignedTo: assignees
        });

        // DATA CONSISTENCY: Auto-add assignees to project members
        if (assignees.length > 0) {
            await Project.findByIdAndUpdate(projectId, {
                $addToSet: { members: { $each: assignees } }
            });
        }

        await this._invalidateCache(projectId, [userId, ...assignees]);

        return task;
    }

    /**
     * Get all tasks across all projects for a user
     * @param {string} userId
     * @param {Object} queryOptions
     */
    async getAllUserTasks(userId, { page = 1, limit = 10 }) {
        const skip = (page - 1) * limit;

        // Get all projects where user is a member (for authorization boundary)
        const projects = await Project.find({ members: userId }).select('_id');
        const projectIds = projects.map(p => p._id);

        // Standard behaviour: show only tasks the user owns or is assigned to,
        // not every task in projects they are a member of.
        const query = {
            project: { $in: projectIds },
            $or: [
                { assignedTo: userId },
                { createdBy: userId },
            ],
        };

        const tasks = await Task.find(query)
            .populate('project', 'name')
            .skip(skip)
            .limit(limit)
            .sort({ createdAt: -1 });

        const total = await Task.countDocuments(query);

        return {
            tasks,
            pagination: {
                total,
                page,
                pages: Math.ceil(total / limit)
            }
        };
    }

    /**
     * Get all tasks with pagination for a specific project
     * @param {string} userId
     * @param {string} projectId
     * @param {Object} queryOptions
     */
    async getTasks(userId, projectId, { page = 1, limit = 10 }) {
        console.log(`[getTasks] User: ${userId}, Project: ${projectId}`);

        const project = await Project.findById(projectId);

        if (!project) {
            console.error(`[getTasks] Project ${projectId} not found`);
            throw new Error('Project not found');
        }

        const isMember = project.members.some(m => m.toString() === userId.toString());
        if (!isMember) {
            console.error(`[getTasks] User ${userId} not a member of ${projectId}`);
            throw new Error('Not authorized: Project membership required');
        }

        const skip = (page - 1) * limit;
        const query = { project: projectId };

        console.log(`[getTasks] Querying tasks for project ${projectId}...`);
        const tasks = await Task.find(query)
            .skip(skip)
            .limit(limit)
            .sort({ createdAt: -1 });

        const total = await Task.countDocuments(query);
        console.log(`[getTasks] Found ${tasks.length} tasks`);

        return {
            tasks,
            pagination: {
                total,
                page,
                pages: Math.ceil(total / limit)
            }
        };
    }

    /**
     * Get a single task
     * @param {string} userId 
     * @param {string} projectId 
     * @param {string} taskId 
     */
    async getTask(userId, projectId, taskId) {
        const project = await Project.findById(projectId);

        if (!project) {
            throw new Error('Project not found');
        }

        const isMember = project.members.some(m => m.toString() === userId.toString());
        if (!isMember) {
            throw new Error('Not authorized: Project membership required');
        }

        const task = await Task.findOne({
            _id: taskId,
            project: projectId
        });

        if (!task) {
            throw new Error('Task not found');
        }

        return task;
    }

    /**
     * Update a task
     * @param {string} userId 
     * @param {string} projectId 
     * @param {string} taskId 
     * @param {Object} updateData 
     */
    async updateTask(userId, projectId, taskId, updateData) {
        const [project, task] = await Promise.all([
            Project.findById(projectId),
            Task.findById(taskId)
        ]);

        if (!task) throw new Error('Task not found');
        if (!project) throw new Error('Project not found');

        const isProjectOwner = project.owner.toString() === userId.toString();
        const isTaskCreator = task.createdBy.toString() === userId.toString();
        const isTaskAssignee = task.assignedTo.some(id => id.toString() === userId.toString());

        if (!isProjectOwner && !isTaskCreator && !isTaskAssignee) {
            throw new Error('Not authorized to update this task');
        }

        if (updateData.assignedTo && !Array.isArray(updateData.assignedTo)) {
            updateData.assignedTo = [updateData.assignedTo];
        }

        const updatedTask = await Task.findOneAndUpdate(
            { _id: taskId, project: projectId },
            updateData,
            { new: true, runValidators: true }
        );

        if (!updatedTask) throw new Error('Task not found during update');

        // DATA CONSISTENCY: Auto-add new assignees to project members
        if (updatedTask.assignedTo && updatedTask.assignedTo.length > 0) {
            await Project.findByIdAndUpdate(projectId, {
                $addToSet: { members: { $each: updatedTask.assignedTo } }
            });
        }

        const assignees = updatedTask.assignedTo || [];
        await this._invalidateCache(projectId, [userId, ...assignees, updatedTask.createdBy]);

        return updatedTask;
    }

    /**
     * Delete a task
     * @param {string} userId 
     * @param {string} projectId 
     * @param {string} taskId 
     */
    async deleteTask(userId, projectId, taskId) {
        const [project, task] = await Promise.all([
            Project.findById(projectId),
            Task.findById(taskId)
        ]);

        if (!task) throw new Error('Task not found');
        if (!project) throw new Error('Project not found');

        const isProjectOwner = project.owner.toString() === userId.toString();
        const isTaskCreator = task.createdBy.toString() === userId.toString();

        if (!isProjectOwner && !isTaskCreator) {
            throw new Error('Not authorized to delete this task');
        }

        const deletedTask = await Task.findOneAndDelete({
            _id: taskId,
            project: projectId
        });

        if (!deletedTask) throw new Error('Task not found during deletion');

        const assignees = deletedTask.assignedTo || [];
        await this._invalidateCache(projectId, [userId, ...assignees, deletedTask.createdBy]);

        return deletedTask;
    }

    /**
     * Get task statistics (using Aggregation)
     * @param {string} userId 
     * @param {string} projectId 
     */
    async getTaskStats(userId, projectId) {
        // 1. AUTHORIZATION CHECK: User must be a project member/owner
        const hasAccess = await Project.exists({
            _id: projectId,
            members: userId
        });

        if (!hasAccess) {
            throw new Error('Not authorized to view statistics for this project');
        }

        const redisClient = getClient();
        const cacheKey = `stats:${projectId}:${userId}`;

        // 2. Try to get from cache
        if (redisClient && redisClient.isOpen) {
            try {
                const cachedData = await redisClient.get(cacheKey);
                if (cachedData) {
                    return JSON.parse(cachedData);
                }
            } catch (err) {
                console.error('Redis Get Error:', err);
            }
        }

        // 3. Database Query (Expensive)
        const stats = await Task.aggregate([
            {
                $match: {
                    project: new mongoose.Types.ObjectId(projectId)
                }
            },
            {
                $facet: {
                    byStatus: [
                        { $group: { _id: '$status', count: { $sum: 1 } } }
                    ],
                    totalCount: [
                        { $count: 'total' }
                    ]
                }
            }
        ]);

        const result = stats[0];
        const totalTasks = result.totalCount[0] ? result.totalCount[0].total : 0;
        const formattedStats = result.byStatus.map(s => ({ status: s._id, count: s.count }));

        const responseData = {
            stats: formattedStats,
            summary: {
                totalTasks,
                lastUpdated: new Date()
            }
        };

        // 4. Save to Cache (60 seconds)
        if (redisClient && redisClient.isOpen) {
            try {
                await redisClient.setEx(cacheKey, 60, JSON.stringify(responseData));
            } catch (err) {
                console.error('Redis Set Error:', err);
            }
        }

        return responseData;
    }

    /**
     * Helper to invalidate cache for specific users
     */
    async _invalidateCache(projectId, userIds) {
        const redisClient = getClient();
        if (!redisClient || !redisClient.isOpen) return;

        const uniqueUsers = [...new Set(userIds.filter(id => id).map(id => id.toString()))];

        const promises = uniqueUsers.map(uid => {
            const key = `stats:${projectId}:${uid}`;
            return redisClient.del(key).catch(err => {
                console.error('Redis Del Error:', err);
            });
        });

        try {
            await Promise.all(promises);
        } catch (err) {
            console.error('Redis Invalidation Error:', err);
        }
    }
}

module.exports = new TaskService();
