const { GoogleGenerativeAI } = require('@google/generative-ai');

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.log('Error: GEMINI_API_KEY not set');
  process.exit(1);
}

async function listModels() {
  try {
    const genAI = new GoogleGenerativeAI(apiKey);

    console.log('Checking available Gemini models...\n');

    // Try different model names
    const modelsToTry = [
      'gemini-pro',
      'gemini-1.5-pro',
      'gemini-1.5-flash',
      'gemini-1.5-flash-latest',
      'models/gemini-pro',
      'models/gemini-1.5-flash'
    ];

    for (const modelName of modelsToTry) {
      try {
        console.log(`Testing: ${modelName}...`);
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent('Say hello');
        const response = result.response.text();
        console.log(`✅ ${modelName} WORKS! Response: ${response.substring(0, 50)}...\n`);
        break; // Stop after first working model
      } catch (error) {
        console.log(`❌ ${modelName} failed: ${error.message.substring(0, 100)}...\n`);
      }
    }

  } catch (error) {
    console.error('Error:', error.message);
  }
}

listModels();
