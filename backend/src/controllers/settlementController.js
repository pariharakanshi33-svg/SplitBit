/**
 * Settlement Controller — Handles settlement-related HTTP requests
 *
 * SECURITY: req.userId is set by requireAuth middleware.
 */

const billDbService = require('../services/billDbService');
const settlementService = require('../services/settlementService');
const prisma = require('../utils/prisma');

class SettlementController {
  /**
   * POST /api/settlements/:id/settle
   * Mark a settlement as paid
   */
  async settlePayment(req, res) {
    try {
      const settlement = await billDbService.settlePayment(req.params.id);
      res.json({ message: 'Payment settled successfully', settlement });
    } catch (error) {
      if (error.code === 'P2025') {
        return res.status(404).json({ error: 'Settlement not found' });
      }
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * GET /api/settlements/group/:groupId/minimize
   */
  async getMinimizedSettlements(req, res) {
    try {
      const { groupId } = req.params;

      const unsettled = await prisma.settlement.findMany({
        where: { settled: false, bill: { groupId } },
        include: { fromUser: true, toUser: true, bill: true },
      });

      if (unsettled.length === 0) {
        return res.json({ message: 'No unsettled debts in this group', settlements: [], minimized: [] });
      }

      const minimized = settlementService.minimizeTransactions(
        unsettled.map(s => ({ fromUserId: s.fromUserId, toUserId: s.toUserId, amount: s.amount }))
      );

      const userIds = new Set();
      minimized.forEach(m => { userIds.add(m.fromUserId); userIds.add(m.toUserId); });

      const users = await prisma.user.findMany({ where: { id: { in: [...userIds] } } });
      const userMap = Object.fromEntries(users.map(u => [u.id, u]));

      const minimizedWithNames = minimized.map(m => ({
        ...m,
        fromUser: userMap[m.fromUserId],
        toUser: userMap[m.toUserId],
      }));

      res.json({
        originalCount: unsettled.length,
        minimizedCount: minimized.length,
        savings: unsettled.length - minimized.length,
        minimized: minimizedWithNames,
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * GET /api/settlements/me
   * Get all settlements for the authenticated user (replaces /user/:userId)
   */
  async getMySettlements(req, res) {
    try {
      const userId = req.userId; // ← from requireAuth
      const { settled } = req.query;

      const where = {
        OR: [{ fromUserId: userId }, { toUserId: userId }],
      };
      if (settled !== undefined) {
        where.settled = settled === 'true';
      }

      const settlements = await prisma.settlement.findMany({
        where,
        include: { fromUser: true, toUser: true, bill: true },
        orderBy: { createdAt: 'desc' },
      });

      let totalOwed = 0;
      let totalOwing = 0;
      settlements.forEach(s => {
        if (!s.settled) {
          if (s.fromUserId === userId) totalOwed += s.amount;
          if (s.toUserId === userId) totalOwing += s.amount;
        }
      });

      res.json({
        settlements,
        balance: {
          totalOwed: Math.round(totalOwed * 100) / 100,
          totalOwing: Math.round(totalOwing * 100) / 100,
          net: Math.round((totalOwing - totalOwed) * 100) / 100,
        },
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
}

module.exports = new SettlementController();
