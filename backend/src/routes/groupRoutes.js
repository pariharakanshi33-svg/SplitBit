/**
 * Group Routes — API endpoints for group operations
 */

const express = require('express');
const router = express.Router();
const groupController = require('../controllers/groupController');

router.post('/groups', (req, res) => groupController.createGroup(req, res));
router.get('/groups', (req, res) => groupController.getGroups(req, res));
router.get('/groups/:id', (req, res) => groupController.getGroup(req, res));
router.delete('/groups/:id', (req, res) => groupController.deleteGroup(req, res));

// Group member management
router.post('/groups/:id/members', (req, res) => groupController.addMember(req, res));
router.delete('/groups/:id/members/:userId', (req, res) => groupController.removeMember(req, res));
router.patch('/groups/:id/members/:userId/diet', (req, res) => groupController.updateMemberDiet(req, res));

module.exports = router;
