import pg from 'pg';
import bcrypt from 'bcrypt';
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

async function createTestUser() {
  const client = await pool.connect();
  
  try {
    // Check if test user already exists
    const existingUser = await client.query('SELECT user_id FROM users WHERE email = $1', ['admin@test.com']);
    
    if (existingUser.rows.length > 0) {
      console.log('Test user already exists!');
      return;
    }
    
    // Get admin role_id
    const adminRole = await client.query('SELECT role_id FROM roles WHERE name = $1', ['admin']);
    if (adminRole.rows.length === 0) {
      console.log('Admin role not found, creating it...');
      await client.query('INSERT INTO roles (name, description) VALUES ($1, $2)', ['admin', 'System Administrator']);
      const newAdminRole = await client.query('SELECT role_id FROM roles WHERE name = $1', ['admin']);
      var adminRoleId = newAdminRole.rows[0].role_id;
    } else {
      var adminRoleId = adminRole.rows[0].role_id;
    }
    
    // Create test user with correct schema
    console.log('Creating test user...');
    const hashedPassword = await bcrypt.hash('password123', 12);
    
    const result = await client.query(`
      INSERT INTO users (email, password_hash, name, role_id, is_approved)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING user_id, email, name, role_id, is_approved
    `, [
      'admin@test.com',
      hashedPassword,
      'Admin Test User',
      adminRoleId,
      true
    ]);
    
    console.log('Test user created successfully:', result.rows[0]);
    
  } catch (error) {
    console.error('Error creating test user:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

createTestUser();
