/**
 * User Routes — Friend/stub user management (protected)
 * signup/login removed — Clerk handles auth
 */

const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const requireAuth = require('../middleware/requireAuth');

// Search for registered SplitBit users by email or name
router.get('/users/search', requireAuth, (req, res) => userController.searchUsers(req, res));

// Add a registered user as a friend/contact
router.post('/users/contacts', requireAuth, (req, res) => userController.addContact(req, res));

// Get all contacts for the logged in user
router.get('/users', requireAuth, (req, res) => userController.getUsers(req, res));

// Get a specific user
router.get('/users/:id', requireAuth, (req, res) => userController.getUser(req, res));

// Delete a user
router.delete('/users/:id', requireAuth, (req, res) => userController.deleteUser(req, res));

module.exports = router;
