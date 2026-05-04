/**
 * Settlement Routes — API endpoints for settlement operations
 */

const express = require('express');
const router = express.Router();
const settlementController = require('../controllers/settlementController');

// Mark a settlement as paid
router.post('/settlements/:id/settle', (req, res) => settlementController.settlePayment(req, res));

// Get minimized transactions for a group
router.get('/settlements/group/:groupId/minimize', (req, res) => settlementController.getMinimizedSettlements(req, res));

// Get all settlements for a user
router.get('/settlements/user/:userId', (req, res) => settlementController.getUserSettlements(req, res));

module.exports = router;
