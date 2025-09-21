const User = require('../models/User');
const Assignment = require('../models/Assignment');
const emailService = require('../utils/emailService');

exports.registerNGO = async (req, res) => {
    try {
        const { email, password, profile } = req.body;

        // Check if NGO already exists
        const existingNGO = await User.findOne({ email, role: 'ngo' });
        if (existingNGO) {
            return res.status(400).json({ message: 'NGO already registered with this email' });
        }

        // Create new NGO user
        const ngo = new User({
            email,
            password,
            role: 'ngo',
            profile: {
                name: profile.name,
                organization: profile.organization,
                district: profile.district,
                areaOfOperation: profile.areaOfOperation,
                contactNumber: profile.contactNumber,
                address: profile.address
            },
            isApproved: false
        });

        await ngo.save();

        // Send notification email to ministry
        await emailService.sendNGORegistrationNotification(ngo);

        res.status(201).json({
            message: 'NGO registration submitted successfully. Awaiting ministry approval.',
            ngoId: ngo._id
        });

    } catch (error) {
        console.error('NGO registration error:', error);
        res.status(500).json({ message: 'Registration failed', error: error.message });
    }
};

exports.getAllNGOs = async (req, res) => {
    try {
        console.log('Getting all NGOs - Query params:', req.query); // Debug log
        
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const filter = { role: 'ngo' };
        if (req.query.approved !== undefined) {
            filter.isApproved = req.query.approved === 'true';
        }
        if (req.query.district) {
            filter['profile.district'] = new RegExp(req.query.district, 'i');
        }

        console.log('NGO filter:', filter); // Debug log

        const ngos = await User.find(filter)
            .select('-password')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const total = await User.countDocuments(filter);

        console.log('Found NGOs:', ngos.length, 'Total:', total); // Debug log

        res.json({
            ngos,
            pagination: {
                current: page,
                pages: Math.ceil(total / limit),
                total
            }
        });

    } catch (error) {
        console.error('Error fetching NGOs:', error);
        res.status(500).json({ message: 'Error fetching NGOs', error: error.message });
    }
};

exports.approveNGO = async (req, res) => {
    try {
        const ngo = await User.findById(req.params.id);
        
        if (!ngo || ngo.role !== 'ngo') {
            return res.status(404).json({ message: 'NGO not found' });
        }

        ngo.isApproved = true;
        await ngo.save();

        // Send approval email
        await emailService.sendNGOApprovalEmail(ngo);

        res.json({ message: 'NGO approved successfully', ngo: { id: ngo._id, email: ngo.email, profile: ngo.profile } });

    } catch (error) {
        console.error('Error approving NGO:', error);
        res.status(500).json({ message: 'Error approving NGO', error: error.message });
    }
};

exports.rejectNGO = async (req, res) => {
    try {
        const { reason } = req.body;
        const ngo = await User.findById(req.params.id);
        
        if (!ngo || ngo.role !== 'ngo') {
            return res.status(404).json({ message: 'NGO not found' });
        }

        // Send rejection email
        await emailService.sendNGORejectionEmail(ngo, reason);

        // Delete the NGO record
        await User.findByIdAndDelete(req.params.id);

        res.json({ message: 'NGO registration rejected successfully' });

    } catch (error) {
        console.error('Error rejecting NGO:', error);
        res.status(500).json({ message: 'Error rejecting NGO', error: error.message });
    }
};

exports.getNGOById = async (req, res) => {
    try {
        const ngo = await User.findById(req.params.id).select('-password');
        
        if (!ngo || ngo.role !== 'ngo') {
            return res.status(404).json({ message: 'NGO not found' });
        }

        res.json(ngo);

    } catch (error) {
        console.error('Error fetching NGO:', error);
        res.status(500).json({ message: 'Error fetching NGO', error: error.message });
    }
};

exports.updateNGOProfile = async (req, res) => {
    try {
        const { profile } = req.body;
        const ngo = await User.findById(req.params.id);
        
        if (!ngo || ngo.role !== 'ngo') {
            return res.status(404).json({ message: 'NGO not found' });
        }

        // Update profile fields
        if (profile.name) ngo.profile.name = profile.name;
        if (profile.organization) ngo.profile.organization = profile.organization;
        if (profile.district) ngo.profile.district = profile.district;
        if (profile.areaOfOperation) ngo.profile.areaOfOperation = profile.areaOfOperation;
        if (profile.contactNumber) ngo.profile.contactNumber = profile.contactNumber;
        if (profile.address) ngo.profile.address = profile.address;

        await ngo.save();

        res.json({ message: 'NGO profile updated successfully', ngo: { id: ngo._id, profile: ngo.profile } });

    } catch (error) {
        console.error('Error updating NGO profile:', error);
        res.status(500).json({ message: 'Error updating profile', error: error.message });
    }
};

exports.getNGOStats = async (req, res) => {
    try {
        const totalNGOs = await User.countDocuments({ role: 'ngo' });
        const approvedNGOs = await User.countDocuments({ role: 'ngo', isApproved: true });
        const pendingApproval = await User.countDocuments({ role: 'ngo', isApproved: false });
        
        const activeAssignments = await Assignment.countDocuments({ status: 'active' });
        const completedAssignments = await Assignment.countDocuments({ status: 'completed' });
        const pendingAssignments = await Assignment.countDocuments({ status: 'pending' });

        // District-wise NGO distribution
        const districtDistribution = await User.aggregate([
            { $match: { role: 'ngo', isApproved: true } },
            {
                $group: {
                    _id: '$profile.district',
                    count: { $sum: 1 }
                }
            },
            { $sort: { count: -1 } }
        ]);

        res.json({
            total: totalNGOs,
            active: approvedNGOs,
            pending: pendingApproval,
            assignments: {
                active: activeAssignments,
                completed: completedAssignments,
                pending: pendingAssignments,
                pendingAssignments: pendingAssignments
            },
            districtDistribution
        });

    } catch (error) {
        console.error('Error fetching NGO statistics:', error);
        res.status(500).json({ message: 'Error fetching statistics', error: error.message });
    }
};

exports.getNGODashboard = async (req, res) => {
    try {
        const ngoId = req.user.userId;
        
        // Get NGO assignments
        const assignments = await Assignment.find({ assignedTo: ngoId })
            .sort({ createdAt: -1 })
            .limit(10);

        // Get assignment statistics
        const totalAssignments = await Assignment.countDocuments({ assignedTo: ngoId });
        const completedAssignments = await Assignment.countDocuments({ assignedTo: ngoId, status: 'completed' });
        const activeAssignments = await Assignment.countDocuments({ assignedTo: ngoId, status: 'active' });
        const overdueAssignments = await Assignment.countDocuments({ 
            assignedTo: ngoId, 
            status: 'active',
            deadline: { $lt: new Date() }
        });

        res.json({
            assignments,
            stats: {
                total: totalAssignments,
                completed: completedAssignments,
                active: activeAssignments,
                overdue: overdueAssignments
            }
        });

    } catch (error) {
        console.error('Error fetching NGO dashboard:', error);
        res.status(500).json({ message: 'Error fetching dashboard data', error: error.message });
    }
};