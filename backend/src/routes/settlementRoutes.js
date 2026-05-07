/**
 * Settlement Routes — API endpoints for settlement operations (all protected)
 */

const express = require('express');
const router = express.Router();
const settlementController = require('../controllers/settlementController');
const requireAuth = require('../middleware/requireAuth');

// Mark a settlement as paid
router.post('/settlements/:id/settle', requireAuth, (req, res) => settlementController.settlePayment(req, res));

// Get minimized transactions for a group
router.get('/settlements/group/:groupId/minimize', requireAuth, (req, res) => settlementController.getMinimizedSettlements(req, res));

// Get settlements for the currently authenticated user
router.get('/settlements/me', requireAuth, (req, res) => settlementController.getMySettlements(req, res));

module.exports = router;
