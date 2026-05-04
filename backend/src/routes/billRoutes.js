/**
 * Bill Routes — API endpoints for bill operations
 */

const express = require('express');
const router = express.Router();
const billController = require('../controllers/billController');
const upload = require('../middleware/upload');

// Upload a bill image
router.post('/upload-bill', upload.single('billImage'), (req, res) => billController.uploadBill(req, res));

// Analyze a bill image (OCR + Parse)
router.post('/analyze-bill', upload.single('billImage'), (req, res) => billController.analyzeBill(req, res));

// Process and split a bill
router.post('/split', (req, res) => billController.splitBill(req, res));

// Get bill details
router.get('/bill/:id', (req, res) => billController.getBill(req, res));

// Get bill history
router.get('/history', (req, res) => billController.getHistory(req, res));

// Delete a bill
router.delete('/bill/:id', (req, res) => billController.deleteBill(req, res));

module.exports = router;
