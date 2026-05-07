/**
 * Auth Routes — Clerk user sync
 */

const express = require('express');
const router = express.Router();
const { getAuth } = require('@clerk/express');
const authController = require('../controllers/authController');

// POST /api/auth/sync
// Uses Clerk's getAuth to verify (no DB lookup — user may not exist yet)
router.post('/auth/sync', (req, res, next) => {
  const auth = getAuth(req);
  if (!auth?.userId) return res.status(401).json({ error: 'Unauthorized: No valid session' });
  next();
}, (req, res) => authController.syncUser(req, res));

module.exports = router;
