import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load environment variables from .env.local
const envPath = path.join(process.cwd(), '.env.local');
console.log('🔍 Looking for .env.local at:', envPath);

// Try to read and parse .env.local manually
try {
  const envContent = fs.readFileSync(envPath, 'utf8');
  console.log('📖 .env.local file found and read successfully');
  
  // Parse environment variables manually
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      if (key && valueParts.length > 0) {
        const cleanKey = key.replace(/\x00/g, '').trim();
        const cleanValue = valueParts.join('=').replace(/\x00/g, '').trim();
        if (cleanKey && cleanValue) {
          process.env[cleanKey] = cleanValue;
        }
      }
    }
  });
  
  console.log('✅ Environment variables loaded manually');
} catch (error) {
  console.log('❌ Error reading .env.local:', error.message);
}

// Also try dotenv as fallback
dotenv.config({ path: envPath });

console.log('🔍 Testing Neon Database Connection...\n');

// Display loaded environment variables
console.log('📋 Environment Variables Loaded:');
console.log('VITE_NEON_HOST:', process.env.VITE_NEON_HOST);
console.log('VITE_NEON_DATABASE:', process.env.VITE_NEON_DATABASE);
console.log('VITE_NEON_USER:', process.env.VITE_NEON_USER);
console.log('VITE_NEON_PASSWORD:', process.env.VITE_NEON_PASSWORD ? '***SET***' : '❌ NOT SET');
console.log('VITE_NEON_PORT:', process.env.VITE_NEON_PORT);
console.log('');

// Check if all required variables are set
const requiredVars = ['VITE_NEON_HOST', 'VITE_NEON_DATABASE', 'VITE_NEON_USER', 'VITE_NEON_PASSWORD'];
const missingVars = requiredVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.log('❌ Missing required environment variables:');
  missingVars.forEach(varName => console.log(`   - ${varName}`));
  console.log('\nPlease add these variables to your .env.local file');
  process.exit(1);
}

// Create connection string
const connectionString = `postgresql://${process.env.VITE_NEON_USER}:${process.env.VITE_NEON_PASSWORD}@${process.env.VITE_NEON_HOST}:${process.env.VITE_NEON_PORT || 5432}/${process.env.VITE_NEON_DATABASE}?sslmode=require`;

console.log('🔗 Connection String (password hidden):');
console.log(connectionString.replace(process.env.VITE_NEON_PASSWORD, '***PASSWORD***'));
console.log('');

// Test connection
async function testConnection() {
  const pool = new Pool({
    connectionString,
    ssl: true,
    max: 1,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });

  try {
    console.log('🔄 Attempting to connect...');
    const client = await pool.connect();
    console.log('✅ Connection successful!');
    
    // Test a simple query
    console.log('🔄 Testing query...');
    const result = await client.query('SELECT NOW() as current_time, version() as db_version');
    console.log('✅ Query successful!');
    console.log('   Current time:', result.rows[0].current_time);
    console.log('   Database version:', result.rows[0].db_version.split(' ')[0]);
    
    client.release();
    console.log('\n🎉 Neon database connection test PASSED!');
    
  } catch (error) {
    console.log('❌ Connection failed:');
    console.log('   Error:', error.message);
    
    if (error.message.includes('password authentication failed')) {
      console.log('\n💡 Tip: Check your Neon password in .env.local');
    } else if (error.message.includes('ENOTFOUND')) {
      console.log('\n💡 Tip: Check your Neon host URL');
    } else if (error.message.includes('SSL')) {
      console.log('\n💡 Tip: SSL connection issue - check your Neon configuration');
    }
    
  } finally {
    await pool.end();
  }
}

// Run the test
testConnection();
