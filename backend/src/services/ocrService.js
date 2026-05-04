/**
 * OCR Service — Bill Text Extraction
 * 
 * Uses Tesseract.js to extract text from bill images.
 * Handles image preprocessing hints and error recovery.
 * 
 * KEY DESIGN DECISIONS:
 * - We use a worker pool approach via Tesseract.recognize() for simplicity
 * - The extracted text is returned raw; parsing is handled by BillParserService
 * - We support multiple image formats (JPEG, PNG, WebP, etc.)
 */

const Tesseract = require('tesseract.js');
const path = require('path');

class OcrService {
  /**
   * Extract text from a bill image using Tesseract.js OCR
   * @param {string} imagePath - Path to the bill image file
   * @returns {Promise<string>} - Extracted raw text from the bill
   */
  async extractText(imagePath) {
    try {
      console.log(`🔍 Starting OCR on: ${imagePath}`);
      
      const result = await Tesseract.recognize(imagePath, 'eng', {
        logger: (info) => {
          if (info.status === 'recognizing text') {
            // Log progress for long-running OCR
            console.log(`  OCR progress: ${(info.progress * 100).toFixed(0)}%`);
          }
        }
      });

      const text = result.data.text;
      console.log(`✅ OCR complete. Extracted ${text.length} characters.`);
      
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
