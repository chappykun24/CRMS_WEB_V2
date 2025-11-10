import express from 'express';
import db from '../config/database.js';

const router = express.Router();

// GET /api/ilos/syllabus/:syllabusId - Get all ILOs for a syllabus
router.get('/syllabus/:syllabusId', async (req, res) => {
  const { syllabusId } = req.params;
  
  try {
    // First get all ILOs
    const ilosQuery = `
      SELECT * FROM ilos
      WHERE syllabus_id = $1 AND is_active = TRUE
      ORDER BY code
    `;
    const ilosResult = await db.query(ilosQuery, [syllabusId]);
    const ilos = ilosResult.rows;
    
    // Get mappings for each ILO
    const ilosWithMappings = await Promise.all(ilos.map(async (ilo) => {
      // Get SO mappings
      const soQuery = `
        SELECT 
          so.so_id,
          so.so_code,
          so.description,
          ilo_so.assessment_tasks
        FROM ilo_so_mappings ilo_so
        JOIN student_outcomes so ON ilo_so.so_id = so.so_id
        WHERE ilo_so.ilo_id = $1
      `;
      const soResult = await db.query(soQuery, [ilo.ilo_id]);
      
      // Get IGA mappings
      const igaQuery = `
        SELECT 
          iga.iga_id,
          iga.iga_code,
          iga.description,
          ilo_iga.assessment_tasks
        FROM ilo_iga_mappings ilo_iga
        JOIN institutional_graduate_attributes iga ON ilo_iga.iga_id = iga.iga_id
        WHERE ilo_iga.ilo_id = $1
      `;
      const igaResult = await db.query(igaQuery, [ilo.ilo_id]);
      
      // Get CDIO mappings
      const cdioQuery = `
        SELECT 
          cdio.cdio_id,
          cdio.cdio_code,
          cdio.description,
          ilo_cdio.assessment_tasks
        FROM ilo_cdio_mappings ilo_cdio
        JOIN cdio_skills cdio ON ilo_cdio.cdio_id = cdio.cdio_id
        WHERE ilo_cdio.ilo_id = $1
      `;
      const cdioResult = await db.query(cdioQuery, [ilo.ilo_id]);
      
      // Get SDG mappings
      const sdgQuery = `
        SELECT 
          sdg.sdg_id,
          sdg.sdg_code,
          sdg.description,
          ilo_sdg.assessment_tasks
        FROM ilo_sdg_mappings ilo_sdg
        JOIN sdg_skills sdg ON ilo_sdg.sdg_id = sdg.sdg_id
        WHERE ilo_sdg.ilo_id = $1
      `;
      const sdgResult = await db.query(sdgQuery, [ilo.ilo_id]);
      
      return {
        ...ilo,
        so_mappings: soResult.rows,
        iga_mappings: igaResult.rows,
        cdio_mappings: cdioResult.rows,
        sdg_mappings: sdgResult.rows
      };
    }));
    
    res.json(ilosWithMappings);
  } catch (error) {
    console.error('Error fetching ILOs:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// GET /api/ilos/:id - Get a specific ILO with all mappings
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  
  try {
    // Get ILO
    const iloQuery = 'SELECT * FROM ilos WHERE ilo_id = $1';
    const iloResult = await db.query(iloQuery, [id]);
    
    if (iloResult.rows.length === 0) {
      return res.status(404).json({ error: 'ILO not found' });
    }
    
    const ilo = iloResult.rows[0];
    
    // Get SO mappings
    const soQuery = `
      SELECT 
        so.so_id,
        so.so_code,
        so.description,
        ilo_so.assessment_tasks
      FROM ilo_so_mappings ilo_so
      JOIN student_outcomes so ON ilo_so.so_id = so.so_id
      WHERE ilo_so.ilo_id = $1
    `;
    const soResult = await db.query(soQuery, [id]);
    
    // Get IGA mappings
    const igaQuery = `
      SELECT 
        iga.iga_id,
        iga.iga_code,
        iga.description,
        ilo_iga.assessment_tasks
      FROM ilo_iga_mappings ilo_iga
      JOIN institutional_graduate_attributes iga ON ilo_iga.iga_id = iga.iga_id
      WHERE ilo_iga.ilo_id = $1
    `;
    const igaResult = await db.query(igaQuery, [id]);
    
    // Get CDIO mappings
    const cdioQuery = `
      SELECT 
        cdio.cdio_id,
        cdio.cdio_code,
        cdio.description,
        ilo_cdio.assessment_tasks
      FROM ilo_cdio_mappings ilo_cdio
      JOIN cdio_skills cdio ON ilo_cdio.cdio_id = cdio.cdio_id
      WHERE ilo_cdio.ilo_id = $1
    `;
    const cdioResult = await db.query(cdioQuery, [id]);
    
    // Get SDG mappings
    const sdgQuery = `
      SELECT 
        sdg.sdg_id,
        sdg.sdg_code,
        sdg.description,
        ilo_sdg.assessment_tasks
      FROM ilo_sdg_mappings ilo_sdg
      JOIN sdg_skills sdg ON ilo_sdg.sdg_id = sdg.sdg_id
      WHERE ilo_sdg.ilo_id = $1
    `;
    const sdgResult = await db.query(sdgQuery, [id]);
    
    res.json({
      ...ilo,
      so_mappings: soResult.rows,
      iga_mappings: igaResult.rows,
      cdio_mappings: cdioResult.rows,
      sdg_mappings: sdgResult.rows
    });
  } catch (error) {
    console.error('Error fetching ILO:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// POST /api/ilos - Create a new ILO
router.post('/', async (req, res) => {
  const {
    syllabus_id,
    code,
    description,
    category,
    level,
    weight_percentage,
    assessment_methods,
    learning_activities
  } = req.body;
  
  try {
    const query = `
      INSERT INTO ilos (
        syllabus_id, code, description, category, level,
        weight_percentage, assessment_methods, learning_activities
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;
    
    const values = [
      syllabus_id,
      code,
      description || null,
      category || null,
      level || null,
      weight_percentage || null,
      assessment_methods || [],
      learning_activities || []
    ];
    
    const result = await db.query(query, values);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating ILO:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// PUT /api/ilos/:id - Update an ILO
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const {
    code,
    description,
    category,
    level,
    weight_percentage,
    assessment_methods,
    learning_activities,
    is_active
  } = req.body;
  
  try {
    const query = `
      UPDATE ilos SET
        code = COALESCE($1, code),
        description = COALESCE($2, description),
        category = COALESCE($3, category),
        level = COALESCE($4, level),
        weight_percentage = COALESCE($5, weight_percentage),
        assessment_methods = COALESCE($6, assessment_methods),
        learning_activities = COALESCE($7, learning_activities),
        is_active = COALESCE($8, is_active),
        updated_at = CURRENT_TIMESTAMP
      WHERE ilo_id = $9
      RETURNING *
    `;
    
    const values = [
      code,
      description,
      category,
      level,
      weight_percentage,
      assessment_methods,
      learning_activities,
      is_active,
      id
    ];
    
    const result = await db.query(query, values);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'ILO not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating ILO:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// DELETE /api/ilos/:id - Delete an ILO
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  
  try {
    const query = 'DELETE FROM ilos WHERE ilo_id = $1 RETURNING ilo_id, code';
    const result = await db.query(query, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'ILO not found' });
    }
    
    res.json({ message: 'ILO deleted successfully', ilo: result.rows[0] });
  } catch (error) {
    console.error('Error deleting ILO:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// GET /api/ilos/references/so - Get all Student Outcomes
router.get('/references/so', async (req, res) => {
  try {
    const query = 'SELECT * FROM student_outcomes WHERE is_active = TRUE ORDER BY so_code';
    const result = await db.query(query);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching SO references:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// GET /api/ilos/references/iga - Get all IGA references
router.get('/references/iga', async (req, res) => {
  try {
    const query = 'SELECT * FROM institutional_graduate_attributes WHERE is_active = TRUE ORDER BY iga_code';
    const result = await db.query(query);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching IGA references:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// GET /api/ilos/references/cdio - Get all CDIO references
router.get('/references/cdio', async (req, res) => {
  try {
    const query = 'SELECT * FROM cdio_skills WHERE is_active = TRUE ORDER BY cdio_code';
    const result = await db.query(query);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching CDIO references:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// GET /api/ilos/references/sdg - Get all SDG references
router.get('/references/sdg', async (req, res) => {
  try {
    const query = 'SELECT * FROM sdg_skills WHERE is_active = TRUE ORDER BY sdg_code';
    const result = await db.query(query);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching SDG references:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// POST /api/ilos/:iloId/mappings/so - Create or update SO mapping
router.post('/:iloId/mappings/so', async (req, res) => {
  const { iloId } = req.params;
  const { so_id, assessment_tasks } = req.body;
  
  try {
    const query = `
      INSERT INTO ilo_so_mappings (ilo_id, so_id, assessment_tasks)
      VALUES ($1, $2, $3)
      ON CONFLICT (ilo_id, so_id)
      DO UPDATE SET
        assessment_tasks = EXCLUDED.assessment_tasks,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `;
    
    const result = await db.query(query, [iloId, so_id, assessment_tasks || []]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating SO mapping:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// POST /api/ilos/:iloId/mappings/iga - Create or update IGA mapping
router.post('/:iloId/mappings/iga', async (req, res) => {
  const { iloId } = req.params;
  const { iga_id, assessment_tasks } = req.body;
  
  try {
    const query = `
      INSERT INTO ilo_iga_mappings (ilo_id, iga_id, assessment_tasks)
      VALUES ($1, $2, $3)
      ON CONFLICT (ilo_id, iga_id)
      DO UPDATE SET
        assessment_tasks = EXCLUDED.assessment_tasks,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `;
    
    const result = await db.query(query, [iloId, iga_id, assessment_tasks || []]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating IGA mapping:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// POST /api/ilos/:iloId/mappings/cdio - Create or update CDIO mapping
router.post('/:iloId/mappings/cdio', async (req, res) => {
  const { iloId } = req.params;
  const { cdio_id, assessment_tasks } = req.body;
  
  try {
    const query = `
      INSERT INTO ilo_cdio_mappings (ilo_id, cdio_id, assessment_tasks)
      VALUES ($1, $2, $3)
      ON CONFLICT (ilo_id, cdio_id)
      DO UPDATE SET
        assessment_tasks = EXCLUDED.assessment_tasks,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `;
    
    const result = await db.query(query, [iloId, cdio_id, assessment_tasks || []]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating CDIO mapping:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// POST /api/ilos/:iloId/mappings/sdg - Create or update SDG mapping
router.post('/:iloId/mappings/sdg', async (req, res) => {
  const { iloId } = req.params;
  const { sdg_id, assessment_tasks } = req.body;
  
  try {
    const query = `
      INSERT INTO ilo_sdg_mappings (ilo_id, sdg_id, assessment_tasks)
      VALUES ($1, $2, $3)
      ON CONFLICT (ilo_id, sdg_id)
      DO UPDATE SET
        assessment_tasks = EXCLUDED.assessment_tasks,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `;
    
    const result = await db.query(query, [iloId, sdg_id, assessment_tasks || []]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating SDG mapping:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// DELETE /api/ilos/:iloId/mappings/so/:soId - Delete SO mapping
router.delete('/:iloId/mappings/so/:soId', async (req, res) => {
  const { iloId, soId } = req.params;
  
  try {
    const query = 'DELETE FROM ilo_so_mappings WHERE ilo_id = $1 AND so_id = $2 RETURNING *';
    const result = await db.query(query, [iloId, soId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Mapping not found' });
    }
    
    res.json({ message: 'Mapping deleted successfully' });
  } catch (error) {
    console.error('Error deleting SO mapping:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// DELETE /api/ilos/:iloId/mappings/iga/:igaId - Delete IGA mapping
router.delete('/:iloId/mappings/iga/:igaId', async (req, res) => {
  const { iloId, igaId } = req.params;
  
  try {
    const query = 'DELETE FROM ilo_iga_mappings WHERE ilo_id = $1 AND iga_id = $2 RETURNING *';
    const result = await db.query(query, [iloId, igaId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Mapping not found' });
    }
    
    res.json({ message: 'Mapping deleted successfully' });
  } catch (error) {
    console.error('Error deleting IGA mapping:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// DELETE /api/ilos/:iloId/mappings/cdio/:cdioId - Delete CDIO mapping
router.delete('/:iloId/mappings/cdio/:cdioId', async (req, res) => {
  const { iloId, cdioId } = req.params;
  
  try {
    const query = 'DELETE FROM ilo_cdio_mappings WHERE ilo_id = $1 AND cdio_id = $2 RETURNING *';
    const result = await db.query(query, [iloId, cdioId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Mapping not found' });
    }
    
    res.json({ message: 'Mapping deleted successfully' });
  } catch (error) {
    console.error('Error deleting CDIO mapping:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// DELETE /api/ilos/:iloId/mappings/sdg/:sdgId - Delete SDG mapping
router.delete('/:iloId/mappings/sdg/:sdgId', async (req, res) => {
  const { iloId, sdgId } = req.params;
  
  try {
    const query = 'DELETE FROM ilo_sdg_mappings WHERE ilo_id = $1 AND sdg_id = $2 RETURNING *';
    const result = await db.query(query, [iloId, sdgId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Mapping not found' });
    }
    
    res.json({ message: 'Mapping deleted successfully' });
  } catch (error) {
    console.error('Error deleting SDG mapping:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

export default router;

