const Tesseract = require('tesseract.js');
const path = require('path');
const fs = require('fs');
require('dotenv').config();
const { GoogleGenAI } = require('@google/genai');

class OcrService {
  constructor() {
    this.ai = null;
    try {
      if (process.env.GEMINI_API_KEY) {
        this.ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      }
    } catch (e) {
      console.error('Failed to initialize Google Gen AI in OCR:', e);
    }
  }

  /**
   * Extract text from a bill image using a hybrid pipeline.
   * Step 1: Fast local Tesseract OCR to get the baseline text structure.
   * Step 2: Gemini Vision to correct Tesseract errors and detect color symbols.
   */
  async extractText(imagePath) {
    if (!this.ai) {
      console.warn('\n⚠️ CRITICAL WARNING: GEMINI_API_KEY missing. Falling back to Tesseract. Colors will be lost.\n');
      return this._extractWithTesseract(imagePath);
    }

    console.log(`⚡ Running lightning-fast Gemini Vision OCR...`);
    return this._extractWithGeminiDirectWithRetries(imagePath);
  }

  async _extractWithGeminiDirectWithRetries(imagePath) {
    const retries = [3000, 5000, 10000]; // 3s, 5s, 10s backoff
    let attempt = 0;

    while (attempt <= retries.length) {
      try {
        let imageData;
        let mimeType = 'image/jpeg';

        if (imagePath.startsWith('http')) {
          const response = await fetch(imagePath);
          const arrayBuffer = await response.arrayBuffer();
          imageData = Buffer.from(arrayBuffer).toString('base64');
          mimeType = response.headers.get('content-type') || 'image/jpeg';
        } else {
          const ext = path.extname(imagePath).toLowerCase();
          if (ext === '.png') mimeType = 'image/png';
          else if (ext === '.webp') mimeType = 'image/webp';
          else if (ext === '.heic') mimeType = 'image/heic';
          imageData = fs.readFileSync(imagePath).toString('base64');
        }

        const prompt = `
You are a highly accurate OCR system specialized in Indian restaurant bills.
Please extract all text from this bill image verbatim, maintaining the original layout line-by-line.

CRITICAL REQUIREMENTS:
1. Indian bills use a green dot/square (🟢) for Vegetarian and a red dot/square (🔴) for Non-Vegetarian.
2. Look very carefully at the image for every single row.
3. If you see a GREEN symbol on the row in the image, PREPEND the extracted text line with "[🟢 VEG] ".
4. If you see a RED symbol on the row in the image, PREPEND the extracted text line with "[🔴 NON-VEG] ".

Output ONLY the final extracted and symbol-annotated text. Do not add markdown blocks or commentary.
`;

        const response = await this.ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: [
            { inlineData: { data: imageData, mimeType: mimeType } },
            prompt
          ]
        });

        const text = response.text;
        console.log(`✅ Gemini Direct OCR complete on attempt ${attempt + 1}.`);
        
        // Pass the retry attempt count back to the controller via a hidden hack or just log it
        this.lastRetryAttempts = attempt; // Storing for debug logs
        return text;
      } catch (error) {
        const msg = error.message || '';
        attempt++;
        
        const isRateLimit = msg.includes('429') || msg.includes('Quota') || msg.includes('503') || msg.includes('UNAVAILABLE') || msg.includes('RESOURCE_EXHAUSTED');
        
        if (isRateLimit && attempt <= retries.length) {
          const delay = retries[attempt - 1];
          console.warn(`⚠️ Gemini API overloaded (Attempt ${attempt}). Retrying in ${delay/1000}s...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }

        console.error('❌ Gemini Direct OCR failed definitively:', msg);
        
        if (isRateLimit) {
          throw new Error(`Gemini Vision API is temporarily overloaded or rate-limited. Please try again shortly. Detailed error: ${msg}`);
        }
        
        // No silent fallback if Gemini hard-fails (not rate limit). User explicitly requested NO bad silent fallbacks.
        throw new Error(`OCR processing failed: ${msg}`);
      }
    }
  }

  async _extractWithTesseract(imagePath) {
    try {
      console.log(`🔍 Starting Tesseract OCR on: ${imagePath}`);
      
      const result = await Tesseract.recognize(imagePath, 'eng', {
        logger: (info) => {
          if (info.status === 'recognizing text') {
            console.log(`  OCR progress: ${(info.progress * 100).toFixed(0)}%`);
          }
        }
      });

      const text = result.data.text;
      console.log(`✅ Tesseract OCR complete. Extracted ${text.length} characters.`);
      
      return text;
    } catch (error) {
      console.error('❌ OCR extraction failed:', error.message);
      throw new Error(`Failed to extract text from bill image: ${error.message}`);
    }
  }

  /**
   * Extract text with confidence scoring
   * Returns both text and confidence level for quality assessment
   */
  async extractTextWithConfidence(imagePath) {
    // Gemini doesn't provide word-level confidence boxes, so we fallback to Tesseract for this
    try {
      const result = await Tesseract.recognize(imagePath, 'eng');
      
      return {
        text: result.data.text,
        confidence: result.data.confidence,
        words: result.data.words?.map(w => ({
          text: w.text,
          confidence: w.confidence
        }))
      };
    } catch (error) {
      throw new Error(`OCR with confidence failed: ${error.message}`);
    }
  }
}

module.exports = new OcrService();
