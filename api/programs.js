import { Client } from 'pg';

// Environment variables for database connection
const requiredEnvVars = [
  'NEON_HOST',
  'NEON_DATABASE', 
  'NEON_USER',
  'NEON_PASSWORD'
];

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  let client;
  try {
    // Check if required environment variables are set
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    if (missingVars.length > 0) {
      console.log('❌ [PROGRAMS] Missing environment variables:', missingVars);
      return res.status(500).json({ 
        error: 'Database configuration incomplete',
        missing: missingVars
      });
    }

    // Create database connection
    const connectionString = `postgresql://${process.env.NEON_USER}:${process.env.NEON_PASSWORD}@${process.env.NEON_HOST}:${process.env.NEON_PORT || 5432}/${process.env.NEON_DATABASE}?sslmode=require`;
    
    const client = new Client({
      connectionString,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : true,
    });

    await client.connect();
    console.log('🔗 [PROGRAMS] Connected to database');

    if (req.method === 'GET') {
      // Get all programs
      const result = await client.query(`
        SELECT program_id, name, description, program_abbreviation, department_id
        FROM programs
        ORDER BY name
      `);
      
      console.log(`📋 [PROGRAMS] Retrieved ${result.rows.length} programs`);
      res.status(200).json(result.rows);

    } else if (req.method === 'POST') {
      // Create new program
      const { name, description, program_abbreviation, department_id } = req.body;
      
      if (!name || !program_abbreviation) {
        return res.status(400).json({ 
          error: 'Name and program_abbreviation are required' 
        });
      }

      const result = await client.query(`
        INSERT INTO programs (name, description, program_abbreviation, department_id)
        VALUES ($1, $2, $3, $4)
        RETURNING program_id, name, description, program_abbreviation, department_id
      `, [name, description || null, program_abbreviation, department_id || null]);

      console.log(`✅ [PROGRAMS] Created program: ${name} (${program_abbreviation})`);
      res.status(201).json(result.rows[0]);

    } else {
      res.setHeader('Allow', ['GET', 'POST']);
      res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    }

  } catch (error) {
    console.error('❌ [PROGRAMS] Error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  } finally {
    if (client) {
      await client.end();
      console.log('🔌 [PROGRAMS] Database connection closed');
    }
  }
}
