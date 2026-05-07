/**
 * Group Routes — API endpoints for group operations (all protected)
 */

const express = require('express');
const router = express.Router();
const groupController = require('../controllers/groupController');
const requireAuth = require('../middleware/requireAuth');

router.post('/groups', requireAuth, (req, res) => groupController.createGroup(req, res));
router.get('/groups', requireAuth, (req, res) => groupController.getGroups(req, res));
router.get('/groups/:id', requireAuth, (req, res) => groupController.getGroup(req, res));
router.delete('/groups/:id', requireAuth, (req, res) => groupController.deleteGroup(req, res));

router.post('/groups/:id/members', requireAuth, (req, res) => groupController.addMember(req, res));
router.delete('/groups/:id/members/:userId', requireAuth, (req, res) => groupController.removeMember(req, res));
router.patch('/groups/:id/members/:userId/diet', requireAuth, (req, res) => groupController.updateMemberDiet(req, res));

module.exports = router;
