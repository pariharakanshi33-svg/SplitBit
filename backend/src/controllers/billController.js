/**
 * Bill Controller — Handles HTTP requests for bill operations
 * 
 * Orchestrates the full bill processing pipeline:
 * Upload → OCR → Parse → Classify → Split → Store
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
   * 
   * Upload a bill image and create a pending bill record.
   * Optionally includes group ID and participant preferences.
   * 
   * Body (multipart/form-data):
   * - billImage: file
   * - groupId: string (optional)
   * - participants: JSON string [{userId, dietType}]
   * - splitMethod: 'EQUAL' | 'VEG_NONVEG' | 'CUSTOM'
   */
  async uploadBill(req, res) {
    try {
      // Validate file upload
      if (!req.file) {
        return res.status(400).json({ error: 'Bill image is required' });
      }

      const { groupId, splitMethod = 'VEG_NONVEG', userId } = req.body;
      
      if (!userId) {
        return res.status(400).json({ error: 'userId is required' });
      }

      let participants = [];
      
      try {
        participants = req.body.participants ? JSON.parse(req.body.participants) : [];
      } catch (e) {
        return res.status(400).json({ error: 'Invalid participants format. Expected JSON array.' });
      }

      const bill = await billDbService.createBill({
        userId,
        groupId: groupId || null,
        imagePath: req.file.filename,
        splitMethod,
        status: 'PENDING',
      });

      console.log(`📝 Bill created: ${bill.id}`);

      res.status(201).json({
        message: 'Bill uploaded successfully',
        bill,
        nextStep: `POST /api/split with billId: ${bill.id}`
      });
    } catch (error) {
      console.error('Upload bill error:', error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * POST /api/analyze-bill
   * Runs OCR and classification without saving
   */
  async analyzeBill(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'Bill image is required' });
      }

      console.log('🔍 Running OCR analysis...');
      const imagePath = path.join(__dirname, '..', '..', 'uploads', req.file.filename);
      const rawText = await ocrService.extractText(imagePath);
      const parsed = billParserService.parse(rawText);
      const items = await classifierService.classifyItems(parsed.items);

      res.json({
        items,
        tax: parsed.tax,
        serviceCharge: parsed.serviceCharge,
        tip: parsed.tip,
        imagePath: req.file.filename // Send this back so we can use it in split
      });
    } catch (error) {
      console.error('Analyze bill error:', error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * POST /api/split
   * 
   * Process a bill: OCR → Parse → Classify → Split → Settle
   * This is the main processing endpoint.
   * 
   * Body:
   * - billId: string (required)
   * - participants: [{userId, dietType}] (required)
   * - splitMethod: 'EQUAL' | 'VEG_NONVEG' | 'CUSTOM'
   * - payerId: string (who paid the bill)
   * - customAmounts: {userId: amount} (for CUSTOM split)
   * - manualItems: [{name, price, quantity, category}] (optional, skip OCR)
   * - manualTax: number (optional)
   * - manualServiceCharge: number (optional)
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

      // Validate required fields
      if (!billId) {
        return res.status(400).json({ error: 'billId is required' });
      }
      if (!participants || participants.length === 0) {
        return res.status(400).json({ error: 'At least one participant is required' });
      }

      // Fetch the bill
      let bill = await billDbService.getBillById(billId);
      if (!bill) {
        return res.status(404).json({ error: 'Bill not found' });
      }

      // Update status to processing
      await billDbService.updateBill(billId, { status: 'PROCESSING' });

      let items, tax, serviceCharge, tip, merchantName;

      if (manualItems && manualItems.length > 0) {
        // ─── Manual items provided (skip OCR) ──────────────────
        console.log('📋 Using manually provided items');
        items = await classifierService.classifyItems(manualItems);
        tax = manualTax || 0;
        serviceCharge = manualServiceCharge || 0;
        tip = manualTip || 0;
        merchantName = manualMerchantName || null;
      } else if (bill.imagePath) {
        // ─── Run OCR Pipeline ──────────────────────────────────
        console.log('🔍 Running OCR pipeline...');
        const imagePath = path.join(__dirname, '..', '..', 'uploads', bill.imagePath);
        
        // Step 1: OCR
        const rawText = await ocrService.extractText(imagePath);
        
        // Step 2: Parse
        const parsed = billParserService.parse(rawText);
        
        // Step 3: Classify items
        items = await classifierService.classifyItems(parsed.items);
        tax = parsed.tax;
        serviceCharge = parsed.serviceCharge;
        tip = parsed.tip;
        merchantName = manualMerchantName || null;

        // Store raw text and merchant name
        await billDbService.updateBill(billId, { rawText, merchantName });
      } else {
        return res.status(400).json({ 
          error: 'No bill image or manual items provided. Cannot process.' 
        });
      }

      // ─── Step 4: Store items in database ────────────────────
      await billDbService.addItems(billId, items);

      // ─── Step 5: Add participants ───────────────────────────
      await billDbService.addParticipants(billId, participants);

      // ─── Step 6: Split the bill ─────────────────────────────
      const splits = splitService.split({
        items,
        participants,
        splitMethod,
        tax,
        serviceCharge,
        tip,
        customAmounts,
      });

      // Update participant amounts
      await billDbService.updateParticipantAmounts(billId, splits);

      // ─── Step 7: Calculate settlements ──────────────────────
      const settlements = settlementService.calculateSettlements(
        splits,
        payerId || participants[0].userId
      );
      await billDbService.addSettlements(billId, settlements);

      // ─── Step 8: Update bill totals and mark complete ───────
      const subtotal = items.reduce((sum, i) => sum + (i.price * (i.quantity || 1)), 0);
      const totalAmount = subtotal + tax + serviceCharge + tip;

      const completedBill = await billDbService.updateBill(billId, {
        subtotal,
        totalAmount,
        taxAmount: tax,
        serviceCharge,
        tipAmount: tip,
        splitMethod,
        status: 'COMPLETED',
        ...(merchantName && { merchantName })
      });

      // Get the full bill with all relations
      const fullBill = await billDbService.getBillById(billId);

      console.log(`✅ Bill ${billId} processed successfully!`);

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
        }
      });
    } catch (error) {
      console.error('Split bill error:', error);
      
      // Try to mark bill as failed
      if (req.body.billId) {
        try {
          await billDbService.updateBill(req.body.billId, { status: 'FAILED' });
        } catch (e) { /* ignore */ }
      }

      res.status(500).json({ error: error.message });
    }
  }

  /**
   * GET /api/bill/:id
   * Fetch a bill with all its details
   */
  async getBill(req, res) {
    try {
      const bill = await billDbService.getBillById(req.params.id);
      if (!bill) {
        return res.status(404).json({ error: 'Bill not found' });
      }
      res.json(bill);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * GET /api/history
   * Fetch bill history with optional filters
   * Query params: groupId, startDate, endDate, limit, offset
   */
  async getHistory(req, res) {
    try {
      const { userId, groupId, startDate, endDate, limit, offset } = req.query;
      
      if (!userId) {
        return res.status(400).json({ error: 'userId is required to fetch history' });
      }

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
   * Delete a bill
   */
  async deleteBill(req, res) {
    try {
      await billDbService.deleteBill(req.params.id);
      res.json({ message: 'Bill deleted successfully' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
}

module.exports = new BillController();
