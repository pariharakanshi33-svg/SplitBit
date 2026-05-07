/**
 * Bill Routes — API endpoints for bill operations (all protected)
 */

const express = require('express');
const router = express.Router();
const billController = require('../controllers/billController');
const upload = require('../middleware/upload');
const requireAuth = require('../middleware/requireAuth');

router.post('/upload-bill', requireAuth, upload.single('billImage'), (req, res) => billController.uploadBill(req, res));
router.post('/analyze-bill', requireAuth, upload.single('billImage'), (req, res) => billController.analyzeBill(req, res));
router.post('/split', requireAuth, (req, res) => billController.splitBill(req, res));
router.get('/bill/:id', requireAuth, (req, res) => billController.getBill(req, res));
router.get('/history', requireAuth, (req, res) => billController.getHistory(req, res));
router.delete('/bill/:id', requireAuth, (req, res) => billController.deleteBill(req, res));

module.exports = router;
