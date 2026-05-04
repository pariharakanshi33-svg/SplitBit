/**
 * Settlement Service — Who Owes Whom
 * 
 * Calculates the minimum number of transactions needed to settle debts
 * among a group of participants after bill splitting.
 * 
 * SETTLEMENT ALGORITHM:
 * 1. Calculate the average amount each person should pay (fair share)
 * 2. Determine who paid more than their share (creditors) and who paid less (debtors)
 * 3. Match debtors to creditors, minimizing the total number of transactions
 * 
 * For this app, we simplify: the bill is paid by one person, and we calculate
 * how much each participant owes the payer.
 * 
 * TRANSACTION MINIMIZATION:
 * Uses a greedy algorithm to match the largest debtor with the largest creditor,
 * settling as much as possible in each transaction. This produces near-optimal
 * results (optimal requires NP-hard subset sum solving).
 */

class SettlementService {
  /**
   * Calculate settlements for a bill
   * Each participant owes their split amount. We generate settlement
   * records showing who should pay whom.
   * 
   * @param {Array} splits - [{userId, amountOwed}]
   * @param {string} payerId - The user who paid the bill
   * @returns {Array} - [{fromUserId, toUserId, amount}]
   */
  calculateSettlements(splits, payerId) {
    if (!splits || splits.length === 0) return [];
    if (!payerId) {
      // If no payer specified, first participant is assumed to be the payer
      payerId = splits[0].userId;
    }

    const settlements = [];

    // Each non-payer participant owes their share to the payer
    for (const split of splits) {
      if (split.userId !== payerId && split.amountOwed > 0) {
        settlements.push({
          fromUserId: split.userId,
          toUserId: payerId,
          amount: Math.round(split.amountOwed * 100) / 100
        });
      }
    }

    return settlements;
  }

  /**
   * Minimize transactions across multiple bills in a group
   * 
   * When a group has multiple unsettled bills, we can consolidate
   * debts to minimize the number of payments needed.
   * 
   * Algorithm:
   * 1. Calculate net balance for each person across all bills
   * 2. Separate into creditors (positive balance) and debtors (negative balance)
   * 3. Greedily match largest debtor with largest creditor
   * 
   * @param {Array} allSettlements - All unsettled settlements in the group
   * @returns {Array} - Minimized [{fromUserId, toUserId, amount}]
   */
  minimizeTransactions(allSettlements) {
    // Calculate net balances
    const balances = {};

    for (const s of allSettlements) {
      balances[s.fromUserId] = (balances[s.fromUserId] || 0) - s.amount;
      balances[s.toUserId] = (balances[s.toUserId] || 0) + s.amount;
    }

    // Separate creditors and debtors
    const creditors = []; // People owed money (positive balance)
    const debtors = [];   // People who owe money (negative balance)

    for (const [userId, balance] of Object.entries(balances)) {
      if (balance > 0.01) {
        creditors.push({ userId, amount: balance });
      } else if (balance < -0.01) {
        debtors.push({ userId, amount: -balance }); // Make positive for easier math
      }
    }

    // Sort by amount (largest first) for greedy matching
    creditors.sort((a, b) => b.amount - a.amount);
    debtors.sort((a, b) => b.amount - a.amount);

    // Greedy matching
    const minimized = [];
    let ci = 0, di = 0;

    while (ci < creditors.length && di < debtors.length) {
      const settleAmount = Math.min(creditors[ci].amount, debtors[di].amount);

      if (settleAmount > 0.01) {
        minimized.push({
          fromUserId: debtors[di].userId,
          toUserId: creditors[ci].userId,
          amount: Math.round(settleAmount * 100) / 100
        });
      }

      creditors[ci].amount -= settleAmount;
      debtors[di].amount -= settleAmount;

      if (creditors[ci].amount < 0.01) ci++;
      if (debtors[di].amount < 0.01) di++;
    }

    return minimized;
  }
}

module.exports = new SettlementService();
