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
      console.log('❌ [TERMS] Missing environment variables:', missingVars);
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
    console.log('🔗 [TERMS] Connected to database');

    if (req.method === 'GET') {
      // Get all terms
      const result = await client.query(`
        SELECT term_id, school_year, semester, is_active
        FROM school_terms
        ORDER BY term_id
      `);
      
      console.log(`📋 [TERMS] Retrieved ${result.rows.length} terms`);
      res.status(200).json(result.rows);

    } else {
      res.setHeader('Allow', ['GET']);
      res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    }

  } catch (error) {
    console.error('❌ [TERMS] Error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  } finally {
    if (client) {
      await client.end();
      console.log('🔌 [TERMS] Database connection closed');
    }
  }
}
