import express from 'express';
import { query } from '../../src/config/database.js';

const router = express.Router();

// Test endpoint to verify API is working
router.get('/test', (req, res) => {
  console.log('🧪 [DEPARTMENTS API] Test endpoint hit - API is working');
  res.json({ message: 'Departments API is working!', timestamp: new Date().toISOString() });
});

// GET all departments
router.get('/', async (req, res) => {
  console.log('🔍 [DEPARTMENTS API] GET / - Fetching all departments');
  try {
    console.log('📡 [DEPARTMENTS API] Executing database query: SELECT * FROM departments ORDER BY name ASC');
    const result = await query(
      'SELECT * FROM departments ORDER BY name ASC'
    );
    console.log(`✅ [DEPARTMENTS API] Query successful. Found ${result.rows.length} departments`);
    console.log('📊 [DEPARTMENTS API] Departments data:', result.rows);
    res.json(result.rows);
  } catch (error) {
    console.error('❌ [DEPARTMENTS API] Error fetching departments:', error);
    console.error('🔍 [DEPARTMENTS API] Error details:', {
      message: error.message,
      stack: error.stack,
      code: error.code
    });
    res.status(500).json({ error: 'Failed to fetch departments' });
  }
});

// GET single department by ID
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  console.log(`🔍 [DEPARTMENTS API] GET /${id} - Fetching department by ID`);
  try {
    console.log(`📡 [DEPARTMENTS API] Executing database query: SELECT * FROM departments WHERE department_id = ${id}`);
    const result = await query(
      'SELECT * FROM departments WHERE department_id = $1',
      [id]
    );
    
    if (result.rows.length === 0) {
      console.log(`⚠️ [DEPARTMENTS API] Department with ID ${id} not found`);
      return res.status(404).json({ error: 'Department not found' });
    }
    
    console.log(`✅ [DEPARTMENTS API] Department found:`, result.rows[0]);
    res.json(result.rows[0]);
  } catch (error) {
    console.error(`❌ [DEPARTMENTS API] Error fetching department ${id}:`, error);
    console.error('🔍 [DEPARTMENTS API] Error details:', {
      message: error.message,
      stack: error.stack,
      code: error.code
    });
    res.status(500).json({ error: 'Failed to fetch department' });
  }
});

// POST create new department
router.post('/', async (req, res) => {
  console.log('🔍 [DEPARTMENTS API] POST / - Creating new department');
  console.log('📝 [DEPARTMENTS API] Request body:', req.body);
  
  try {
    const { name, department_abbreviation, status = 'active' } = req.body;
    
    // Validate required fields
    if (!name || !department_abbreviation) {
      console.log('⚠️ [DEPARTMENTS API] Validation failed: Missing required fields');
      return res.status(400).json({ 
        error: 'Name and abbreviation are required' 
      });
    }
    
    console.log('✅ [DEPARTMENTS API] Validation passed. Checking for duplicates...');
    
    // Check if name or abbreviation already exists
    const existingDept = await query(
      'SELECT * FROM departments WHERE name = $1 OR department_abbreviation = $2',
      [name, department_abbreviation]
    );
    
    if (existingDept.rows.length > 0) {
      console.log('⚠️ [DEPARTMENTS API] Duplicate found:', existingDept.rows);
      return res.status(400).json({ 
        error: 'Department name or abbreviation already exists' 
      });
    }
    
    console.log('📡 [DEPARTMENTS API] Executing INSERT query...');
    // Insert new department
    const result = await query(
      `INSERT INTO departments (name, department_abbreviation) 
       VALUES ($1, $2) 
       RETURNING *`,
      [name, department_abbreviation]
    );
    
    console.log(`✅ [DEPARTMENTS API] Department created successfully:`, result.rows[0]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('❌ [DEPARTMENTS API] Error creating department:', error);
    console.error('🔍 [DEPARTMENTS API] Error details:', {
      message: error.message,
      stack: error.stack,
      code: error.code
    });
    res.status(500).json({ error: 'Failed to create department' });
  }
});

// PUT update department
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  console.log(`🔍 [DEPARTMENTS API] PUT /${id} - Updating department`);
  console.log('📝 [DEPARTMENTS API] Request body:', req.body);
  
  try {
    const { name, department_abbreviation, status } = req.body;
    
    // Validate required fields
    if (!name || !department_abbreviation) {
      console.log('⚠️ [DEPARTMENTS API] Validation failed: Missing required fields');
      return res.status(400).json({ 
        error: 'Name and abbreviation are required' 
      });
    }
    
    console.log('✅ [DEPARTMENTS API] Validation passed. Checking for duplicates...');
    
    // Check if name or abbreviation already exists (excluding current department)
    const existingDept = await query(
      'SELECT * FROM departments WHERE (name = $1 OR department_abbreviation = $2) AND department_id != $3',
      [name, department_abbreviation, id]
    );
    
    if (existingDept.rows.length > 0) {
      console.log('⚠️ [DEPARTMENTS API] Duplicate found:', existingDept.rows);
      return res.status(400).json({ 
        error: 'Department name or abbreviation already exists' 
      });
    }
    
    console.log('📡 [DEPARTMENTS API] Executing UPDATE query...');
    // Update department
    const result = await query(
      `UPDATE departments 
       SET name = $1, department_abbreviation = $2 
       WHERE department_id = $3 
       RETURNING *`,
      [name, department_abbreviation, id]
    );
    
    if (result.rows.length === 0) {
      console.log(`⚠️ [DEPARTMENTS API] Department with ID ${id} not found for update`);
      return res.status(404).json({ error: 'Department not found' });
    }
    
    console.log(`✅ [DEPARTMENTS API] Department updated successfully:`, result.rows[0]);
    res.json(result.rows[0]);
  } catch (error) {
    console.error(`❌ [DEPARTMENTS API] Error updating department ${id}:`, error);
    console.error('🔍 [DEPARTMENTS API] Error details:', {
      message: error.message,
      stack: error.stack,
      code: error.code
    });
    res.status(500).json({ error: 'Failed to update department' });
  }
});

// DELETE department
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  console.log(`🔍 [DEPARTMENTS API] DELETE /${id} - Deleting department`);
  
  try {
    // Check if department exists
    const existingDept = await query(
      'SELECT * FROM departments WHERE department_id = $1',
      [id]
    );
    
    if (existingDept.rows.length === 0) {
      console.log(`⚠️ [DEPARTMENTS API] Department with ID ${id} not found for deletion`);
      return res.status(404).json({ error: 'Department not found' });
    }
    
    console.log('📡 [DEPARTMENTS API] Executing DELETE query...');
    // Delete department
    await query(
      'DELETE FROM departments WHERE department_id = $1',
      [id]
    );
    
    console.log(`✅ [DEPARTMENTS API] Department ${id} deleted successfully`);
    res.json({ message: 'Department deleted successfully' });
  } catch (error) {
    console.error(`❌ [DEPARTMENTS API] Error deleting department ${id}:`, error);
    console.error('🔍 [DEPARTMENTS API] Error details:', {
      message: error.message,
      stack: error.stack,
      code: error.code
    });
    res.status(500).json({ error: 'Failed to delete department' });
  }
});

// PATCH toggle department status - DISABLED (status column not in schema)
router.patch('/:id/toggle-status', async (req, res) => {
  res.status(501).json({ error: 'Status toggle not supported - status column not in database schema' });
});

export default router;
