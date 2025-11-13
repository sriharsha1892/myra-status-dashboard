/**
 * Advanced Gemini API Diagnostic Script
 * Tests different API configurations and model access patterns
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.log('❌ Error: GEMINI_API_KEY not set');
  console.log('\nSet it with:');
  console.log('export GEMINI_API_KEY="your-api-key-here"');
  process.exit(1);
}

console.log('🔍 GEMINI API DIAGNOSTIC TOOL\n');
console.log('═'.repeat(60));
console.log(`API Key: ${apiKey.substring(0, 20)}...${apiKey.substring(apiKey.length - 4)}`);
console.log(`Key Length: ${apiKey.length} characters`);
console.log(`Starts with: ${apiKey.substring(0, 3)}`);
console.log(`Ends with: ${apiKey.substring(apiKey.length - 3)}`);
console.log('═'.repeat(60) + '\n');

async function testModelAccess() {
  const genAI = new GoogleGenerativeAI(apiKey);

  console.log('TEST 1: List Available Models\n');
  console.log('Attempting to list models via Google AI API...');

  try {
    // Try to list models (this may not be available in all API versions)
    const response = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models?key=' + apiKey
    );

    const data = await response.json();

    if (response.ok) {
      console.log('✅ API Key is valid!\n');

      if (data.models && Array.isArray(data.models)) {
        console.log(`Found ${data.models.length} available models:\n`);
        data.models.forEach((model, idx) => {
          console.log(`${idx + 1}. ${model.name}`);
          if (model.displayName) console.log(`   Display: ${model.displayName}`);
          if (model.description) console.log(`   ${model.description.substring(0, 80)}...`);
          console.log('');
        });
      } else {
        console.log('⚠️  API returned data but no models list found');
        console.log('Response:', JSON.stringify(data, null, 2));
      }
    } else {
      console.log('❌ API request failed');
      console.log(`Status: ${response.status} ${response.statusText}`);
      console.log('Response:', JSON.stringify(data, null, 2));
      console.log('');
    }
  } catch (error) {
    console.log('❌ Error listing models:', error.message);
    console.log('');
  }
}

async function testModelGeneration() {
  console.log('\nTEST 2: Generate Content with Different Models\n');

  const genAI = new GoogleGenerativeAI(apiKey);

  // Models to try based on latest Google AI documentation (Dec 2024)
  const modelsToTry = [
    // Latest models (2024)
    'gemini-2.0-flash-exp',
    'gemini-exp-1206',
    'gemini-2.0-flash-thinking-exp-1219',

    // Stable models
    'gemini-1.5-flash',
    'gemini-1.5-flash-8b',
    'gemini-1.5-pro',

    // Legacy (may be deprecated)
    'gemini-pro',
    'gemini-1.0-pro',

    // With models/ prefix
    'models/gemini-1.5-flash',
    'models/gemini-1.5-pro',
  ];

  const testPrompt = 'Say "OK" if you can read this message.';

  for (const modelName of modelsToTry) {
    try {
      console.log(`Testing: ${modelName}...`);

      const model = genAI.getGenerativeModel({ model: modelName });
      const startTime = Date.now();
      const result = await model.generateContent(testPrompt);
      const latency = Date.now() - startTime;

      const response = result.response.text();

      console.log(`✅ ${modelName} WORKS!`);
      console.log(`   Response: ${response.trim().substring(0, 50)}`);
      console.log(`   Latency: ${latency}ms\n`);

      // If we find a working model, stop testing
      console.log('🎉 SUCCESS! Found working model: ' + modelName);
      console.log('\nUpdate lib/timeline/llmParser.ts line 155 to use:');
      console.log(`   const model = genAI.getGenerativeModel({ model: "${modelName}" });\n`);
      return modelName;

    } catch (error) {
      console.log(`❌ ${modelName} failed`);
      console.log(`   Error: ${error.message.substring(0, 100)}...`);

      // Show detailed error for first failure
      if (modelName === modelsToTry[0]) {
        console.log('\n   Full error details:');
        console.log(`   Status: ${error.status || 'N/A'}`);
        console.log(`   Message: ${error.message}`);
        if (error.response) {
          console.log(`   Response: ${JSON.stringify(error.response, null, 2)}`);
        }
      }
      console.log('');
    }
  }

  return null;
}

async function testAPIKeyFormat() {
  console.log('\nTEST 3: API Key Format Validation\n');

  // Check API key format (should be 39 characters starting with AIza)
  const expectedPattern = /^AIza[a-zA-Z0-9_-]{35}$/;

  if (expectedPattern.test(apiKey)) {
    console.log('✅ API key format appears correct');
    console.log('   Pattern: AIza[35 alphanumeric chars]');
  } else {
    console.log('⚠️  API key format may be incorrect');
    console.log(`   Expected: AIza + 35 characters (total 39)`);
    console.log(`   Actual length: ${apiKey.length}`);
    console.log(`   Starts with AIza: ${apiKey.startsWith('AIza') ? 'Yes' : 'No'}`);
  }

  console.log('');
}

async function testAPIEndpoint() {
  console.log('\nTEST 4: Direct API Endpoint Test\n');

  try {
    const response = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=' + apiKey,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: 'Say OK'
            }]
          }]
        })
      }
    );

    const data = await response.json();

    if (response.ok) {
      console.log('✅ Direct API call successful!');
      console.log('Response:', JSON.stringify(data, null, 2).substring(0, 200) + '...');
    } else {
      console.log('❌ Direct API call failed');
      console.log(`Status: ${response.status} ${response.statusText}`);
      console.log('Response:', JSON.stringify(data, null, 2));
    }
  } catch (error) {
    console.log('❌ Error:', error.message);
  }

  console.log('');
}

async function diagnose() {
  await testAPIKeyFormat();
  await testModelAccess();
  const workingModel = await testModelGeneration();
  await testAPIEndpoint();

  console.log('\n' + '═'.repeat(60));
  console.log('DIAGNOSTIC SUMMARY');
  console.log('═'.repeat(60) + '\n');

  if (workingModel) {
    console.log('✅ GOOD NEWS: Found working model!');
    console.log(`\nWorking model: ${workingModel}`);
    console.log('\nACTION REQUIRED:');
    console.log('1. Update lib/timeline/llmParser.ts line 155:');
    console.log(`   const model = genAI.getGenerativeModel({ model: "${workingModel}" });`);
    console.log('2. Restart dev server');
    console.log('3. Test bulk import feature\n');
  } else {
    console.log('❌ NO WORKING MODELS FOUND\n');
    console.log('POSSIBLE CAUSES:');
    console.log('1. API key is invalid or expired');
    console.log('2. Gemini API not enabled for this API key');
    console.log('3. Account needs to activate free tier\n');
    console.log('RECOMMENDED ACTIONS:');
    console.log('1. Visit: https://aistudio.google.com/app/apikey');
    console.log('2. Generate a NEW API key');
    console.log('3. Make sure "Gemini API" is enabled');
    console.log('4. Update .env.local with new key');
    console.log('5. Restart dev server and test again\n');
  }
}

diagnose().catch(error => {
  console.error('\n❌ FATAL ERROR:', error);
  process.exit(1);
});
