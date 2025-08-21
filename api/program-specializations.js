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
      console.log('❌ [SPECIALIZATIONS] Missing environment variables:', missingVars);
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
    console.log('🔗 [SPECIALIZATIONS] Connected to database');

    if (req.method === 'GET') {
      // Get specializations with optional program filter
      const { programId } = req.query;
      
      let sql = `
        SELECT specialization_id, program_id, name, description, abbreviation
        FROM program_specializations
      `;
      let params = [];
      
      if (programId) {
        sql += ' WHERE program_id = $1';
        params.push(programId);
      }
      
      sql += ' ORDER BY name';
      
      const result = await client.query(sql, params);
      console.log(`📋 [SPECIALIZATIONS] Retrieved ${result.rows.length} specializations${programId ? ` for program ${programId}` : ''}`);
      res.status(200).json(result.rows);

    } else if (req.method === 'POST') {
      // Create new specialization
      const { name, description, abbreviation, program_id } = req.body;
      
      if (!name || !abbreviation || !program_id) {
        return res.status(400).json({ 
          error: 'Name, abbreviation, and program_id are required' 
        });
      }

      const result = await client.query(`
        INSERT INTO program_specializations (name, description, abbreviation, program_id)
        VALUES ($1, $2, $3, $4)
        RETURNING specialization_id, name, description, abbreviation, program_id
      `, [name, description || null, abbreviation, program_id]);

      console.log(`✅ [SPECIALIZATIONS] Created specialization: ${name} (${abbreviation}) for program ${program_id}`);
      res.status(201).json(result.rows[0]);

    } else {
      res.setHeader('Allow', ['GET', 'POST']);
      res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    }

  } catch (error) {
    console.error('❌ [SPECIALIZATIONS] Error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  } finally {
    if (client) {
      await client.end();
      console.log('🔌 [SPECIALIZATIONS] Database connection closed');
    }
  }
}
