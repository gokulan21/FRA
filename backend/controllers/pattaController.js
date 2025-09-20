const Patta = require('../models/Patta');
const pdfExtractor = require('../utils/pdfExtractor');
const path = require('path');
const fs = require('fs');

exports.uploadPatta = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        const filePath = req.file.path;
        const fileName = req.file.originalname;
        
        // Extract data from PDF/DOC
        const extractedData = await pdfExtractor.extractPattaData(filePath);
        
        // Create patta record
        const patta = new Patta({
            claimantName: extractedData.claimantName || 'Unknown',
            district: extractedData.district || 'Unknown',
            village: extractedData.village || 'Unknown',
            state: extractedData.state || 'Unknown',
            approvalDate: extractedData.approvalDate || null,
            landArea: extractedData.landArea || null,
            coordinates: extractedData.coordinates || { latitude: null, longitude: null },
            filePath: filePath,
            extractedData: extractedData,
            uploadedBy: req.user.userId,
            isVerified: false
        });

        await patta.save();

        res.status(201).json({
            message: 'Patta uploaded and processed successfully',
            pattaId: patta._id,
            extractedData: extractedData,
            fileName: fileName
        });

    } catch (error) {
        console.error('Patta upload error:', error);
        res.status(500).json({ message: 'Error processing patta', error: error.message });
    }
};

exports.uploadMultiplePattas = async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ message: 'No files uploaded' });
        }

        const results = [];
        
        for (const file of req.files) {
            try {
                const extractedData = await pdfExtractor.extractPattaData(file.path);
                
                const patta = new Patta({
                    claimantName: extractedData.claimantName || 'Unknown',
                    district: extractedData.district || 'Unknown',
                    village: extractedData.village || 'Unknown',
                    state: extractedData.state || 'Unknown',
                    approvalDate: extractedData.approvalDate || null,
                    landArea: extractedData.landArea || null,
                    coordinates: extractedData.coordinates || { latitude: null, longitude: null },
                    filePath: file.path,
                    extractedData: extractedData,
                    uploadedBy: req.user.userId,
                    isVerified: false
                });

                await patta.save();
                
                results.push({
                    fileName: file.originalname,
                    pattaId: patta._id,
                    extractedData: extractedData,
                    status: 'success'
                });
                
            } catch (error) {
                results.push({
                    fileName: file.originalname,
                    error: error.message,
                    status: 'error'
                });
            }
        }

        res.status(201).json({
            message: `Processed ${results.length} files`,
            results: results
        });

    } catch (error) {
        console.error('Multiple patta upload error:', error);
        res.status(500).json({ message: 'Error processing pattas', error: error.message });
    }
};

exports.getAllPattas = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const filter = {};
        if (req.query.district) filter.district = new RegExp(req.query.district, 'i');
        if (req.query.state) filter.state = new RegExp(req.query.state, 'i');
        if (req.query.verified !== undefined) filter.isVerified = req.query.verified === 'true';
        if (req.query.search) {
            filter.$or = [
                { claimantName: new RegExp(req.query.search, 'i') },
                { district: new RegExp(req.query.search, 'i') },
                { village: new RegExp(req.query.search, 'i') }
            ];
        }

        const pattas = await Patta.find(filter)
            .populate('uploadedBy', 'email')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const total = await Patta.countDocuments(filter);

        res.json({
            pattas,
            pagination: {
                current: page,
                pages: Math.ceil(total / limit),
                total
            }
        });

    } catch (error) {
        console.error('Error fetching pattas:', error);
        res.status(500).json({ message: 'Error fetching pattas', error: error.message });
    }
};

exports.getPattaById = async (req, res) => {
    try {
        const patta = await Patta.findById(req.params.id).populate('uploadedBy', 'email');
        
        if (!patta) {
            return res.status(404).json({ message: 'Patta not found' });
        }

        res.json(patta);

    } catch (error) {
        console.error('Error fetching patta:', error);
        res.status(500).json({ message: 'Error fetching patta', error: error.message });
    }
};

exports.verifyPatta = async (req, res) => {
    try {
        const patta = await Patta.findById(req.params.id);
        
        if (!patta) {
            return res.status(404).json({ message: 'Patta not found' });
        }

        patta.isVerified = true;
        await patta.save();

        res.json({ message: 'Patta verified successfully', patta });

    } catch (error) {
        console.error('Error verifying patta:', error);
        res.status(500).json({ message: 'Error verifying patta', error: error.message });
    }
};

exports.updatePatta = async (req, res) => {
    try {
        const { claimantName, district, village, state, landArea, coordinates } = req.body;
        
        const patta = await Patta.findById(req.params.id);
        
        if (!patta) {
            return res.status(404).json({ message: 'Patta not found' });
        }

        // Update fields
        if (claimantName) patta.claimantName = claimantName;
        if (district) patta.district = district;
        if (village) patta.village = village;
        if (state) patta.state = state;
        if (landArea) patta.landArea = landArea;
        if (coordinates) patta.coordinates = coordinates;

        await patta.save();

        res.json({ message: 'Patta updated successfully', patta });

    } catch (error) {
        console.error('Error updating patta:', error);
        res.status(500).json({ message: 'Error updating patta', error: error.message });
    }
};

exports.deletePatta = async (req, res) => {
    try {
        const patta = await Patta.findById(req.params.id);
        
        if (!patta) {
            return res.status(404).json({ message: 'Patta not found' });
        }

        // Delete file from filesystem
        if (fs.existsSync(patta.filePath)) {
            fs.unlinkSync(patta.filePath);
        }

        await Patta.findByIdAndDelete(req.params.id);

        res.json({ message: 'Patta deleted successfully' });

    } catch (error) {
        console.error('Error deleting patta:', error);
        res.status(500).json({ message: 'Error deleting patta', error: error.message });
    }
};

exports.getPattaStats = async (req, res) => {
    try {
        const total = await Patta.countDocuments();
        const verified = await Patta.countDocuments({ isVerified: true });
        const pending = await Patta.countDocuments({ isVerified: false });
        
        // Get district-wise statistics
        const districtStats = await Patta.aggregate([
            {
                $group: {
                    _id: '$district',
                    count: { $sum: 1 },
                    verified: { $sum: { $cond: ['$isVerified', 1, 0] } }
                }
            },
            { $sort: { count: -1 } }
        ]);

        // Get monthly upload statistics
        const monthlyStats = await Patta.aggregate([
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

        res.json({
            total,
            verified,
            pending,
            districtStats,
            monthlyStats
        });

    } catch (error) {
        console.error('Error fetching patta statistics:', error);
        res.status(500).json({ message: 'Error fetching statistics', error: error.message });
    }
};

exports.getMapData = async (req, res) => {
    try {
        const pattas = await Patta.find({
            'coordinates.latitude': { $ne: null },
            'coordinates.longitude': { $ne: null }
        }).select('claimantName district village coordinates isVerified approvalDate');

        const mapData = pattas.map(patta => ({
            id: patta._id,
            name: patta.claimantName,
            district: patta.district,
            village: patta.village,
            lat: patta.coordinates.latitude,
            lng: patta.coordinates.longitude,
            verified: patta.isVerified,
            approvalDate: patta.approvalDate
        }));

        res.json(mapData);

    } catch (error) {
        console.error('Error fetching map data:', error);
        res.status(500).json({ message: 'Error fetching map data', error: error.message });
    }
};
