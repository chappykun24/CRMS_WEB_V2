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
      console.log('❌ [COURSES] Missing environment variables:', missingVars);
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
    console.log('🔗 [COURSES] Connected to database');

    if (req.method === 'GET') {
      // Get courses with optional filters
      const { programId, specializationId, termId } = req.query;
      
      const conditions = [];
      const params = [];
      
      if (programId) {
        params.push(programId);
        conditions.push(`p.program_id = $${params.length}`);
      }
      if (specializationId) {
        params.push(specializationId);
        conditions.push(`ps.specialization_id = $${params.length}`);
      }
      if (termId) {
        params.push(termId);
        conditions.push(`c.term_id = $${params.length}`);
      }
      
      const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
      
      const sql = `
        SELECT 
          c.course_id, c.title, c.course_code, c.description, c.term_id, c.specialization_id,
          ps.name AS specialization_name, ps.abbreviation,
          p.program_id, p.name AS program_name, p.program_abbreviation
        FROM courses c
        LEFT JOIN program_specializations ps ON c.specialization_id = ps.specialization_id
        LEFT JOIN programs p ON ps.program_id = p.program_id
        ${where}
        ORDER BY c.course_code, c.title
      `;
      
      const result = await client.query(sql, params);
      console.log(`📋 [COURSES] Retrieved ${result.rows.length} courses with filters:`, { programId, specializationId, termId });
      res.status(200).json(result.rows);

    } else if (req.method === 'POST') {
      // Create new course
      const { title, course_code, description, term_id, specialization_id } = req.body;
      
      if (!title || !course_code) {
        return res.status(400).json({ 
          error: 'Title and course_code are required' 
        });
      }

      const result = await client.query(`
        INSERT INTO courses (title, course_code, description, term_id, specialization_id)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING course_id, title, course_code, description, term_id, specialization_id
      `, [title, course_code, description || null, term_id || null, specialization_id || null]);

      console.log(`✅ [COURSES] Created course: ${title} (${course_code})`);
      res.status(201).json(result.rows[0]);

    } else {
      res.setHeader('Allow', ['GET', 'POST']);
      res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    }

  } catch (error) {
    console.error('❌ [COURSES] Error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  } finally {
    if (client) {
      await client.end();
      console.log('🔌 [COURSES] Database connection closed');
    }
  }
}
