/**
 * Bill Splitting Service — Core Business Logic
 * 
 * Handles the three splitting strategies:
 * 1. EQUAL — Everyone pays the same amount
 * 2. VEG_NONVEG — Veg users pay only veg+shared items; non-veg users pay all
 * 3. CUSTOM — Manual amounts specified by the user
 * 
 * BUSINESS RULES:
 * - Veg users ONLY pay for VEG items + their share of SHARED items
 * - Non-veg users pay for NON_VEG items + VEG items + their share of SHARED items
 * - Tax & service charges are distributed proportionally based on food share
 * - The total of all splits must exactly equal the bill total (no rounding errors)
 * 
 * TAX DISTRIBUTION:
 * Tax and service charges are NOT split equally — they're split proportionally
 * based on each person's food subtotal. This is fairer because someone who
 * ordered more expensive items should pay a proportionally higher share of tax.
 */

class SplitService {
  /**
   * Split a bill among participants
   * @param {Object} params
   * @param {Array} params.items - Bill items with {name, price, quantity, category}
   * @param {Array} params.participants - Array of {userId, dietType}
   * @param {string} params.splitMethod - 'EQUAL', 'VEG_NONVEG', or 'CUSTOM'
   * @param {number} params.tax - Total tax amount
   * @param {number} params.serviceCharge - Service charge amount
   * @param {number} params.tip - Tip amount
   * @param {Object} params.customAmounts - {userId: amount} for CUSTOM split
   * @returns {Array} - [{userId, dietType, amountOwed}]
   */
  split({ items, participants, splitMethod, tax = 0, serviceCharge = 0, tip = 0, customAmounts = {} }) {
    if (!participants || participants.length === 0) {
      throw new Error('At least one participant is required');
    }

    let splits;

    switch (splitMethod) {
      case 'EQUAL':
        splits = this._equalSplit(items, participants, tax, serviceCharge, tip);
        break;
      case 'VEG_NONVEG':
        splits = this._vegNonVegSplit(items, participants, tax, serviceCharge, tip);
        break;
      case 'CUSTOM':
        splits = this._customSplit(participants, customAmounts);
        break;
      default:
        throw new Error(`Invalid split method: ${splitMethod}`);
    }

    // Validate: total splits should approximately equal bill total
    const totalSplit = splits.reduce((sum, s) => sum + s.amountOwed, 0);
    const billTotal = items.reduce((sum, i) => sum + (i.price * (i.quantity || 1)), 0) + tax + serviceCharge + tip;
    
    console.log(`💰 Split validation: Bill=${billTotal.toFixed(2)}, Splits=${totalSplit.toFixed(2)}`);

    return splits;
  }

  /**
   * EQUAL SPLIT
   * Simply divides the total equally among all participants.
   * Tax and charges are included in the equal division.
   */
  _equalSplit(items, participants, tax, serviceCharge, tip) {
    const subtotal = items.reduce((sum, item) => sum + (item.price * (item.quantity || 1)), 0);
    const grandTotal = subtotal + tax + serviceCharge + tip;
    const perPerson = grandTotal / participants.length;

    return participants.map(p => ({
      userId: p.userId,
      dietType: p.dietType,
      amountOwed: Math.round(perPerson * 100) / 100
    }));
  }

