import { query } from '../../src/config/database.js';

export default async function handler(req, res) {
  console.log('🔍 [SCHOOL TERMS API] Request received:', {
    method: req.method,
    url: req.url,
    timestamp: new Date().toISOString()
  });

  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    if (req.method === 'GET') {
      // Check if this is a request for a specific school term
      if (req.query.id) {
        // Get single school term by ID
        const { id } = req.query;
        console.log(`📡 [SCHOOL TERMS API] Fetching school term with ID: ${id}`);
        
        const result = await query('SELECT * FROM school_terms WHERE term_id = $1', [id]);
        
        if (result.rows.length === 0) {
          return res.status(404).json({ error: 'School term not found' });
        }
        
        res.status(200).json(result.rows[0]);
      } else {
        // Get all school terms
        console.log('📡 [SCHOOL TERMS API] Executing database query: SELECT * FROM school_terms ORDER BY school_year DESC, semester ASC');
        const result = await query('SELECT * FROM school_terms ORDER BY school_year DESC, semester ASC');
        console.log(`✅ [SCHOOL TERMS API] Query successful. Found ${result.rows.length} school terms`);
        
        res.status(200).json(result.rows);
      }
      
    } else if (req.method === 'POST') {
      // Create new school term
      const { school_year, semester, start_date, end_date, is_active } = req.body;
      
      if (!school_year || !semester || !start_date || !end_date) {
        return res.status(400).json({ error: 'School year, semester, start date, and end date are required' });
      }
      
      // Check for duplicates
      const existingTerm = await query(
        'SELECT * FROM school_terms WHERE school_year = $1 AND semester = $2',
        [school_year, semester]
      );
      
      if (existingTerm.rows.length > 0) {
        return res.status(400).json({ error: 'School term already exists for this year and semester' });
      }
      
      // Insert new school term
      const result = await query(
        `INSERT INTO school_terms (school_year, semester, start_date, end_date, is_active) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [school_year, semester, start_date, end_date, is_active || false]
      );
      
      res.status(201).json(result.rows[0]);
      
    } else if (req.method === 'PUT') {
      // Update school term - ID comes from URL path
      const { id } = req.query;
      const { school_year, semester, start_date, end_date, is_active } = req.body;
      
      if (!id || !school_year || !semester || !start_date || !end_date) {
        return res.status(400).json({ error: 'ID, school year, semester, start date, and end date are required' });
      }
      
      // Check for duplicates (excluding current term)
      const existingTerm = await query(
        'SELECT * FROM school_terms WHERE (school_year = $1 AND semester = $2) AND term_id != $3',
        [school_year, semester, id]
      );
      
      if (existingTerm.rows.length > 0) {
        return res.status(400).json({ error: 'School term already exists for this year and semester' });
      }
      
      // Update school term
      const result = await query(
        `UPDATE school_terms SET school_year = $1, semester = $2, start_date = $3, end_date = $4, is_active = $5 WHERE term_id = $6 RETURNING *`,
        [school_year, semester, start_date, end_date, is_active, id]
      );
      
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'School term not found' });
      }
      
      res.status(200).json(result.rows[0]);
      
    } else if (req.method === 'DELETE') {
      // Delete school term - ID comes from URL path
      const { id } = req.query;
      
      if (!id) {
        return res.status(400).json({ error: 'School term ID is required' });
      }
      
      // Check if school term exists
      const existingTerm = await query('SELECT * FROM school_terms WHERE term_id = $1', [id]);
      
      if (existingTerm.rows.length === 0) {
        return res.status(404).json({ error: 'School term not found' });
      }
      
      // Delete school term
      await query('DELETE FROM school_terms WHERE term_id = $1', [id]);
      
      res.status(200).json({ message: 'School term deleted successfully' });
      
    } else {
      res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
    }
    
  } catch (error) {
    console.error('❌ [SCHOOL TERMS API] Error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
}
