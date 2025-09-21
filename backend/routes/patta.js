const express = require('express');
const pattaController = require('../controllers/pattaController');
const { auth, authorizeMinistry } = require('../middleware/auth');
const { uploadPatta, uploadMultiplePatta, handleUploadError } = require('../middleware/upload');

const router = express.Router();

// Upload single patta
router.post('/upload', auth, authorizeMinistry, (req, res, next) => {
    uploadPatta(req, res, (err) => {
        if (err) return handleUploadError(err, req, res, next);
        pattaController.uploadPatta(req, res);
    });
});

// Upload multiple pattas
router.post('/upload-multiple', auth, authorizeMinistry, (req, res, next) => {
    uploadMultiplePatta(req, res, (err) => {
        if (err) return handleUploadError(err, req, res, next);
        pattaController.uploadMultiplePattas(req, res);
    });
});

// Get all pattas with pagination and filtering
router.get('/', auth, pattaController.getAllPattas);

// Get patta statistics
router.get('/stats', auth, pattaController.getPattaStats);

// Get map data for all pattas
router.get('/map-data', auth, pattaController.getMapData);

// Get specific patta by ID
router.get('/:id', auth, pattaController.getPattaById);

// Update patta information
router.put('/:id', auth, authorizeMinistry, pattaController.updatePatta);

// Verify patta
router.put('/:id/verify', auth, authorizeMinistry, pattaController.verifyPatta);

// Delete patta
router.delete('/:id', auth, authorizeMinistry, pattaController.deletePatta);

// Manual patta addition for map
router.post('/manual-add', auth, authorizeMinistry, pattaController.manualAddPatta);

module.exports = router;