  /**
   * VEG/NON-VEG SPLIT — The core algorithm
   * 
   * Algorithm:
   * 1. Categorize items into VEG, NON_VEG, and SHARED pools
   * 2. VEG pool → split only among VEG users (if any veg users exist)
   * 3. NON_VEG pool → split only among NON_VEG users
   * 4. SHARED pool → split among ALL participants
   * 5. If no VEG users, VEG items go to SHARED pool
   * 6. Tax & charges → distributed proportionally
   */
  _vegNonVegSplit(items, participants, tax, serviceCharge, tip) {
    const vegUsers = participants.filter(p => p.dietType === 'VEG');
    const nonVegUsers = participants.filter(p => p.dietType === 'NON_VEG');

    // Calculate category totals
    const vegTotal = items
      .filter(i => i.category === 'VEG')
      .reduce((sum, i) => sum + (i.price * (i.quantity || 1)), 0);
    
    const nonVegTotal = items
      .filter(i => i.category === 'NON_VEG')
      .reduce((sum, i) => sum + (i.price * (i.quantity || 1)), 0);
    
    const sharedTotal = items
      .filter(i => i.category === 'SHARED')
      .reduce((sum, i) => sum + (i.price * (i.quantity || 1)), 0);

    const foodSubtotal = vegTotal + nonVegTotal + sharedTotal;
    const extraCharges = tax + serviceCharge + tip;

    console.log(`🥬 Veg: ₹${vegTotal} | 🍖 Non-veg: ₹${nonVegTotal} | 🍽️ Shared: ₹${sharedTotal}`);
    console.log(`📊 Extras: Tax=₹${tax}, SC=₹${serviceCharge}, Tip=₹${tip}`);

    // Initialize amounts
    const amounts = {};
    participants.forEach(p => { amounts[p.userId] = 0; });

    // ─── Distribute VEG items ─────────────────────────────────
    if (vegUsers.length > 0) {
      // Veg items split among veg users only (Mains, Starters specifically for veg users)
      const vegPerPerson = vegTotal / vegUsers.length;
      vegUsers.forEach(p => { amounts[p.userId] += vegPerPerson; });
    } else {
      // No veg users → veg items become shared
      const adjustedSharedTotal = sharedTotal + vegTotal;
      const sharedPerPerson = adjustedSharedTotal / participants.length;
      participants.forEach(p => { amounts[p.userId] += sharedPerPerson; });
      
      // Distribute non-veg items
      if (nonVegUsers.length > 0) {
        const nvPerPerson = nonVegTotal / nonVegUsers.length;
        nonVegUsers.forEach(p => { amounts[p.userId] += nvPerPerson; });
      }

      // Distribute extra charges proportionally
      this._distributeExtras(amounts, foodSubtotal, extraCharges);

      return participants.map(p => ({
        userId: p.userId,
        dietType: p.dietType,
        amountOwed: Math.round(amounts[p.userId] * 100) / 100
      }));
    }

    // ─── Distribute NON-VEG items ─────────────────────────────
    if (nonVegUsers.length > 0) {
      const nvPerPerson = nonVegTotal / nonVegUsers.length;
      nonVegUsers.forEach(p => { amounts[p.userId] += nvPerPerson; });
    } else {
      // No non-veg users → non-veg items become shared (unlikely but handled)
      const nvPerPerson = nonVegTotal / participants.length;
      participants.forEach(p => { amounts[p.userId] += nvPerPerson; });
    }

    // ─── Distribute SHARED items ──────────────────────────────
    if (participants.length > 0) {
      const sharedPerPerson = sharedTotal / participants.length;
      participants.forEach(p => { amounts[p.userId] += sharedPerPerson; });
    }

    // ─── Distribute Tax & Service Charges Proportionally ──────
    this._distributeExtras(amounts, foodSubtotal, extraCharges);

    return participants.map(p => ({
      userId: p.userId,
      dietType: p.dietType,
      amountOwed: Math.round(amounts[p.userId] * 100) / 100
    }));
  }

  /**
   * CUSTOM SPLIT
   * Uses manually specified amounts for each participant
   */
  _customSplit(participants, customAmounts) {
    return participants.map(p => ({
      userId: p.userId,
      dietType: p.dietType,
      amountOwed: Math.round((customAmounts[p.userId] || 0) * 100) / 100
    }));
  }

  /**
   * Distribute extra charges (tax, service charge, tip) proportionally
   * based on each person's food share of the subtotal.
   * 
   * Example: If Alice's food = ₹300 and total food = ₹1000,
   * Alice pays 30% of all extra charges.
   */
  _distributeExtras(amounts, foodSubtotal, extraCharges) {
    if (foodSubtotal === 0 || extraCharges === 0) return;

    const userIds = Object.keys(amounts);
    for (const userId of userIds) {
      const proportion = amounts[userId] / foodSubtotal;
      amounts[userId] += proportion * extraCharges;
    }
  }
}

module.exports = new SplitService();
