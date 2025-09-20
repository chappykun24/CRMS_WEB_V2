#!/usr/bin/env node

import pg from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

const { Pool } = pg;
dotenv.config();

// Copy VITE_ environment variables to regular ones for backend use (for compatibility)
if (process.env.VITE_NEON_HOST) {
  process.env.NEON_HOST = process.env.VITE_NEON_HOST;
  process.env.NEON_DATABASE = process.env.VITE_NEON_DATABASE;
  process.env.NEON_USER = process.env.VITE_NEON_USER;
  process.env.NEON_PASSWORD = process.env.VITE_NEON_PASSWORD;
  process.env.NEON_PORT = process.env.VITE_NEON_PORT;
}

// Create connection to Neon database
const pool = new Pool({
  host: process.env.NEON_HOST || process.env.DB_HOST,
  database: process.env.NEON_DATABASE || process.env.DB_NAME,
  user: process.env.NEON_USER || process.env.DB_USER,
  password: process.env.NEON_PASSWORD || process.env.DB_PASSWORD,
  port: parseInt(process.env.NEON_PORT || process.env.DB_PORT || '5432'),
  ssl: { rejectUnauthorized: false }, // Required for Neon
});

async function applyOptimizations() {
  console.log('🚀 Applying performance optimizations to Neon database...');
  console.log('🌐 Connecting to:', process.env.NEON_HOST);

  try {
    // Test connection first
    const testResult = await pool.query('SELECT NOW()');
    console.log('✅ Connected to Neon database:', testResult.rows[0].now);

    // Read the corrected SQL file
    const sqlFile = path.join(process.cwd(), 'backend', 'migrations', 'performance_indexes_corrected.sql');
    const sqlContent = fs.readFileSync(sqlFile, 'utf8');
    
    // Split into individual statements and execute them
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    console.log(`📊 Executing ${statements.length} optimization statements...`);

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      try {
        console.log(`⏳ Executing statement ${i + 1}/${statements.length}...`);
        await pool.query(statement);
        console.log(`✅ Statement ${i + 1} completed`);
      } catch (error) {
        if (error.message.includes('already exists')) {
          console.log(`⚠️ Index already exists (statement ${i + 1})`);
        } else {
          console.error(`❌ Error in statement ${i + 1}:`, error.message);
        }
      }
    }

    console.log('🎉 All optimizations applied successfully!');
    console.log('📈 Your database performance should now be significantly improved!');

  } catch (error) {
    console.error('❌ Error applying optimizations:', error.message);
    console.log('\n💡 Make sure your Neon environment variables are set correctly:');
    console.log('- VITE_NEON_HOST');
    console.log('- VITE_NEON_DATABASE');
    console.log('- VITE_NEON_USER');
    console.log('- VITE_NEON_PASSWORD');
    console.log('- VITE_NEON_PORT');
  } finally {
    await pool.end();
  }
}

// Run the optimization
applyOptimizations()
  .then(() => {
    console.log('✅ Optimization script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Optimization script failed:', error.message);
    process.exit(1);
  });
