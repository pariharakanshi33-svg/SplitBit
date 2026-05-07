/**
 * Bill Controller — Handles HTTP requests for bill operations
 *
 * SECURITY: All endpoints require authentication.
 * req.userId is set by requireAuth middleware from the verified Clerk JWT.
 * Users can only access their own bills.
 */

const path = require('path');
const ocrService = require('../services/ocrService');
const billParserService = require('../services/billParserService');
const classifierService = require('../services/classifierService');
const splitService = require('../services/splitService');
const settlementService = require('../services/settlementService');
const billDbService = require('../services/billDbService');

class BillController {
  /**
   * POST /api/upload-bill
   */
  async uploadBill(req, res) {
    try {
      // req.file is optional if the user is using manual items
      const imagePath = req.file ? req.file.path : null;

      const { groupId, splitMethod = 'VEG_NONVEG' } = req.body;
      const userId = req.userId; // ← from requireAuth middleware

      let participants = [];
      try {
        participants = req.body.participants ? JSON.parse(req.body.participants) : [];
      } catch (e) {
        return res.status(400).json({ error: 'Invalid participants format. Expected JSON array.' });
      }

      const bill = await billDbService.createBill({
        userId,
        groupId: groupId || null,
        imagePath: imagePath, // Store the Cloudinary URL or null
        splitMethod,
        status: 'PENDING',
      });

      console.log(`📝 Bill created: ${bill.id} for user ${userId}`);

      res.status(201).json({
        message: 'Bill uploaded successfully',
        bill,
        nextStep: `POST /api/split with billId: ${bill.id}`,
      });
    } catch (error) {
      console.error('Upload bill error:', error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * POST /api/analyze-bill
   */
  async analyzeBill(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'Bill image is required' });
      }

      console.log('🔍 Running OCR analysis...');
      const imagePath = req.file.path; // Cloudinary URL
      const rawText = await ocrService.extractText(imagePath);
      const parsed = billParserService.parse(rawText);
      const items = await classifierService.classifyItems(parsed.items);

      res.json({
        items,
        tax: parsed.tax,
        serviceCharge: parsed.serviceCharge,
        tip: parsed.tip,
        imagePath: req.file.path,
      });
    } catch (error) {
      console.error('Analyze bill error:', error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * POST /api/split
   */
  async splitBill(req, res) {
    try {
      const {
        billId,
        participants,
        splitMethod = 'VEG_NONVEG',
        payerId,
        customAmounts = {},
        manualItems,
        manualTax,
        manualServiceCharge,
        manualTip,
        merchantName: manualMerchantName,
      } = req.body;

      if (!billId) return res.status(400).json({ error: 'billId is required' });
      if (!participants || participants.length === 0) {
        return res.status(400).json({ error: 'At least one participant is required' });
      }

      // Fetch and verify ownership
      let bill = await billDbService.getBillById(billId);
      if (!bill) return res.status(404).json({ error: 'Bill not found' });
      if (bill.userId !== req.userId) {
        return res.status(403).json({ error: 'Forbidden: This bill does not belong to you' });
      }

      await billDbService.updateBill(billId, { status: 'PROCESSING' });

      let items, tax, serviceCharge, tip, merchantName;

      if (manualItems && manualItems.length > 0) {
        console.log('📋 Using manually provided items');
        items = await classifierService.classifyItems(manualItems);
        tax = manualTax || 0;
        serviceCharge = manualServiceCharge || 0;
        tip = manualTip || 0;
        merchantName = manualMerchantName || null;
      } else if (bill.imagePath) {
        console.log('🔍 Running OCR pipeline...');
        const imagePath = bill.imagePath; // Cloudinary URL
        const rawText = await ocrService.extractText(imagePath);
        const parsed = billParserService.parse(rawText);
        items = await classifierService.classifyItems(parsed.items);
        tax = parsed.tax;
        serviceCharge = parsed.serviceCharge;
        tip = parsed.tip;
        merchantName = manualMerchantName || null;
        await billDbService.updateBill(billId, { rawText, merchantName });
      } else {
        return res.status(400).json({ error: 'No bill image or manual items provided.' });
      }

      await billDbService.addItems(billId, items);
      await billDbService.addParticipants(billId, participants);

      const splits = splitService.split({
        items,
        participants,
        splitMethod,
        tax,
        serviceCharge,
        tip,
        customAmounts,
      });

      await billDbService.updateParticipantAmounts(billId, splits);

      const settlements = settlementService.calculateSettlements(
        splits,
        payerId || participants[0].userId
      );
      await billDbService.addSettlements(billId, settlements);

      const subtotal = items.reduce((sum, i) => sum + (i.price * (i.quantity || 1)), 0);
      const totalAmount = subtotal + tax + serviceCharge + tip;

      await billDbService.updateBill(billId, {
        subtotal,
        totalAmount,
        taxAmount: tax,
        serviceCharge,
        tipAmount: tip,
        splitMethod,
        status: 'COMPLETED',
        ...(merchantName && { merchantName }),
      });

      const fullBill = await billDbService.getBillById(billId);
      console.log(`✅ Bill ${billId} processed successfully!`);

      // Temporary debug logging as requested
      console.log('\n=== CLASSIFICATION DEBUG OUTPUT ===');
      items.forEach(item => {
        let detectedIcon = 'none';
        if (item.source === 'bill_symbol') {
          if (item.category === 'VEG') detectedIcon = 'green';
          else if (item.category === 'NON_VEG') detectedIcon = 'red';
        }
        
        console.log(JSON.stringify({
          item: item.name,
          ocr_text: item.name, // Using the clean name as OCR text equivalent for now
          detected_icon: detectedIcon,
          classification: item.category ? item.category.toLowerCase() : null,
          source: item.source || 'ai_fallback',
          retry_attempts: require('../services/ocrService').lastRetryAttempts || 0
        }, null, 2));
      });
      console.log('===================================\n');

      res.json({
        message: 'Bill split successfully',
        bill: fullBill,
        summary: {
          subtotal,
          tax,
          serviceCharge,
          tip,
          totalAmount,
          splitMethod,
          itemBreakdown: classifierService.getSummary(items),
          splits,
          settlements,
        },
      });
    } catch (error) {
      console.error('Split bill error:', error);
      if (req.body.billId) {
        try { await billDbService.updateBill(req.body.billId, { status: 'FAILED' }); } catch (e) {}
      }
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * GET /api/bill/:id
   */
  async getBill(req, res) {
    try {
      const bill = await billDbService.getBillById(req.params.id);
      if (!bill) return res.status(404).json({ error: 'Bill not found' });
      if (bill.userId !== req.userId) {
        return res.status(403).json({ error: 'Forbidden' });
      }
      res.json(bill);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * GET /api/history
   * Returns only the authenticated user's bills.
   */
  async getHistory(req, res) {
    try {
      const { groupId, startDate, endDate, limit, offset } = req.query;
      const userId = req.userId; // Always scoped to current user

      const result = await billDbService.getAllBills({
        userId,
        groupId,
        startDate,
        endDate,
        limit: limit ? parseInt(limit) : 50,
        offset: offset ? parseInt(offset) : 0,
      });
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * DELETE /api/bill/:id
   */
  async deleteBill(req, res) {
    try {
      const bill = await billDbService.getBillById(req.params.id);
      if (!bill) return res.status(404).json({ error: 'Bill not found' });
      if (bill.userId !== req.userId) {
        return res.status(403).json({ error: 'Forbidden' });
      }
      await billDbService.deleteBill(req.params.id);
      res.json({ message: 'Bill deleted successfully' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
}

module.exports = new BillController();
