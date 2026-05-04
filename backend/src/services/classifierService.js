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
    
    // Fallback if AI is not available
    if (!this.ai) {
      return this._fallbackClassifyList(items);
    }

    try {
      const itemNames = items.map(i => i.name).join('\n');
      
      // Determine if the bill explicitly categorizes things (e.g., has "Veg", "Chicken", "Paneer")
      const hasExplicitDietMarkers = items.some(i => 
        /veg|chicken|mutton|beef|pork|fish|prawn|paneer/i.test(i.name)
      );

      const prompt = `
You are a food classification assistant. Classify the following food items into strictly one of three categories:
1. VEG (Vegetarian food. Note: Eggs are considered NON_VEG for safety.)
2. NON_VEG (Contains any meat, fish, poultry, or egg.)
3. SHARED (Items that are shared by everyone regardless of diet, such as beverages, water, desserts).

CRITICAL RULE FOR BREADS & STAPLES (Naan, Roti, Rice, Dal):
- If the bill explicitly mentions items as veg or non-veg (which this bill ${hasExplicitDietMarkers ? 'DOES' : 'DOES NOT'}), then classify vegetarian breads and staples as "VEG".
- If the bill does NOT explicitly mention veg/non-veg items, classify breads and staples as "SHARED".

Items:
${itemNames}

Respond ONLY with a JSON array of strings in the exact same order as the input list. The strings must be "VEG", "NON_VEG", or "SHARED".
Example: ["VEG", "NON_VEG", "SHARED"]
`;

      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: "application/json",
        }
      });

      const categories = JSON.parse(response.text);
      
      return items.map((item, index) => ({
        ...item,
        category: categories[index] || 'SHARED'
      }));
    } catch (error) {
      console.error('AI Classification failed:', error.message);
      // Fallback to simple logic if API fails
      return this._fallbackClassifyList(items);
    }
  }

  /**
   * Fallback method for the entire list
   */
  _fallbackClassifyList(items) {
    const hasExplicitDietMarkers = items.some(i => 
      /veg|chicken|mutton|beef|pork|fish|prawn|paneer/i.test(i.name)
    );

    return items.map(item => {
      if (!item.name) return { ...item, category: 'SHARED' };
      const lower = item.name.toLowerCase();
      
      const nonVeg = ['chicken', 'mutton', 'fish', 'prawn', 'beef', 'pork', 'meat', 'egg', 'lamb', 'seafood'];
      const sharedDrinksDesserts = ['water', 'coke', 'soda', 'pepsi', 'ice cream', 'beverage', 'dessert'];
      const staples = ['roti', 'naan', 'rice', 'dal', 'bread'];
      const vegMains = ['paneer', 'mushroom', 'aloo', 'gobi', 'bhindi', 'chole', 'tofu', 'soya', 'veg'];
      
      let category = 'SHARED';
      
      if (nonVeg.some(kw => lower.includes(kw))) {
        category = 'NON_VEG';
      } else if (sharedDrinksDesserts.some(kw => lower.includes(kw))) {
        category = 'SHARED';
      } else if (staples.some(kw => lower.includes(kw))) {
        // Here is the conditional logic the user requested
        category = hasExplicitDietMarkers ? 'VEG' : 'SHARED';
      } else if (vegMains.some(kw => lower.includes(kw))) {
        category = 'VEG';
      }
      
      return { ...item, category };
    });
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
