const { body, validationResult } = require('express-validator');
const mongoose = require('mongoose');

// Helper to validate MongoDB ObjectIDs
const isValidMongoId = (value) => mongoose.Types.ObjectId.isValid(value);

// Middleware to check for validation errors
const validateRequest = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            errors: errors.array()
        });
    }
    next();
};

// Project Validators
const createProjectValidator = [
    body('name').trim().notEmpty().withMessage('Please add a project name'),
    body('description').trim().notEmpty().withMessage('Please add a description'),
    body('status').optional().isIn(['active', 'completed', 'archived']).withMessage('Status must be active, completed, or archived'),
    body('members').optional().isArray().withMessage('Members must be an array of User IDs'),
    body('members.*').custom(isValidMongoId).withMessage('Invalid User ID in members'),
    validateRequest
];

const updateProjectValidator = [
    body('name').optional().trim().notEmpty().withMessage('Name cannot be empty'),
    body('description').optional().trim().notEmpty().withMessage('Description cannot be empty'),
    body('status').optional().isIn(['active', 'completed', 'archived']).withMessage('Status must be active, completed, or archived'),
    body('members').optional().isArray().withMessage('Members must be an array of User IDs'),
    body('members.*').custom(isValidMongoId).withMessage('Invalid User ID in members'),
    validateRequest
];

// Task Validators
const createTaskValidator = [
    body('title').trim().notEmpty().withMessage('Please add a task title'),
    body('description').optional().trim(),
    body('priority').optional().isIn(['Low', 'Medium', 'High', 'low', 'medium', 'high']).withMessage('Invalid priority'),
    body('status').optional().isIn(['Todo', 'In Progress', 'Done', 'todo', 'in-progress', 'completed']).withMessage('Invalid status'),
    body('assignedTo').optional().isArray().withMessage('assignedTo must be an array of User IDs'),
    body('assignedTo.*').custom(isValidMongoId).withMessage('Invalid User ID in assignment list'),
    body('deadline').optional().isISO8601().toDate().withMessage('Invalid deadline date'),
    body('tags').optional().isArray().withMessage('Tags must be an array of strings'),
    body('tags.*').optional().isString().trim().notEmpty(),
    validateRequest
];

const updateTaskValidator = [
    body('title').optional().trim().notEmpty().withMessage('Title cannot be empty'),
    body('description').optional().trim(),
    body('priority').optional().isIn(['Low', 'Medium', 'High', 'low', 'medium', 'high']),
    body('status').optional().isIn(['Todo', 'In Progress', 'Done', 'todo', 'in-progress', 'completed']),
    body('assignedTo').optional().isArray().withMessage('assignedTo must be an array of User IDs'),
    body('assignedTo.*').custom(isValidMongoId).withMessage('Invalid User ID in assignment list'),
    body('deadline').optional().isISO8601().toDate().withMessage('Invalid deadline date'),
    body('tags').optional().isArray().withMessage('Tags must be an array of strings'),
    body('tags.*').optional().isString().trim().notEmpty(),
    validateRequest
];

// Auth Validators
const registerValidator = [
    body('name').trim().notEmpty().withMessage('Please add a name'),
    body('email').isEmail().withMessage('Please add a valid email'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    validateRequest
];

const loginValidator = [
    body('email').isEmail().withMessage('Please add a valid email'),
    body('password').exists().withMessage('Password is required'),
    validateRequest
];

module.exports = {
    createProjectValidator,
    updateProjectValidator,
    createTaskValidator,
    updateTaskValidator,
    registerValidator,
    loginValidator
};
