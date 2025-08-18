import pkg from 'pg';
const { Pool } = pkg;

export default async function handler(req, res) {
  console.log('🔍 [DEPARTMENTS API] Request received:', {
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

  // Create database connection
  const connectionString = `postgresql://${process.env.NEON_USER}:${process.env.NEON_PASSWORD}@${process.env.NEON_HOST}:${process.env.NEON_PORT || 5432}/${process.env.NEON_DATABASE}?sslmode=require`;
  
  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
    max: 1, // Limit connections for serverless
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });

  try {
    if (req.method === 'GET') {
      // Check if this is a request for a specific department
      if (req.query.id) {
        // Get single department by ID
        const { id } = req.query;
        console.log(`📡 [DEPARTMENTS API] Fetching department with ID: ${id}`);
        
        const result = await pool.query('SELECT * FROM departments WHERE department_id = $1', [id]);
        
        if (result.rows.length === 0) {
          return res.status(404).json({ error: 'Department not found' });
        }
        
        res.status(200).json(result.rows[0]);
      } else {
        // Get all departments
        console.log('📡 [DEPARTMENTS API] Executing database query: SELECT * FROM departments ORDER BY name ASC');
        const result = await pool.query('SELECT * FROM departments ORDER BY name ASC');
        console.log(`✅ [DEPARTMENTS API] Query successful. Found ${result.rows.length} departments`);
        
        res.status(200).json(result.rows);
      }
      
    } else if (req.method === 'POST') {
      // Create new department
      const { name, department_abbreviation } = req.body;
      
      if (!name || !department_abbreviation) {
        return res.status(400).json({ error: 'Name and abbreviation are required' });
      }
      
      // Check for duplicates
      const existingDept = await pool.query(
        'SELECT * FROM departments WHERE name = $1 OR department_abbreviation = $2',
        [name, department_abbreviation]
      );
      
      if (existingDept.rows.length > 0) {
        return res.status(400).json({ error: 'Department name or abbreviation already exists' });
      }
      
      // Insert new department
      const result = await pool.query(
        `INSERT INTO departments (name, department_abbreviation) VALUES ($1, $2) RETURNING *`,
        [name, department_abbreviation]
      );
      
      res.status(201).json(result.rows[0]);
      
    } else if (req.method === 'PUT') {
      // Update department - ID comes from URL path
      const { id } = req.query;
      const { name, department_abbreviation } = req.body;
      
      if (!id || !name || !department_abbreviation) {
        return res.status(400).json({ error: 'ID, name and abbreviation are required' });
      }
      
      // Check for duplicates (excluding current department)
      const existingDept = await pool.query(
        'SELECT * FROM departments WHERE (name = $1 OR department_abbreviation = $2) AND department_id != $3',
        [name, department_abbreviation, id]
      );
      
      if (existingDept.rows.length > 0) {
        return res.status(400).json({ error: 'Department name or abbreviation already exists' });
      }
      
      // Update department
      const result = await pool.query(
        `UPDATE departments SET name = $1, department_abbreviation = $2 WHERE department_id = $3 RETURNING *`,
        [name, department_abbreviation, id]
      );
      
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Department not found' });
      }
      
      res.status(200).json(result.rows[0]);
      
    } else if (req.method === 'DELETE') {
      // Delete department - ID comes from URL path
      const { id } = req.query;
      
      if (!id) {
        return res.status(400).json({ error: 'Department ID is required' });
      }
      
      // Check if department exists
      const existingDept = await pool.query('SELECT * FROM departments WHERE department_id = $1', [id]);
      
      if (existingDept.rows.length === 0) {
        return res.status(404).json({ error: 'Department not found' });
      }
      
      // Delete department
      await pool.query('DELETE FROM departments WHERE department_id = $1', [id]);
      
      res.status(200).json({ message: 'Department deleted successfully' });
      
    } else {
      res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
    }
    
  } catch (error) {
    console.error('❌ [DEPARTMENTS API] Error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  } finally {
    // Always close the pool
    await pool.end();
  }
}
