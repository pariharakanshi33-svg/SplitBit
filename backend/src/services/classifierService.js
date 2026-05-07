/**
 * Item Classifier Service — Veg/Non-Veg Classification
 * 
 * Classifies food items as VEG, NON_VEG, or SHARED using keyword-based logic.
 * 
 * CLASSIFICATION STRATEGY:
 * 1. Check against a comprehensive list of non-veg keywords
 * 2. Check against veg-specific keywords
 * 3. Handle edge cases (egg items, mixed dishes, ambiguous items)
 * 4. Default to SHARED for unclassifiable items (beverages, desserts, etc.)
 * 
 * WHY KEYWORD-BASED:
 * - Works offline without API calls
 * - Fast and deterministic
 * - Easy to extend with new keywords
 * - Sufficient for most restaurant menus
 */

require('dotenv').config();
const { GoogleGenAI } = require('@google/genai');

class ItemClassifierService {
  constructor() {
    this.ai = null;
    try {
      if (process.env.GEMINI_API_KEY) {
        this.ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      } else {
        console.warn('⚠️ GEMINI_API_KEY not found in .env. Falling back to simple keyword matching.');
      }
    } catch (e) {
      console.error('Failed to initialize Google Gen AI:', e);
    }
  }

  /**
   * Classify an array of items using Gemini API
   * @param {Array<{name: string, price: number}>} items
   * @returns {Promise<Array<{name: string, price: number, category: string}>>}
   */
  async classifyItems(items) {
    if (!items || items.length === 0) return [];

    // First Pass: Apply Priority 1 (Explicit Indicators) and Priority 2 (Shared Items)
    const classifiedItems = items.map(item => {
      const name = item.name ? item.name.toLowerCase() : '';
      let category = item.category || null;
      let source = item.source || null;

      // If category is already set by bill parser (from explicit OCR symbols), skip Priority 1&2
      if (category) {
        return { ...item, _preCategory: category, _source: source };
      }

      // 1. Priority 1: Explicit Veg/Non-Veg Name Detection
      const nonVegIndicators = ['🔴', '[nv]', '(nv)', 'non-veg', 'non veg', 'chicken', 'mutton', 'beef', 'pork', 'fish', 'prawn', 'meat', 'egg'];
      const vegIndicators = ['🟢', '[v]', '(v)', 'veg ', ' veg', 'paneer', 'aloo', 'gobi', 'bhindi', 'chole', 'tofu', 'soya'];
      
      const isExplicitVeg = vegIndicators.some(ind => name.includes(ind)) || name.startsWith('veg') || name.endsWith('veg');

      if (nonVegIndicators.some(ind => name.includes(ind))) {
        category = 'NON_VEG';
        source = 'bill_symbol';
      } else if (isExplicitVeg) {
        category = 'VEG';
        source = 'bill_symbol';
      }

      // 2. Priority 2: Shared/Common Item Logic
      if (!category) {
        const sharedKeywords = [
          'dessert', 'ice cream', 'cake', 'water', 'mineral water', 'soft drink', 
          'juice', 'mocktail', 'beverage', 'tea', 'coffee', 'dip', 'chutney',
          'coke', 'pepsi', 'sprite', 'fanta', 'soda', 'platter', 'brownie'
        ];
        if (sharedKeywords.some(kw => name.includes(kw))) {
          category = 'SHARED';
          source = 'shared_rule';
        }
      }

      return { ...item, _preCategory: category, _source: source };
    });

    const itemsToAskAi = classifiedItems.filter(i => i._preCategory === null);

    // If everything was classified deterministically or AI is disabled, finish early
    if (itemsToAskAi.length === 0 || !this.ai) {
      return classifiedItems.map(({ _preCategory, _source, ...rest }) => ({
        ...rest,
        category: _preCategory || this._fallbackSingleItem(rest.name),
        source: _source || 'ai_fallback' // if we hit fallback, it's effectively ai_fallback
      }));
    }

    // 3. AI-Based Food Classification (Fallback Only)
      const itemNames = itemsToAskAi.map(i => i.name).join('\n');
      
      const prompt = `
You are a smart food classification assistant. Classify the following food items into strictly one of three categories based on natural food semantics:
1. VEG (Vegetarian food like Paneer butter masala. Note: Eggs are considered NON_VEG)
2. NON_VEG (Contains any meat, fish, poultry, or egg, e.g. Chicken biryani, Egg fried rice)
3. SHARED (Items that are shared by everyone, like desserts, Brownie with ice cream, beverages, Coca Cola, common sides, breads/staples without explicit meat)

Items:
${itemNames}

Respond ONLY with a JSON array of strings in the exact same order as the input list. The strings must be "VEG", "NON_VEG", or "SHARED".
Example: ["VEG", "NON_VEG", "SHARED"]
`;

      const retries = [3000, 5000, 10000]; // 3s, 5s, 10s backoff
      let attempt = 0;

      while (attempt <= retries.length) {
        try {
          const response = await this.ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: { responseMimeType: "application/json" }
          });

          const aiCategories = JSON.parse(response.text);
          
          let aiIndex = 0;
          return classifiedItems.map(({ _preCategory, _source, ...rest }) => {
            if (_preCategory !== null) {
              return { ...rest, category: _preCategory, source: _source };
            } else {
              const aiCat = aiCategories[aiIndex] || 'SHARED';
              aiIndex++;
              return { ...rest, category: aiCat, source: 'ai_fallback' };
            }
          });
        } catch (error) {
          const msg = error.message || '';
          attempt++;
          
          const isRateLimit = msg.includes('429') || msg.includes('Quota') || msg.includes('503') || msg.includes('UNAVAILABLE') || msg.includes('RESOURCE_EXHAUSTED');
          
          if (isRateLimit && attempt <= retries.length) {
            const delay = retries[attempt - 1];
            console.warn(`⚠️ Gemini AI classification overloaded (Attempt ${attempt}). Retrying in ${delay/1000}s...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }

          console.error('❌ AI Classification failed definitively:', msg);
          
          if (isRateLimit) {
            throw new Error(`Gemini AI is temporarily overloaded or rate-limited. Please try again shortly.`);
          }

          // Fallback to simple logic if API fails for other reasons
          return classifiedItems.map(({ _preCategory, _source, ...rest }) => ({
            ...rest,
            category: _preCategory || this._fallbackSingleItem(rest.name),
            source: _source || 'fallback_logic'
          }));
        }
      }
  }

  /**
   * Final simple fallback for a single item if AI fails
   */
  _fallbackSingleItem(name) {
    if (!name) return 'SHARED';
    const lower = name.toLowerCase();
    const staples = ['roti', 'naan', 'rice', 'dal', 'bread', 'mix'];
    if (staples.some(kw => lower.includes(kw))) return 'SHARED';
    return 'SHARED'; // Safest default
  }

  /**
   * Get classification summary for a set of items
   * Items passed here must ALREADY have the 'category' field set
   */
  getSummary(items) {
    return {
      veg: items.filter(i => i.category === 'VEG'),
      nonVeg: items.filter(i => i.category === 'NON_VEG'),
      shared: items.filter(i => i.category === 'SHARED'),
      vegTotal: items.filter(i => i.category === 'VEG').reduce((s, i) => s + i.price * (i.quantity || 1), 0),
      nonVegTotal: items.filter(i => i.category === 'NON_VEG').reduce((s, i) => s + i.price * (i.quantity || 1), 0),
      sharedTotal: items.filter(i => i.category === 'SHARED').reduce((s, i) => s + i.price * (i.quantity || 1), 0),
    };
  }
}

module.exports = new ItemClassifierService();
