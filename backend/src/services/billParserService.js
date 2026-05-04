/**
 * Bill Parser Service — Text to Structured Data
 * 
 * Parses raw OCR text into structured bill data:
 * - Extracts individual line items with prices
 * - Detects subtotal, tax, service charge, tip, and total
 * - Handles common OCR misreadings and formatting issues
 * 
 * PARSING STRATEGY:
 * 1. Split text into lines
 * 2. For each line, try to extract item name + price using regex patterns
 * 3. Identify special lines (tax, total, service charge) by keyword matching
 * 4. Handle quantity notation (e.g., "2x Butter Chicken 450")
 */

class BillParserService {
  constructor() {
    // Common patterns for price extraction
    // Updated to handle trailing noise and commas in numbers
    this.pricePatterns = [
      /^(.+?)\s+[\$₹]?\s*([\d,]+\.?\d*)[^\d]*$/i,
      /^(.+?)\.{2,}\s*[\$₹]?\s*([\d,]+\.?\d*)[^\d]*$/i,
      /^(.+?)\s*[-–—]\s*[\$₹]?\s*([\d,]+\.?\d*)[^\d]*$/i,
    ];

    // Keywords indicating tax/charges (case-insensitive matching)
    this.taxKeywords = ['tax', 'gst', 'vat', 'cgst', 'sgst', 'igst', 'sales tax', 'service tax'];
    this.serviceChargeKeywords = ['service charge', 'service fee', 'svc charge', 'svc chg', 'sc'];
    this.tipKeywords = ['tip', 'gratuity'];
    this.totalKeywords = ['total', 'grand total', 'net total', 'amount due', 'bill total', 'net amount'];
    this.subtotalKeywords = ['subtotal', 'sub total', 'sub-total', 'food total', 'item total'];
    this.discountKeywords = ['discount', 'disc', 'off', 'promo'];
    
    // Keywords to skip (headers, footers, etc.)
    // Use word boundaries to avoid skipping items like "Paneer" (contains "pan")
    this.skipPatterns = [
      /\bthank you\b/i, /\bvisit again\b/i, /\binvoice\b/i, /\breceipt\b/i, /\bdate\b/i, /\btime\b/i,
      /\btable/i, /\border\b/i, /\bserver\b/i, /\bcashier\b/i, /\bphone\b/i, /\baddress\b/i,
      /\bfssai\b/i, /\bgstin\b/i, /\btin\b/i, /\bpan\b/i, /\bbill no\b/i, /\bcheck no\b/i,
      /\bpayment\b/i, /\bpaid\b/i, /\bcustomer\b/i, /\bchange due\b/i, /\bcash\b/i, /\bcard\b/i,
      /\bbengaluru\b/i, /\d{6}/, /\btoken\b/i, /sn\./i, /sr\./i, /s\.no/i, /waseeb/i
    ];
  }

  /**
   * Parse raw OCR text into structured bill data
   * @param {string} rawText - Raw text from OCR
   * @returns {Object} - Parsed bill with items, totals, and charges
   */
  parse(rawText) {
    if (!rawText || typeof rawText !== 'string') {
      return { items: [], subtotal: 0, tax: 0, serviceCharge: 0, tip: 0, total: 0 };
    }

    const lines = rawText
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);

    const result = {
      items: [],
      subtotal: 0,
      tax: 0,
      serviceCharge: 0,
      tip: 0,
      total: 0,
      discount: 0,
      merchantName: null
    };

    let firstValidLine = null;

    for (const line of lines) {
      const lowerLine = line.toLowerCase();
      
      if (!firstValidLine && !this._shouldSkipLine(lowerLine)) {
        firstValidLine = line;
      }

      // Check for special line types (tax, total, etc.) FIRST
      // This prevents skipping lines that contain both a skip keyword and a total (e.g. "Thank you Grand Total")
      if (this._tryExtractSpecialLine(lowerLine, line, result)) continue;

      // Skip irrelevant lines (headers, footers, metadata)
      if (this._shouldSkipLine(lowerLine)) continue;

      // Try to extract as a regular item
      const item = this._tryExtractItem(line);
      if (item) {
        result.items.push(item);
      }
    }

    // Calculate subtotal from items if not explicitly found
    if (result.subtotal === 0 && result.items.length > 0) {
      result.subtotal = result.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    }

    // If total not found, calculate it
    if (result.total === 0) {
      result.total = result.subtotal + result.tax + result.serviceCharge + result.tip - result.discount;
    }

    // Round all monetary values to 2 decimal places
    result.subtotal = Math.round(result.subtotal * 100) / 100;
    result.tax = Math.round(result.tax * 100) / 100;
    result.serviceCharge = Math.round(result.serviceCharge * 100) / 100;
    result.tip = Math.round(result.tip * 100) / 100;
    result.total = Math.round(result.total * 100) / 100;
    result.discount = Math.round(result.discount * 100) / 100;
    
    if (firstValidLine) {
      // Clean up common leading/trailing characters for the merchant name
      result.merchantName = firstValidLine.replace(/^[|iIf\[\]{}()©®]+\s*/g, '').trim();
    }

