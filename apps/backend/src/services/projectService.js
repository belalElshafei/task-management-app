const Project = require('../models/Project');
const Task = require('../models/Task');
const { getClient } = require('../config/redis');

class ProjectService {
    /**
     * Get all projects for a user (with caching)
     * @param {string} userId
     */
    async getProjects(userId) {
        const redisClient = getClient();
        const cacheKey = `projects:${userId}`;

        // 1. Try Cache
        if (redisClient && redisClient.isOpen) {
            try {
                const cachedProjects = await redisClient.get(cacheKey);
                if (cachedProjects) {
                    return JSON.parse(cachedProjects);
                }
            } catch (err) {
                console.error('Redis Get Error:', err);
            }
        }

        // 2. DB Query: Member check covers owners too
        const projects = await Project.find({
            members: userId
        }).populate('owner', 'name email');

        // 3. Set Cache
        if (redisClient && redisClient.isOpen) {
            try {
                await redisClient.setEx(cacheKey, 60, JSON.stringify(projects));
            } catch (err) {
                console.error('Redis Set Error:', err);
            }
        }

        return projects;
    }

    /**
     * Get single project
     * @param {string} userId
     * @param {string} projectId
     */
    async getProject(userId, projectId) {
        const project = await Project.findById(projectId)
            .populate('owner', 'name email')
            .populate('members', 'name email');

        if (!project) {
            throw new Error('Project not found');
        }

        const isMember = project.members.some(m => m._id.toString() === userId.toString());
        if (!isMember) {
            throw new Error('Not authorized: Project membership required');
        }

        return project;
    }

    /**
     * Create new project
     * @param {string} userId
     * @param {Object} projectData
     */
    async createProject(userId, projectData) {
        const initialMembers = [...new Set([...(projectData.members || []), userId])];

        const project = await Project.create({
            ...projectData,
            owner: userId,
            members: initialMembers
        });

        await this._invalidateCache(project.members);
        return project;
    }

    /**
     * Update project
     * @param {string} userId
     * @param {string} projectId
     * @param {Object} updateData
     */
    async updateProject(userId, projectId, updateData) {
        const project = await Project.findById(projectId);

        if (!project) {
            throw new Error('Project not found');
        }

        if (project.owner.toString() !== userId.toString()) {
            throw new Error('Not authorized: Owner access required');
        }

        const updatedProject = await Project.findByIdAndUpdate(
            projectId,
            updateData,
            {
                new: true,
                runValidators: true
            }
        );

        await this._invalidateCache(updatedProject.members);
        return updatedProject;
    }

    /**
     * Delete project
     * @param {string} userId
     * @param {string} projectId
     */
    async deleteProject(userId, projectId) {
        const project = await Project.findById(projectId);

        if (!project) {
            throw new Error('Project not found');
        }

        if (project.owner.toString() !== userId.toString()) {
            throw new Error('Not authorized: Owner access required');
        }

        await Project.findByIdAndDelete(projectId);

        // CASCADING DELETE: Remove all tasks associated with this project
        await Task.deleteMany({ project: projectId });

        await this._invalidateCache(project.members);

        return project;
    }

    /**
     * Helper to invalidate user projects cache for multiple users
     * @param {string[]} userIds
     */
    async _invalidateCache(userIds) {
        const redisClient = getClient();
        if (!redisClient || !redisClient.isOpen) return;

        const uniqueUsers = [...new Set(userIds.map(id => id.toString()))];

        const promises = uniqueUsers.map(uid => {
            return redisClient.del(`projects:${uid}`).catch(err => {
                console.error('Redis Del Error:', err);
            });
        });

        await Promise.all(promises);
    }
}

module.exports = new ProjectService();
