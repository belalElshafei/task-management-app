const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: [true, 'Please add a task title'],
            trim: true,
        },
        description: {
            type: String,
        },
        project: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Project',
            required: true,
        },
        assignedTo: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User',
            },
        ],
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        status: {
            type: String,
            enum: ['todo', 'in-progress', 'completed', 'Todo', 'In Progress', 'Done'],
            default: 'Todo',
        },
        priority: {
            type: String,
            enum: ['low', 'medium', 'high', 'Low', 'Medium', 'High'],
            default: 'Medium',
        },
        deadline: {
            type: Date,
        },
        tags: [String],
    },
    {
        timestamps: true,
    }
);

taskSchema.index({ project: 1, createdAt: -1 });
taskSchema.index({ project: 1, status: 1 });
taskSchema.index({ project: 1, assignedTo: 1 });
taskSchema.index({ project: 1, createdBy: 1 });

module.exports = mongoose.model('Task', taskSchema);