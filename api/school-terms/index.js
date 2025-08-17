import express from 'express';
import { query } from '../../src/config/database.js';

const router = express.Router();

// Test endpoint to verify API is working
router.get('/test', (req, res) => {
  console.log('🧪 [SCHOOL TERMS API] Test endpoint hit - API is working');
  res.json({ message: 'School Terms API is working!', timestamp: new Date().toISOString() });
});

// GET all school terms
router.get('/', async (req, res) => {
  console.log('🔍 [SCHOOL TERMS API] GET / - Fetching all school terms');
  try {
    console.log('📡 [SCHOOL TERMS API] Executing database query: SELECT * FROM school_terms ORDER BY start_date DESC');
    const result = await query(
      'SELECT * FROM school_terms ORDER BY start_date DESC'
    );
    console.log(`✅ [SCHOOL TERMS API] Query successful. Found ${result.rows.length} school terms`);
    console.log('📊 [SCHOOL TERMS API] School terms data:', result.rows);
    res.json(result.rows);
  } catch (error) {
    console.error('❌ [SCHOOL TERMS API] Error fetching school terms:', error);
    console.error('🔍 [SCHOOL TERMS API] Error details:', {
      message: error.message,
      stack: error.stack,
      code: error.code
    });
    res.status(500).json({ error: 'Failed to fetch school terms' });
  }
});

// GET single school term by ID
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  console.log(`🔍 [SCHOOL TERMS API] GET /${id} - Fetching school term by ID`);
  try {
    console.log(`📡 [SCHOOL TERMS API] Executing database query: SELECT * FROM school_terms WHERE term_id = ${id}`);
    const result = await query(
      'SELECT * FROM school_terms WHERE term_id = $1',
      [id]
    );
    
    if (result.rows.length === 0) {
      console.log(`⚠️ [SCHOOL TERMS API] School term with ID ${id} not found`);
      return res.status(404).json({ error: 'School term not found' });
    }
    
    console.log(`✅ [SCHOOL TERMS API] School term found:`, result.rows[0]);
    res.json(result.rows[0]);
  } catch (error) {
    console.error(`❌ [SCHOOL TERMS API] Error fetching school term ${id}:`, error);
    console.error('🔍 [SCHOOL TERMS API] Error details:', {
      message: error.message,
      stack: error.stack,
      code: error.code
    });
    res.status(500).json({ error: 'Failed to fetch school term' });
  }
});