    console.log(`📋 Parsed ${result.items.length} items. Total: ${result.total}. Merchant: ${result.merchantName}`);
    return result;
  }

  /**
   * Check if a line should be skipped (headers, footers, etc.)
   */
  _shouldSkipLine(lowerLine) {
    return this.skipPatterns.some(pattern => pattern.test(lowerLine));
  }

  /**
   * Try to extract special line data (tax, service charge, total, etc.)
   * @returns {boolean} - true if line was a special line
   */
  _tryExtractSpecialLine(lowerLine, originalLine, result) {
    let price = this._extractPrice(originalLine);
    if (price === null) return false;

    // Check each special keyword category
    if (this.taxKeywords.some(kw => lowerLine.includes(kw))) {
      // Fix missing decimal point in tax (OCR often reads 44.50 as 4450)
      if (result.subtotal > 0 && price > result.subtotal) price = price / 100;
      result.tax += price;
      return true;
    }
    if (this.serviceChargeKeywords.some(kw => lowerLine.includes(kw))) {
      if (result.subtotal > 0 && price > result.subtotal) price = price / 100;
      result.serviceCharge = price;
      return true;
    }
    if (this.tipKeywords.some(kw => lowerLine.includes(kw))) {
      if (result.subtotal > 0 && price > result.subtotal) price = price / 100;
      result.tip = price;
      return true;
    }
    if (this.discountKeywords.some(kw => lowerLine.includes(kw))) {
      result.discount = price;
      return true;
    }
    // Total must be checked after subtotal to avoid conflicts
    if (this.subtotalKeywords.some(kw => lowerLine.includes(kw))) {
      // Sometimes subtotal is read without a decimal point but total is correct
      result.subtotal = price;
      return true;
    }
    if (this.totalKeywords.some(kw => lowerLine.includes(kw))) {
      result.total = price;
      return true;
    }

    return false;
  }

  /**
   * Try to extract a menu item from a line
   * @returns {Object|null} - { name, price, quantity } or null
   */
  _tryExtractItem(line) {
    // Try quantity pattern first: "2 x Butter Chicken 450"
    const qtyMatch = line.match(/^(\d+)\s*[xX×]\s*(.+?)\s+[\$₹]?\s*([\d,]+\.?\d*)[^\d]*$/i);
    if (qtyMatch) {
      const quantity = parseInt(qtyMatch[1]);
      let name = qtyMatch[2].trim();
      const price = parseFloat(qtyMatch[3].replace(/,/g, ''));
      
      name = this._cleanItemName(name);

      if (name.length > 1 && price > 0) {
        return { name, price, quantity };
      }
    }

    // Try standard patterns
    for (const pattern of this.pricePatterns) {
      const match = line.match(pattern);
      if (match) {
        let name = match[1].trim();
        const price = parseFloat(match[2].replace(/,/g, ''));

        name = this._cleanItemName(name);

        // Validate: item name should be reasonable length, price should be positive
        if (name.length > 1 && price > 0 && price < 100000) {
          // If OCR merged Qty, Rate, and Amount into the name, it's fine.
          // The cleaned name won't have them, and the extracted price is the total amount.
          return { name, price, quantity: 1 };
        }
      }
    }

    return null;
  }

  _cleanItemName(name) {
    let clean = name.trim();
    
    // Remove leading numbers, bullet points, brackets, pipes, copyright/registered symbols
    clean = clean.replace(/^[\d\s\.\)\|\-\[\]©®oO0iIfFlL]+/, '');
    
    // Remove (0), ( ), or any pure number in parens at the end
    clean = clean.replace(/\s*\(\s*\d*\s*\)$/g, ''); 
    
    // Remove non-alphabetical trailing noise first
    clean = clean.replace(/[\d\s.,!@#$%^&*_=+{}\[\]|\\:;"'<>\/?©®]+$/g, '');
    
    // Remove isolated single/double letter artifacts (e.g., " i", " il")
    clean = clean.replace(/\s+[iIfFlLoO0]{1,2}$/g, '');

    // Remove explicit VEG/NON-VEG tags at the end
    clean = clean.replace(/\s+(VEG|NON-VEG|NON VEG|NONVEG|NON\s*VEG)$/i, '');
    
    // Run trailing noise cleanup again in case tags masked it
    clean = clean.replace(/[\d\s.,!@#$%^&*_=+{}\[\]|\\:;"'<>\/?©®]+$/g, '');
    clean = clean.replace(/\s+[iIfFlLoO0]{1,2}$/g, '');
    
    return clean.trim();
  }

  /**
   * Extract any price/number from end of a line
   */
  _extractPrice(line) {
    const match = line.match(/[\$₹]?\s*([\d,]+\.?\d*)[^\d]*$/i);
    if (match) {
      const price = parseFloat(match[1].replace(/,/g, ''));
      if (price > 0) return price;
    }
    return null;
  }
}

module.exports = new BillParserService();
