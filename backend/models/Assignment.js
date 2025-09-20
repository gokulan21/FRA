const mongoose = require('mongoose');

const assignmentSchema = new mongoose.Schema({
    assignedTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    assignedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    title: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    area: {
        district: {
            type: String,
            required: true
        },
        villages: [{
            type: String
        }],
        coordinates: {
            latitude: Number,
            longitude: Number
        }
    },
    instructions: {
        type: String,
        required: true
    },
    objectives: [{
        type: String
    }],
    expectedDeliverables: [{
        type: String
    }],
    deadline: {
        type: Date,
        required: true
    },
    priority: {
        type: String,
        enum: ['low', 'medium', 'high', 'urgent'],
        default: 'medium'
    },
    status: {
        type: String,
        enum: ['active', 'in-progress', 'completed', 'cancelled', 'overdue'],
        default: 'active'
    },
    progress: {
        type: Number,
        min: 0,
        max: 100,
        default: 0
    },
    report: {
        summary: String,
        findings: [{
            type: String
        }],
        recommendations: [{
            type: String
        }],
        challenges: [{
            type: String
        }],
        beneficiariesReached: Number,
        villagesVisited: [{
            name: String,
            visitDate: Date,
            notes: String
        }],
        photosPath: [{
            type: String
        }],
        documentsPath: [{
            type: String
        }],
        submittedAt: Date
    },
    completionNotes: {
        type: String
    },
    completedAt: {
        type: Date
    },
    feedback: {
        rating: {
            type: Number,
            min: 1,
            max: 5
        },
        comments: String,
        givenBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        givenAt: Date
    },
    attachments: [{
        filename: String,
        path: String,
        uploadedAt: {
            type: Date,
            default: Date.now
        }
    }]
}, {
    timestamps: true
});

// Indexes for better query performance
assignmentSchema.index({ assignedTo: 1, status: 1 });
assignmentSchema.index({ assignedBy: 1 });
assignmentSchema.index({ deadline: 1 });
assignmentSchema.index({ 'area.district': 1 });
assignmentSchema.index({ priority: 1 });
assignmentSchema.index({ status: 1 });

// Virtual for checking if assignment is overdue
assignmentSchema.virtual('isOverdue').get(function() {
    return this.status === 'active' && this.deadline < new Date();
});

// Pre-save middleware to update status if overdue
assignmentSchema.pre('save', function(next) {
    if (this.status === 'active' && this.deadline < new Date()) {
        this.status = 'overdue';
    }
    next();
});

module.exports = mongoose.model('Assignment', assignmentSchema);