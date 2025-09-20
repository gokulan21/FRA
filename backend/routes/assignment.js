const express = require('express');
const assignmentController = require('../controllers/assignmentController');
const { auth, authorizeMinistry, authorizeNGO, authorizeAny } = require('../middleware/auth');
const { uploadReport, handleUploadError } = require('../middleware/upload');

const router = express.Router();

// Ministry routes
router.post('/create', auth, authorizeMinistry, assignmentController.createAssignment);
router.get('/all', auth, authorizeMinistry, assignmentController.getAllAssignments);
router.get('/stats', auth, authorizeMinistry, assignmentController.getAssignmentStats);
router.delete('/:id', auth, authorizeMinistry, assignmentController.deleteAssignment);

// NGO routes
router.get('/my-assignments', auth, authorizeNGO, assignmentController.getNGOAssignments);
router.put('/:id/report', auth, authorizeNGO, (req, res, next) => {
    uploadReport(req, res, (err) => {
        if (err) return handleUploadError(err, req, res, next);
        assignmentController.submitAssignmentReport(req, res);
    });
});

// Common routes
router.get('/:id', auth, authorizeAny, assignmentController.getAssignmentById);
router.put('/:id/status', auth, authorizeAny, assignmentController.updateAssignmentStatus);

module.exports = router;
