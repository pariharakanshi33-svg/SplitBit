const path = require('path');
const ocrService = require('./src/services/ocrService');
const billParserService = require('./src/services/billParserService');

async function run() {
  const imagePath = path.join(__dirname, 'uploads', 'bill-1777918239564-359390749.png');
  console.log('Running OCR on:', imagePath);
  try {
    const text = await ocrService.extractText(imagePath);
    console.log('--- PARSING RESULT ---');
    const parsed = billParserService.parse(text);
    console.log(JSON.stringify(parsed, null, 2));
    console.log('----------------------');
  } catch (err) {
    console.error(err);
  }
}

run();
