import pg from 'pg';
import dotenv from 'dotenv';

const { Pool } = pg;
dotenv.config();

// Copy VITE_ environment variables to regular ones for backend use
if (process.env.VITE_NEON_HOST) {
  process.env.NEON_HOST = process.env.VITE_NEON_HOST;
  process.env.NEON_DATABASE = process.env.VITE_NEON_DATABASE;
  process.env.NEON_USER = process.env.VITE_NEON_USER;
  process.env.NEON_PASSWORD = process.env.VITE_NEON_PASSWORD;
  process.env.NEON_PORT = process.env.VITE_NEON_PORT;
}

// Database configuration
const dbConfig = {
  host: process.env.NEON_HOST || 'ep-wild-paper-aeedio16-pooler.c-2.us-east-2.aws.neon.tech',
  database: process.env.NEON_DATABASE || 'neondb',
  user: process.env.NEON_USER || 'neondb_owner',
  password: process.env.NEON_PASSWORD || 'npg_u7tYTRj2wcED',
  port: parseInt(process.env.NEON_PORT || '5432'),
  ssl: { rejectUnauthorized: false },
};

const pool = new Pool(dbConfig);

async function checkDatabaseStructure() {
  const client = await pool.connect();
  
  try {
    console.log('Checking database structure...');
    
    // Get all tables
    const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);
    
    console.log('Tables:', tables.rows.map(r => r.table_name));
    
    // Check users table structure
    const usersColumns = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      AND table_schema = 'public'
      ORDER BY ordinal_position;
    `);
    
    console.log('Users table columns:');
    usersColumns.rows.forEach(col => {
      console.log(`  ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
    });
    
    // Check if there are any users
    const userCount = await client.query('SELECT COUNT(*) FROM users');
    console.log(`Number of users: ${userCount.rows[0].count}`);
    
    if (userCount.rows[0].count > 0) {
      const sampleUser = await client.query('SELECT * FROM users LIMIT 1');
      console.log('Sample user:', sampleUser.rows[0]);
    }
    
  } catch (error) {
    console.error('Error checking database:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

checkDatabaseStructure();
