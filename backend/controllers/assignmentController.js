const Assignment = require('../models/Assignment');
const User = require('../models/User');
const emailService = require('../utils/emailService');

exports.createAssignment = async (req, res) => {
    try {
        const { ngoId, area, instructions, deadline, priority } = req.body;

        // Verify NGO exists and is approved
        const ngo = await User.findById(ngoId);
        if (!ngo || ngo.role !== 'ngo' || !ngo.isApproved) {
            return res.status(400).json({ message: 'Invalid or unapproved NGO' });
        }

        const assignment = new Assignment({
            assignedTo: ngoId,
            assignedBy: req.user.userId,
            area,
            instructions,
            deadline: new Date(deadline),
            priority: priority || 'medium',
            status: 'active'
        });

        await assignment.save();

        // Populate assignment with NGO details
        await assignment.populate('assignedTo', 'email profile.name');
        await assignment.populate('assignedBy', 'email');

        // Send notification email to NGO
        await emailService.sendAssignmentNotification(assignment);

        res.status(201).json({
            message: 'Assignment created successfully',
            assignment
        });

    } catch (error) {
        console.error('Error creating assignment:', error);
        res.status(500).json({ message: 'Error creating assignment', error: error.message });
    }
};

exports.getAllAssignments = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const filter = {};
        if (req.query.status) filter.status = req.query.status;
        if (req.query.priority) filter.priority = req.query.priority;
        if (req.query.ngoId) filter.assignedTo = req.query.ngoId;

        const assignments = await Assignment.find(filter)
            .populate('assignedTo', 'email profile.name profile.district')
            .populate('assignedBy', 'email')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const total = await Assignment.countDocuments(filter);

        res.json({
            assignments,
            pagination: {
                current: page,
                pages: Math.ceil(total / limit),
                total
            }
        });

    } catch (error) {
        console.error('Error fetching assignments:', error);
        res.status(500).json({ message: 'Error fetching assignments', error: error.message });
    }
};

exports.getAssignmentById = async (req, res) => {
    try {
        const assignment = await Assignment.findById(req.params.id)
            .populate('assignedTo', 'email profile')
            .populate('assignedBy', 'email');

        if (!assignment) {
            return res.status(404).json({ message: 'Assignment not found' });
        }

        res.json(assignment);

    } catch (error) {
        console.error('Error fetching assignment:', error);
        res.status(500).json({ message: 'Error fetching assignment', error: error.message });
    }
};

exports.updateAssignmentStatus = async (req, res) => {
    try {
        const { status, report, completionNotes } = req.body;
        const assignment = await Assignment.findById(req.params.id);

        if (!assignment) {
            return res.status(404).json({ message: 'Assignment not found' });
        }

        // Check if user is authorized to update this assignment
        const isNGO = req.user.role === 'ngo' && assignment.assignedTo.toString() === req.user.userId;
        const isMinistry = req.user.role === 'ministry';

        if (!isNGO && !isMinistry) {
            return res.status(403).json({ message: 'Not authorized to update this assignment' });
        }

        assignment.status = status;
        if (report) assignment.report = report;
        if (completionNotes) assignment.completionNotes = completionNotes;
        
        if (status === 'completed') {
            assignment.completedAt = new Date();
        }

        await assignment.save();
        await assignment.populate('assignedTo', 'email profile.name');
        await assignment.populate('assignedBy', 'email');

        // Send notification email
        if (status === 'completed') {
            await emailService.sendAssignmentCompletionNotification(assignment);
        }

        res.json({
            message: 'Assignment updated successfully',
            assignment
        });

    } catch (error) {
        console.error('Error updating assignment:', error);
        res.status(500).json({ message: 'Error updating assignment', error: error.message });
    }
};

exports.submitAssignmentReport = async (req, res) => {
    try {
        const { report, findings, recommendations, challenges } = req.body;
        const assignment = await Assignment.findById(req.params.id);

        if (!assignment) {
            return res.status(404).json({ message: 'Assignment not found' });
        }

        // Check if NGO is authorized to submit report
        if (assignment.assignedTo.toString() !== req.user.userId) {
            return res.status(403).json({ message: 'Not authorized to submit report for this assignment' });
        }

        assignment.report = {
            summary: report,
            findings: findings || [],
            recommendations: recommendations || [],
            challenges: challenges || [],
            submittedAt: new Date()
        };

        assignment.status = 'completed';
        assignment.completedAt = new Date();

        await assignment.save();
        await assignment.populate('assignedTo', 'email profile.name');
        await assignment.populate('assignedBy', 'email');

        // Send notification to ministry
        await emailService.sendReportSubmissionNotification(assignment);

        res.json({
            message: 'Report submitted successfully',
            assignment
        });

    } catch (error) {
        console.error('Error submitting report:', error);
        res.status(500).json({ message: 'Error submitting report', error: error.message });
    }
};

exports.getNGOAssignments = async (req, res) => {
    try {
        const ngoId = req.user.userId;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const filter = { assignedTo: ngoId };
        if (req.query.status) filter.status = req.query.status;

        const assignments = await Assignment.find(filter)
            .populate('assignedBy', 'email')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const total = await Assignment.countDocuments(filter);

        // Get assignment statistics
        const stats = {
            total: await Assignment.countDocuments({ assignedTo: ngoId }),
            active: await Assignment.countDocuments({ assignedTo: ngoId, status: 'active' }),
            completed: await Assignment.countDocuments({ assignedTo: ngoId, status: 'completed' }),
            overdue: await Assignment.countDocuments({ 
                assignedTo: ngoId, 
                status: 'active',
                deadline: { $lt: new Date() }
            })
        };

        res.json({
            assignments,
            stats,
            pagination: {
                current: page,
                pages: Math.ceil(total / limit),
                total
            }
        });

    } catch (error) {
        console.error('Error fetching NGO assignments:', error);
        res.status(500).json({ message: 'Error fetching assignments', error: error.message });
    }
};

exports.deleteAssignment = async (req, res) => {
    try {
        const assignment = await Assignment.findById(req.params.id);

        if (!assignment) {
            return res.status(404).json({ message: 'Assignment not found' });
        }

        // Only ministry can delete assignments
        if (req.user.role !== 'ministry') {
            return res.status(403).json({ message: 'Only ministry officials can delete assignments' });
        }

        await Assignment.findByIdAndDelete(req.params.id);

        res.json({ message: 'Assignment deleted successfully' });

    } catch (error) {
        console.error('Error deleting assignment:', error);
        res.status(500).json({ message: 'Error deleting assignment', error: error.message });
    }
};

exports.getAssignmentStats = async (req, res) => {
    try {
        const totalAssignments = await Assignment.countDocuments();
        const activeAssignments = await Assignment.countDocuments({ status: 'active' });
        const completedAssignments = await Assignment.countDocuments({ status: 'completed' });
        const overdueAssignments = await Assignment.countDocuments({ 
            status: 'active',
            deadline: { $lt: new Date() }
        });

        // Monthly assignment creation statistics
        const monthlyStats = await Assignment.aggregate([
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

        // Priority-wise distribution
        const priorityStats = await Assignment.aggregate([
            {
                $group: {
                    _id: '$priority',
                    count: { $sum: 1 }
                }
            }
        ]);

        res.json({
            total: totalAssignments,
            active: activeAssignments,
            completed: completedAssignments,
            overdue: overdueAssignments,
            monthlyStats,
            priorityStats
        });

    } catch (error) {
        console.error('Error fetching assignment statistics:', error);
        res.status(500).json({ message: 'Error fetching statistics', error: error.message });
    }
};