// POST create new school term
router.post('/', async (req, res) => {
  console.log('🔍 [SCHOOL TERMS API] POST / - Creating new school term');
  console.log('📝 [SCHOOL TERMS API] Request body:', req.body);
  
  try {
    const { school_year, semester, start_date, end_date, is_active = false } = req.body;
    
    // Validate required fields
    if (!school_year || !semester || !start_date || !end_date) {
      console.log('⚠️ [SCHOOL TERMS API] Validation failed: Missing required fields');
      return res.status(400).json({ 
        error: 'School year, semester, start date, and end date are required' 
      });
    }
    
    console.log('✅ [SCHOOL TERMS API] Validation passed. Checking for duplicates...');
    
    // Check if school year and semester combination already exists
    const existingTerm = await query(
      'SELECT * FROM school_terms WHERE school_year = $1 AND semester = $2',
      [school_year, semester]
    );
    
    if (existingTerm.rows.length > 0) {
      console.log('⚠️ [SCHOOL TERMS API] Duplicate found:', existingTerm.rows);
      return res.status(400).json({ 
        error: 'School term with this year and semester already exists' 
      });
    }
    
    console.log('✅ [SCHOOL TERMS API] No duplicates found. Validating date range...');
    
    // Validate date range
    const startDate = new Date(start_date);
    const endDate = new Date(end_date);
    
    if (startDate >= endDate) {
      console.log('⚠️ [SCHOOL TERMS API] Date validation failed: Start date must be before end date');
      return res.status(400).json({ 
        error: 'Start date must be before end date' 
      });
    }
    
    console.log('✅ [SCHOOL TERMS API] Date validation passed. Checking for overlapping terms...');
    
    // Check for overlapping terms
    const overlappingTerms = await query(
      `SELECT * FROM school_terms 
       WHERE is_active = true 
       AND (
         (start_date <= $1 AND end_date >= $1) OR
         (start_date <= $2 AND end_date >= $2) OR
         (start_date >= $1 AND end_date <= $2)
       )`,
      [start_date, end_date]
    );
    
    if (overlappingTerms.rows.length > 0) {
      console.log('⚠️ [SCHOOL TERMS API] Overlapping terms found:', overlappingTerms.rows);
      return res.status(400).json({ 
        error: 'School term dates overlap with existing active terms' 
      });
    }
    
    console.log('✅ [SCHOOL TERMS API] No overlapping terms. Executing INSERT query...');
    
    // Insert new school term
    const result = await query(
      `INSERT INTO school_terms (school_year, semester, start_date, end_date, is_active) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING *`,
      [school_year, semester, start_date, end_date, is_active]
    );
    
    console.log(`✅ [SCHOOL TERMS API] School term created successfully:`, result.rows[0]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('❌ [SCHOOL TERMS API] Error creating school term:', error);
    console.error('🔍 [SCHOOL TERMS API] Error details:', {
      message: error.message,
      stack: error.stack,
      code: error.code
    });
    res.status(500).json({ error: 'Failed to create school term' });
  }
});

// PUT update school term
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  console.log(`🔍 [SCHOOL TERMS API] PUT /${id} - Updating school term`);
  console.log('📝 [SCHOOL TERMS API] Request body:', req.body);
  
  try {
    const { school_year, semester, start_date, end_date, is_active } = req.body;
    
    // Validate required fields
    if (!school_year || !semester || !start_date || !end_date) {
      console.log('⚠️ [SCHOOL TERMS API] Validation failed: Missing required fields');
      return res.status(400).json({ 
        error: 'School year, semester, start date, and end date are required' 
      });
    }
    
    console.log('✅ [SCHOOL TERMS API] Validation passed. Checking for duplicates...');
    
    // Check if school year and semester combination already exists (excluding current term)
    const existingTerm = await query(
      'SELECT * FROM school_terms WHERE school_year = $1 AND semester = $2 AND term_id != $3',
      [school_year, semester, id]
    );
    
    if (existingTerm.rows.length > 0) {
      console.log('⚠️ [SCHOOL TERMS API] Duplicate found:', existingTerm.rows);
      return res.status(400).json({ 
        error: 'School term with this year and semester already exists' 
      });
    }
    
    console.log('✅ [SCHOOL TERMS API] No duplicates found. Validating date range...');
    
    // Validate date range
    const startDate = new Date(start_date);
    const endDate = new Date(end_date);
    
    if (startDate >= endDate) {
      console.log('⚠️ [SCHOOL TERMS API] Date validation failed: Start date must be before end date');
      return res.status(400).json({ 
        error: 'Start date must be before end date' 
      });
    }
    
    console.log('✅ [SCHOOL TERMS API] Date validation passed. Checking for overlapping terms...');
    
    // Check for overlapping terms (excluding current term)
    const overlappingTerms = await query(
      `SELECT * FROM school_terms 
       WHERE is_active = true 
       AND term_id != $1
       AND (
         (start_date <= $2 AND end_date >= $2) OR
         (start_date <= $3 AND end_date >= $3) OR
         (start_date >= $2 AND end_date <= $3)
       )`,
      [id, start_date, end_date]
    );
    
    if (overlappingTerms.rows.length > 0) {
      console.log('⚠️ [SCHOOL TERMS API] Overlapping terms found:', overlappingTerms.rows);
      return res.status(400).json({ 
        error: 'School term dates overlap with existing active terms' 
      });
    }
    
    console.log('✅ [SCHOOL TERMS API] No overlapping terms. Executing UPDATE query...');
    
    // Update school term
    const result = await query(
      `UPDATE school_terms 
       SET school_year = $1, semester = $2, start_date = $3, end_date = $4, is_active = $5 
       WHERE term_id = $6 
       RETURNING *`,
      [school_year, semester, start_date, end_date, is_active, id]
    );
    
    if (result.rows.length === 0) {
      console.log(`⚠️ [SCHOOL TERMS API] School term with ID ${id} not found for update`);
      return res.status(404).json({ error: 'School term not found' });
    }
    
    console.log(`✅ [SCHOOL TERMS API] School term updated successfully:`, result.rows[0]);
    res.json(result.rows[0]);
  } catch (error) {
    console.error(`❌ [SCHOOL TERMS API] Error updating school term ${id}:`, error);
    console.error('🔍 [SCHOOL TERMS API] Error details:', {
      message: error.message,
      stack: error.stack,
      code: error.code
    });
    res.status(500).json({ error: 'Failed to update school term' });
  }
});

