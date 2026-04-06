const { matchedData } = require('express-validator');
const projectService = require('../services/projectService');

// @desc    Get all projects for logged-in user
// @route   GET /api/projects
// @access  Private
const getProjects = async (req, res) => {
    const projects = await projectService.getProjects(req.user._id);

    res.status(200).json({
        success: true,
        count: projects.length,
        data: projects
    });
};

// @desc    Get single project
// @route   GET /api/projects/:id
// @access  Private
const getProject = async (req, res) => {
    const project = await projectService.getProject(req.user._id, req.params.id);

    res.status(200).json({
        success: true,
        data: project
    });
};

// @desc    Create new project
// @route   POST /api/projects
// @access  Private
const createProject = async (req, res) => {
    const projectData = matchedData(req, { locations: ['body'] });
    const project = await projectService.createProject(req.user._id, projectData);

    res.status(201).json({
        success: true,
        data: project
    });
};

// @desc    Update project
// @route   PUT /api/projects/:id
// @access  Private
const updateProject = async (req, res) => {
    const updateData = matchedData(req, { locations: ['body'] });

    if (Object.keys(updateData).length === 0) {
        return res.status(400).json({
            success: false,
            message: 'Please provide fields to update'
        });
    }

    const project = await projectService.updateProject(
        req.user._id,
        req.params.id,
        updateData
    );

    res.status(200).json({
        success: true,
        data: project
    });
};

// @desc    Delete project
// @route   DELETE /api/projects/:id
// @access  Private
const deleteProject = async (req, res) => {
    await projectService.deleteProject(req.user._id, req.params.id);

    res.status(200).json({
        success: true,
        data: {},
        message: 'Project deleted successfully'
    });
};

module.exports = {
    getProjects,
    getProject,
    createProject,
    updateProject,
    deleteProject
};