/**
 * Bill Service — Database Operations for Bills
 * 
 * Handles all bill-related database operations through Prisma.
 * Acts as the data access layer between controllers and the database.
 */

const prisma = require('../utils/prisma');

class BillDbService {
  /**
   * Create a new bill record
   */
  async createBill(data) {
    if (!data.userId) {
      throw new Error('userId is required to create a bill');
    }
    return prisma.bill.create({
      data: {
        userId: data.userId,
        groupId: data.groupId || null,
        merchantName: data.merchantName || null,
        imagePath: data.imagePath || null,
        rawText: data.rawText || null,
        totalAmount: data.totalAmount || 0,
        subtotal: data.subtotal || 0,
        taxAmount: data.taxAmount || 0,
        serviceCharge: data.serviceCharge || 0,
        tipAmount: data.tipAmount || 0,
        splitMethod: data.splitMethod || 'VEG_NONVEG',
        status: data.status || 'PENDING',
      },
      include: {
        group: true,
        items: true,
        participants: { include: { user: true } },
        settlements: { include: { fromUser: true, toUser: true } },
      }
    });
  }

  /**
   * Update an existing bill
   */
  async updateBill(id, data) {
    return prisma.bill.update({
      where: { id },
      data,
      include: {
        group: true,
        items: true,
        participants: { include: { user: true } },
        settlements: { include: { fromUser: true, toUser: true } },
      }
    });
  }

  /**
   * Add items to a bill
   */
  async addItems(billId, items) {
    return prisma.billItem.createMany({
      data: items.map(item => ({
        billId,
        name: item.name,
        price: item.price,
        quantity: item.quantity || 1,
        category: item.category || 'SHARED',
      }))
    });
  }

  /**
   * Add participants to a bill
   */
  async addParticipants(billId, participants) {
    return prisma.billParticipant.createMany({
      data: participants.map(p => ({
        billId,
        userId: p.userId,
        dietType: p.dietType,
        amountOwed: p.amountOwed || 0,
      }))
    });
  }

  /**
   * Update participant amounts after splitting
   */
  async updateParticipantAmounts(billId, splits) {
    const updates = splits.map(split =>
      prisma.billParticipant.updateMany({
        where: { billId, userId: split.userId },
        data: { amountOwed: split.amountOwed }
      })
    );
    return prisma.$transaction(updates);
  }

  /**
   * Add settlements to a bill
   */
  async addSettlements(billId, settlements) {
    return prisma.settlement.createMany({
      data: settlements.map(s => ({
        billId,
        fromUserId: s.fromUserId,
        toUserId: s.toUserId,
        amount: s.amount,
      }))
    });
  }

  /**
   * Get a bill by ID with all related data
   */
  async getBillById(id) {
    return prisma.bill.findUnique({
      where: { id },
      include: {
        group: true,
        items: true,
        participants: { include: { user: true } },
        settlements: { include: { fromUser: true, toUser: true } },
      }
    });
  }

  /**
   * Get all bills with optional filtering
   */
  async getAllBills({ userId, groupId, startDate, endDate, limit = 50, offset = 0 } = {}) {
    const where = {};
    
    if (userId) where.userId = userId;
    if (groupId) where.groupId = groupId;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const [bills, total] = await prisma.$transaction([
      prisma.bill.findMany({
        where,
        include: {
          group: true,
          items: true,
          participants: { include: { user: true } },
          settlements: { include: { fromUser: true, toUser: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.bill.count({ where })
    ]);

    return { bills, total, limit, offset };
  }

  /**
   * Mark a settlement as paid
   */
  async settlePayment(settlementId) {
    return prisma.settlement.update({
      where: { id: settlementId },
      data: { 
        settled: true,
        settledAt: new Date()
      },
      include: { fromUser: true, toUser: true }
    });
  }

  /**
   * Delete a bill and all associated data
   */
  async deleteBill(id) {
    return prisma.bill.delete({
      where: { id }
    });
  }
}

module.exports = new BillDbService();
