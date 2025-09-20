const express = require('express');
const policyController = require('../controllers/policyController');
const { auth, authorizeMinistry, authorizeAny } = require('../middleware/auth');
const { uploadPolicy, handleUploadError } = require('../middleware/upload');

const router = express.Router();

// Ministry routes for policy management
router.post('/upload', auth, authorizeMinistry, (req, res, next) => {
    uploadPolicy(req, res, (err) => {
        if (err) return handleUploadError(err, req, res, next);
        policyController.uploadPolicy(req, res);
    });
});

router.put('/:id', auth, authorizeMinistry, policyController.updatePolicy);
router.delete('/:id', auth, authorizeMinistry, policyController.deletePolicy);

// Common routes (accessible to both Ministry and NGO)
router.get('/list', auth, authorizeAny, policyController.getAllPolicies);
router.get('/categories', auth, authorizeAny, policyController.getPolicyCategories);
router.get('/stats', auth, authorizeMinistry, policyController.getPolicyStats);
router.get('/:id', auth, authorizeAny, policyController.getPolicyById);
router.get('/view/:id', auth, authorizeAny, policyController.viewPolicy);
router.get('/download/:id', auth, authorizeAny, policyController.downloadPolicy);

module.exports = router;