// DELETE school term
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  console.log(`🔍 [SCHOOL TERMS API] DELETE /${id} - Deleting school term`);
  
  try {
    // Check if school term exists
    const existingTerm = await query(
      'SELECT * FROM school_terms WHERE term_id = $1',
      [id]
    );
    
    if (existingTerm.rows.length === 0) {
      console.log(`⚠️ [SCHOOL TERMS API] School term with ID ${id} not found for deletion`);
      return res.status(404).json({ error: 'School term not found' });
    }
    
    console.log('📡 [SCHOOL TERMS API] Executing DELETE query...');
    // Delete school term
    await query(
      'DELETE FROM school_terms WHERE term_id = $1',
      [id]
    );
    
    console.log(`✅ [SCHOOL TERMS API] School term ${id} deleted successfully`);
    res.json({ message: 'School term deleted successfully' });
  } catch (error) {
    console.error(`❌ [SCHOOL TERMS API] Error deleting school term ${id}:`, error);
    console.error('🔍 [SCHOOL TERMS API] Error details:', {
      message: error.message,
      stack: error.stack,
      code: error.code
    });
    res.status(500).json({ error: 'Failed to delete school term' });
  }
});

// PATCH toggle school term status
router.patch('/:id/toggle-status', async (req, res) => {
  const { id } = req.params;
  console.log(`🔍 [SCHOOL TERMS API] PATCH /${id}/toggle-status - Toggling school term status`);
  
  try {
    // Get current status
    const currentTerm = await query(
      'SELECT is_active FROM school_terms WHERE term_id = $1',
      [id]
    );
    
    if (currentTerm.rows.length === 0) {
      console.log(`⚠️ [SCHOOL TERMS API] School term with ID ${id} not found for status toggle`);
      return res.status(404).json({ error: 'School term not found' });
    }
    
    const newStatus = !currentTerm.rows[0].is_active;
    console.log(`🔄 [SCHOOL TERMS API] Toggling status from ${currentTerm.rows[0].is_active} to ${newStatus}`);
    
    // Update status
    const result = await query(
      `UPDATE school_terms 
       SET is_active = $1 
       WHERE term_id = $2 
       RETURNING *`,
      [newStatus, id]
    );
    
    console.log(`✅ [SCHOOL TERMS API] School term status updated successfully:`, result.rows[0]);
    res.json(result.rows[0]);
  } catch (error) {
    console.error(`❌ [SCHOOL TERMS API] Error toggling school term status ${id}:`, error);
    console.error('🔍 [SCHOOL TERMS API] Error details:', {
      message: error.message,
      stack: error.stack,
      code: error.code
    });
    res.status(500).json({ error: 'Failed to toggle school term status' });
  }
});

export default router;
