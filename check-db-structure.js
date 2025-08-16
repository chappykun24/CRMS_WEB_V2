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

console.log('🔍 Checking Neon Database Structure...\n');

// Database connection configuration
const neonConfig = {
  host: process.env.VITE_NEON_HOST,
  database: process.env.VITE_NEON_DATABASE,
  user: process.env.VITE_NEON_USER,
  password: process.env.VITE_NEON_PASSWORD,
  port: process.env.VITE_NEON_PORT || 5432,
  ssl: {
    rejectUnauthorized: false
  },
  max: 1,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
};

// Create connection pool
const pool = new Pool(neonConfig);

async function checkDatabaseStructure() {
  let client;
  
  try {
    console.log('🔄 Connecting to Neon database...');
    client = await pool.connect();
    console.log('✅ Connected successfully!\n');
    
    // Check what tables exist
    console.log('📋 Current Database Tables:');
    const tablesResult = await client.query(`
      SELECT table_name, table_type
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    if (tablesResult.rows.length === 0) {
      console.log('   ❌ No tables found - database is empty');
    } else {
      tablesResult.rows.forEach(row => {
        console.log(`   - ${row.table_name} (${row.table_type})`);
      });
    }
    
    console.log(`\nTotal tables: ${tablesResult.rows.length}\n`);
    
    // Check if users table exists and its structure
    if (tablesResult.rows.some(row => row.table_name === 'users')) {
      console.log('🔍 Users Table Structure:');
      const usersStructure = await client.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_name = 'users' 
        ORDER BY ordinal_position
      `);
      
      usersStructure.rows.forEach(row => {
        console.log(`   - ${row.column_name}: ${row.data_type} (${row.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
      });
      
      // Check if there are any users
      const userCount = await client.query('SELECT COUNT(*) as count FROM users');
      console.log(`\n📊 Total users in database: ${userCount.rows[0].count}`);
      
      if (userCount.rows[0].count > 0) {
        console.log('\n👥 Sample users:');
        const sampleUsers = await client.query('SELECT user_id, email, role, is_approved FROM users LIMIT 5');
        sampleUsers.rows.forEach(user => {
          console.log(`   - ${user.email} (${user.role}) - Approved: ${user.is_approved}`);
        });
      }
    } else {
      console.log('❌ Users table does not exist');
    }
    
    // Check Neon-specific features
    console.log('\n🔍 Checking Neon Features:');
    
    // Check if Neon Auth extension is available
    try {
      const neonAuthCheck = await client.query(`
        SELECT * FROM pg_extension WHERE extname = 'neon_auth'
      `);
      if (neonAuthCheck.rows.length > 0) {
        console.log('   ✅ Neon Auth extension is available');
      } else {
        console.log('   ❌ Neon Auth extension not found');
      }
    } catch (error) {
      console.log('   ❌ Cannot check Neon Auth extension');
    }
    
    // Check available extensions
    const extensions = await client.query(`
      SELECT extname, extversion 
      FROM pg_extension 
      ORDER BY extname
    `);
    
    console.log('\n📦 Available Extensions:');
    extensions.rows.forEach(ext => {
      console.log(`   - ${ext.extname} (v${ext.extversion})`);
    });
    
  } catch (error) {
    console.error('❌ Database check failed:', error.message);
  } finally {
    if (client) {
      client.release();
    }
    await pool.end();
  }
}

// Run the check
checkDatabaseStructure();
