const express = require('express');
const ngoController = require('../controllers/ngoController');
const { auth, authorizeMinistry, authorizeNGO } = require('../middleware/auth');

const router = express.Router();

// Public route for NGO registration
router.post('/register', ngoController.registerNGO);

// Ministry routes for NGO management
router.get('/list', auth, authorizeMinistry, ngoController.getAllNGOs);
router.get('/stats', auth, authorizeMinistry, ngoController.getNGOStats);
router.put('/approve/:id', auth, authorizeMinistry, ngoController.approveNGO);
router.put('/reject/:id', auth, authorizeMinistry, ngoController.rejectNGO);

// NGO routes
router.get('/dashboard', auth, authorizeNGO, ngoController.getNGODashboard);
router.get('/:id', auth, ngoController.getNGOById);
router.put('/:id/profile', auth, authorizeNGO, ngoController.updateNGOProfile);

module.exports = router;
