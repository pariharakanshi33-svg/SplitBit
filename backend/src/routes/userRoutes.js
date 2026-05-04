/**
 * User Routes — API endpoints for user operations
 */

const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

router.post('/signup', (req, res) => userController.signup(req, res));
router.post('/login', (req, res) => userController.login(req, res));

// Keep existing routes
router.post('/users', (req, res) => userController.addFriend(req, res));
router.get('/users', (req, res) => userController.getUsers(req, res));
router.get('/users/:id', (req, res) => userController.getUser(req, res));
router.delete('/users/:id', (req, res) => userController.deleteUser(req, res));

module.exports = router;
