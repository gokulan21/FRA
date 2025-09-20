const mongoose = require('mongoose');

const policySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        trim: true
    },
    category: {
        type: String,
        required: true,
        enum: [
            'Forest Rights Act',
            'Tribal Welfare',
            'Land Rights',
            'Environmental Guidelines',
            'Implementation Guidelines',
            'Legal Framework',
            'Procedures',
            'Forms and Templates',
            'Circulars',
            'Amendments',
            'General'
        ],
        default: 'General'
    },
    subcategory: {
        type: String,
        trim: true
    },
    policyNumber: {
        type: String,
        unique: true,
        sparse: true
    },
    issueDate: {
        type: Date
    },
    effectiveDate: {
        type: Date
    },
    expiryDate: {
        type: Date
    },
    applicableStates: [{
        type: String
    }],
    applicableDistricts: [{
        type: String
    }],
    targetAudience: [{
        type: String,
        enum: [
            'Ministry Officials',
            'NGOs',
            'Tribal Communities',
            'Local Administration',
            'Field Officers',
            'Legal Advisors',
            'General Public'
        ]
    }],
    priority: {
        type: String,
        enum: ['low', 'medium', 'high', 'critical'],
        default: 'medium'
    },
    version: {
        type: String,
        default: '1.0'
    },
    previousVersion: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Policy'
    },
    filePath: {
        type: String,
        required: true
    },
    fileName: {
        type: String,
        required: true
    },
    fileSize: {
        type: Number,
        required: true
    },
    mimeType: {
        type: String,
        required: true
    },
    uploadedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    approvedAt: {
        type: Date
    },
    isActive: {
        type: Boolean,
        default: true
    },
    isPublic: {
        type: Boolean,
        default: true
    },
    downloadCount: {
        type: Number,
        default: 0
    },
    viewCount: {
        type: Number,
        default: 0
    },
    tags: [{
        type: String,
        lowercase: true,
        trim: true
    }],
    relatedPolicies: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Policy'
    }],
    changelog: [{
        version: String,
        changes: String,
        changedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        changedAt: {
            type: Date,
            default: Date.now
        }
    }],
    metadata: {
        language: {
            type: String,
            default: 'English'
        },
        format: String,
        pages: Number,
        keywords: [String]
    }
}, {
    timestamps: true
});

// Indexes for better search performance
policySchema.index({ name: 'text', description: 'text', tags: 'text' });
policySchema.index({ category: 1, subcategory: 1 });
policySchema.index({ isActive: 1, isPublic: 1 });
policySchema.index({ effectiveDate: 1 });
policySchema.index({ applicableStates: 1 });
policySchema.index({ targetAudience: 1 });
policySchema.index({ uploadedBy: 1 });

// Virtual for checking if policy is expired
policySchema.virtual('isExpired').get(function() {
    return this.expiryDate && this.expiryDate < new Date();
});

// Virtual for file URL (if needed for API responses)
policySchema.virtual('fileUrl').get(function() {
    return `/api/policy/view/${this._id}`;
});

// Pre-save middleware to generate policy number if not provided
policySchema.pre('save', async function(next) {
    if (!this.policyNumber && this.isNew) {
        const year = new Date().getFullYear();
        const count = await this.constructor.countDocuments({
            createdAt: {
                $gte: new Date(year, 0, 1),
                $lt: new Date(year + 1, 0, 1)
            }
        });
        this.policyNumber = `POL-${year}-${String(count + 1).padStart(4, '0')}`;
    }
    next();
});

module.exports = mongoose.model('Policy', policySchema);