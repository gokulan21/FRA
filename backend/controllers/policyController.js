const Policy = require('../models/Policy');
const path = require('path');
const fs = require('fs');

exports.uploadPolicy = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        const { name, category, description } = req.body;
        const filePath = req.file.path;
        const fileName = req.file.originalname;

        const policy = new Policy({
            name: name || fileName,
            category: category || 'General',
            description: description || '',
            filePath: filePath,
            fileName: fileName,
            fileSize: req.file.size,
            mimeType: req.file.mimetype,
            uploadedBy: req.user.userId,
            isActive: true
        });

        await policy.save();

        res.status(201).json({
            message: 'Policy uploaded successfully',
            policy: {
                id: policy._id,
                name: policy.name,
                category: policy.category,
                description: policy.description,
                fileName: policy.fileName,
                uploadDate: policy.createdAt
            }
        });

    } catch (error) {
        console.error('Policy upload error:', error);
        res.status(500).json({ message: 'Error uploading policy', error: error.message });
    }
};

exports.getAllPolicies = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const filter = { isActive: true };
        if (req.query.category) filter.category = req.query.category;
        if (req.query.search) {
            filter.$or = [
                { name: new RegExp(req.query.search, 'i') },
                { description: new RegExp(req.query.search, 'i') }
            ];
        }

        const policies = await Policy.find(filter)
            .populate('uploadedBy', 'email')
            .select('-filePath') // Don't expose file paths
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const total = await Policy.countDocuments(filter);

        res.json({
            policies,
            pagination: {
                current: page,
                pages: Math.ceil(total / limit),
                total
            }
        });

    } catch (error) {
        console.error('Error fetching policies:', error);
        res.status(500).json({ message: 'Error fetching policies', error: error.message });
    }
};

exports.getPolicyById = async (req, res) => {
    try {
        const policy = await Policy.findById(req.params.id)
            .populate('uploadedBy', 'email');

        if (!policy || !policy.isActive) {
            return res.status(404).json({ message: 'Policy not found' });
        }

        res.json({
            id: policy._id,
            name: policy.name,
            category: policy.category,
            description: policy.description,
            fileName: policy.fileName,
            fileSize: policy.fileSize,
            uploadDate: policy.createdAt,
            uploadedBy: policy.uploadedBy
        });

    } catch (error) {
        console.error('Error fetching policy:', error);
        res.status(500).json({ message: 'Error fetching policy', error: error.message });
    }
};

exports.downloadPolicy = async (req, res) => {
    try {
        const policy = await Policy.findById(req.params.id);

        if (!policy || !policy.isActive) {
            return res.status(404).json({ message: 'Policy not found' });
        }

        const filePath = policy.filePath;
        
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ message: 'Policy file not found on server' });
        }

        // Update download count
        policy.downloadCount = (policy.downloadCount || 0) + 1;
        await policy.save();

        res.download(filePath, policy.fileName);

    } catch (error) {
        console.error('Error downloading policy:', error);
        res.status(500).json({ message: 'Error downloading policy', error: error.message });
    }
};

exports.viewPolicy = async (req, res) => {
    try {
        const policy = await Policy.findById(req.params.id);

        if (!policy || !policy.isActive) {
            return res.status(404).json({ message: 'Policy not found' });
        }

        const filePath = policy.filePath;
        
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ message: 'Policy file not found on server' });
        }

        // Update view count
        policy.viewCount = (policy.viewCount || 0) + 1;
        await policy.save();

        res.sendFile(path.resolve(filePath));

    } catch (error) {
        console.error('Error viewing policy:', error);
        res.status(500).json({ message: 'Error viewing policy', error: error.message });
    }
};

exports.updatePolicy = async (req, res) => {
    try {
        const { name, category, description } = req.body;
        const policy = await Policy.findById(req.params.id);

        if (!policy) {
            return res.status(404).json({ message: 'Policy not found' });
        }

        // Update fields
        if (name) policy.name = name;
        if (category) policy.category = category;
        if (description) policy.description = description;

        await policy.save();

        res.json({
            message: 'Policy updated successfully',
            policy: {
                id: policy._id,
                name: policy.name,
                category: policy.category,
                description: policy.description
            }
        });

    } catch (error) {
        console.error('Error updating policy:', error);
        res.status(500).json({ message: 'Error updating policy', error: error.message });
    }
};

exports.deletePolicy = async (req, res) => {
    try {
        const policy = await Policy.findById(req.params.id);

        if (!policy) {
            return res.status(404).json({ message: 'Policy not found' });
        }

        // Soft delete - mark as inactive
        policy.isActive = false;
        await policy.save();

        res.json({ message: 'Policy deleted successfully' });

    } catch (error) {
        console.error('Error deleting policy:', error);
        res.status(500).json({ message: 'Error deleting policy', error: error.message });
    }
};

exports.getPolicyCategories = async (req, res) => {
    try {
        const categories = await Policy.distinct('category', { isActive: true });
        res.json(categories);

    } catch (error) {
        console.error('Error fetching policy categories:', error);
        res.status(500).json({ message: 'Error fetching categories', error: error.message });
    }
};

exports.getPolicyStats = async (req, res) => {
    try {
        const totalPolicies = await Policy.countDocuments({ isActive: true });
        
        // Category-wise distribution
        const categoryStats = await Policy.aggregate([
            { $match: { isActive: true } },
            {
                $group: {
                    _id: '$category',
                    count: { $sum: 1 },
                    totalDownloads: { $sum: '$downloadCount' },
                    totalViews: { $sum: '$viewCount' }
                }
            },
            { $sort: { count: -1 } }
        ]);

        // Monthly upload statistics
        const monthlyStats = await Policy.aggregate([
            { $match: { isActive: true } },
            {
                $group: {
                    _id: {
                        year: { $year: '$createdAt' },
                        month: { $month: '$createdAt' }
                    },
                    count: { $sum: 1 }
                }
            },
            { $sort: { '_id.year': -1, '_id.month': -1 } },
            { $limit: 12 }
        ]);

        // Most downloaded policies
        const popularPolicies = await Policy.find({ isActive: true })
            .sort({ downloadCount: -1 })
            .limit(5)
            .select('name downloadCount viewCount');

        res.json({
            total: totalPolicies,
            categoryStats,
            monthlyStats,
            popularPolicies
        });

    } catch (error) {
        console.error('Error fetching policy statistics:', error);
        res.status(500).json({ message: 'Error fetching statistics', error: error.message });
    }
};