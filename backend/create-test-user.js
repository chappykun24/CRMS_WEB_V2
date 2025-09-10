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

console.log('Connecting to database...', {
  host: dbConfig.host,
  database: dbConfig.database,
  user: dbConfig.user,
  port: dbConfig.port
});

const pool = new Pool(dbConfig);

async function createTestUser() {
  const client = await pool.connect();
  
  try {
    // First, let's check if we have the required tables
    console.log('Checking database structure...');
    
    // Check if users table exists
    const usersTableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'users'
      );
    `);
    
    if (!usersTableCheck.rows[0].exists) {
      console.log('Users table does not exist. Creating tables...');
      
      // Create users table
      await client.query(`
        CREATE TABLE users (
          user_id SERIAL PRIMARY KEY,
          email VARCHAR(255) UNIQUE NOT NULL,
          password_hash VARCHAR(255) NOT NULL,
          first_name VARCHAR(100) NOT NULL,
          last_name VARCHAR(100) NOT NULL,
          middle_name VARCHAR(100),
          role_id INTEGER,
          department_id INTEGER,
          employee_id VARCHAR(50),
          phone VARCHAR(20),
          profile_photo TEXT,
          is_active BOOLEAN DEFAULT true,
          last_login TIMESTAMP,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        );
      `);
      
      // Create roles table
      await client.query(`
        CREATE TABLE roles (
          role_id SERIAL PRIMARY KEY,
          name VARCHAR(50) UNIQUE NOT NULL,
          description TEXT,
          created_at TIMESTAMP DEFAULT NOW()
        );
      `);
      
      // Create departments table
      await client.query(`
        CREATE TABLE departments (
          department_id SERIAL PRIMARY KEY,
          name VARCHAR(100) NOT NULL,
          description TEXT,
          created_at TIMESTAMP DEFAULT NOW()
        );
      `);
      
      // Insert default roles
      await client.query(`
        INSERT INTO roles (name, description) VALUES 
        ('admin', 'System Administrator'),
        ('faculty', 'Faculty Member'),
        ('dean', 'Dean'),
        ('staff', 'Staff Member'),
        ('program chair', 'Program Chair')
        ON CONFLICT (name) DO NOTHING;
      `);
      
      // Insert default departments
      await client.query(`
        INSERT INTO departments (name, description) VALUES 
        ('Computer Science', 'Computer Science Department'),
        ('Information Technology', 'Information Technology Department'),
        ('Engineering', 'Engineering Department')
        ON CONFLICT (name) DO NOTHING;
      `);
      
      console.log('Tables created successfully!');
    }
    
    // Check if test user already exists
    const existingUser = await client.query('SELECT user_id FROM users WHERE email = $1', ['admin@test.com']);
    
    if (existingUser.rows.length > 0) {
      console.log('Test user already exists!');
      return;
    }
    
    // Create test user
    console.log('Creating test user...');
    const hashedPassword = await bcrypt.hash('password123', 12);
    
    const result = await client.query(`
      INSERT INTO users (email, password_hash, first_name, last_name, role_id, department_id, employee_id, is_active)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING user_id, email, first_name, last_name, role_id, department_id, employee_id, is_active
    `, [
      'admin@test.com',
      hashedPassword,
      'Admin',
      'User',
      1, // admin role
      1, // first department
      'EMP001',
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
