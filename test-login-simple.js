// Simple test script to debug login issues
// Run this with: node test-login-simple.js

const BASE_URL = 'https://your-app.vercel.app'; // Replace with your actual URL

async function testEndpoint(endpoint, method = 'GET', body = null) {
  try {
    console.log(`\n🔍 Testing ${method} ${endpoint}...`);
    
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
      }
    };
    
    if (body) {
      options.body = JSON.stringify(body);
    }
    
    const response = await fetch(`${BASE_URL}${endpoint}`, options);
    const text = await response.text();
    
    console.log(`📊 Response Status: ${response.status} ${response.statusText}`);
    console.log(`📄 Response Headers:`, Object.fromEntries(response.headers.entries()));
    
    if (text) {
      try {
        const json = JSON.parse(text);
        console.log('✅ JSON Response:', JSON.stringify(json, null, 2));
      } catch (parseError) {
        console.log('⚠️ Raw Response (not JSON):', text);
      }
    } else {
      console.log('⚠️ Empty response');
    }
    
    return { success: response.ok, status: response.status, text };
    
  } catch (error) {
    console.log('❌ Error:', error.message);
    return { success: false, error: error.message };
  }
}

async function runTests() {
  console.log('🚀 Starting CRMS Login Tests...\n');
  
  // Test 1: Debug endpoint (no database needed)
  await testEndpoint('/api/debug');
  
  // Test 2: Health check (tests database connection)
  await testEndpoint('/api/health');
  
  // Test 3: Get users (tests database query)
  await testEndpoint('/api/users');
  
  // Test 4: Setup passwords
  await testEndpoint('/api/setup-passwords', 'POST');
  
  // Test 5: Test login
  await testEndpoint('/api/auth/login', 'POST', {
    email: 'admin@university.edu',
    password: 'password123'
  });
  
  console.log('\n🎯 Tests completed! Check the results above.');
  console.log('\n📋 Next steps:');
  console.log('1. If you see "Missing environment variables" - set them in Vercel dashboard');
  console.log('2. If you see database connection errors - check your Neon credentials');
  console.log('3. If login fails - run the password setup first');
  console.log('4. Check Vercel function logs for detailed debugging info');
}

// Run tests if this file is executed directly
if (typeof window === 'undefined') {
  // Node.js environment
  const fetch = require('node-fetch');
  runTests().catch(console.error);
} else {
  // Browser environment
  console.log('🌐 Running in browser - use the debug page instead');
}
