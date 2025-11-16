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

// POST /api/ilos/auto-map/:syllabusId - Auto-map ILOs based on course subject
router.post('/auto-map/:syllabusId', async (req, res) => {
  const { syllabusId } = req.params;
  const { course_code } = req.body;
  
  try {
    // Get syllabus and course information
    const syllabusQuery = `
      SELECT s.*, c.course_code, c.title as course_title, c.department_id
      FROM syllabi s
      JOIN courses c ON s.course_id = c.course_id
      WHERE s.syllabus_id = $1
    `;
    const syllabusResult = await db.query(syllabusQuery, [syllabusId]);
    
    if (syllabusResult.rows.length === 0) {
      return res.status(404).json({ error: 'Syllabus not found' });
    }
    
    const syllabus = syllabusResult.rows[0];
    const courseCode = course_code || syllabus.course_code;
    
    // Get existing ILOs for this syllabus
    const existingILOsQuery = 'SELECT * FROM ilos WHERE syllabus_id = $1 AND is_active = TRUE';
    const existingILOsResult = await db.query(existingILOsQuery, [syllabusId]);
    const existingILOs = existingILOsResult.rows;
    
    if (existingILOs.length === 0) {
      return res.status(400).json({ error: 'No ILOs found. Please create ILOs first before auto-mapping.' });
    }
    
    // Get all reference mappings
    const [soRefs, igaRefs, cdioRefs, sdgRefs] = await Promise.all([
      db.query('SELECT * FROM student_outcomes WHERE is_active = TRUE ORDER BY so_code'),
      db.query('SELECT * FROM institutional_graduate_attributes WHERE is_active = TRUE ORDER BY iga_code'),
      db.query('SELECT * FROM cdio_skills WHERE is_active = TRUE ORDER BY cdio_code'),
      db.query('SELECT * FROM sdg_skills WHERE is_active = TRUE ORDER BY sdg_code')
    ]);
    
    // Mapping rules based on course code patterns
    const mappingRules = getMappingRulesByCourseCode(courseCode);
    
    let mappedCount = 0;
    
    // Auto-map each ILO based on rules
    for (const ilo of existingILOs) {
      // Determine mappings based on course code and ILO description
      const iloMappings = determineILOMappings(ilo, courseCode, mappingRules, {
        so: soRefs.rows,
        iga: igaRefs.rows,
        cdio: cdioRefs.rows,
        sdg: sdgRefs.rows
      });
      
      // Apply SO mappings
      for (const mapping of iloMappings.so) {
        try {
          await db.query(
            `INSERT INTO ilo_so_mappings (ilo_id, so_id, assessment_tasks)
             VALUES ($1, $2, $3)
             ON CONFLICT (ilo_id, so_id) DO NOTHING`,
            [ilo.ilo_id, mapping.so_id, mapping.assessment_tasks || []]
          );
          mappedCount++;
        } catch (err) {
          console.error(`Error mapping SO ${mapping.so_id} to ILO ${ilo.ilo_id}:`, err);
        }
      }
      
      // Apply IGA mappings
      for (const mapping of iloMappings.iga) {
        try {
          await db.query(
            `INSERT INTO ilo_iga_mappings (ilo_id, iga_id, assessment_tasks)
             VALUES ($1, $2, $3)
             ON CONFLICT (ilo_id, iga_id) DO NOTHING`,
            [ilo.ilo_id, mapping.iga_id, mapping.assessment_tasks || []]
          );
          mappedCount++;
        } catch (err) {
          console.error(`Error mapping IGA ${mapping.iga_id} to ILO ${ilo.ilo_id}:`, err);
        }
      }
      
      // Apply CDIO mappings
      for (const mapping of iloMappings.cdio) {
        try {
          await db.query(
            `INSERT INTO ilo_cdio_mappings (ilo_id, cdio_id, assessment_tasks)
             VALUES ($1, $2, $3)
             ON CONFLICT (ilo_id, cdio_id) DO NOTHING`,
            [ilo.ilo_id, mapping.cdio_id, mapping.assessment_tasks || []]
          );
          mappedCount++;
        } catch (err) {
          console.error(`Error mapping CDIO ${mapping.cdio_id} to ILO ${ilo.ilo_id}:`, err);
        }
      }
      
      // Apply SDG mappings
      for (const mapping of iloMappings.sdg) {
        try {
          await db.query(
            `INSERT INTO ilo_sdg_mappings (ilo_id, sdg_id, assessment_tasks)
             VALUES ($1, $2, $3)
             ON CONFLICT (ilo_id, sdg_id) DO NOTHING`,
            [ilo.ilo_id, mapping.sdg_id, mapping.assessment_tasks || []]
          );
          mappedCount++;
        } catch (err) {
          console.error(`Error mapping SDG ${mapping.sdg_id} to ILO ${ilo.ilo_id}:`, err);
        }
      }
    }
    
    res.json({
      success: true,
      message: `Successfully auto-mapped ${mappedCount} ILO mappings`,
      mapped_count: mappedCount
    });
  } catch (error) {
    console.error('Error auto-mapping ILOs:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// Helper function to get mapping rules based on course code
function getMappingRulesByCourseCode(courseCode) {
  const code = courseCode?.toUpperCase() || '';
  
  // Define mapping rules by course prefix/pattern
  const rules = {
    // Computer Science courses
    'CS': {
      so: ['SO1', 'SO2', 'SO3', 'SO4', 'SO5', 'SO6'],
      cdio: ['CDIO1', 'CDIO2', 'CDIO3', 'CDIO4'],
      iga: ['IGA1', 'IGA2', 'IGA3'],
      sdg: ['SDG4', 'SDG9']
    },
    // Information Technology courses
    'IT': {
      so: ['SO1', 'SO2', 'SO3', 'SO4', 'SO5'],
      cdio: ['CDIO1', 'CDIO2', 'CDIO3'],
      iga: ['IGA1', 'IGA2'],
      sdg: ['SDG4', 'SDG9']
    },
    // Business/Accounting courses
    'BA': {
      so: ['SO1', 'SO2', 'SO3'],
      cdio: ['CDIO1', 'CDIO2'],
      iga: ['IGA1', 'IGA2', 'IGA3'],
      sdg: ['SDG8', 'SDG9']
    },
    // General Education courses
    'GED': {
      so: ['SO1', 'SO2'],
      cdio: ['CDIO1'],
      iga: ['IGA1', 'IGA2', 'IGA3'],
      sdg: ['SDG4']
    },
    // Default rules
    'default': {
      so: ['SO1', 'SO2'],
      cdio: ['CDIO1'],
      iga: ['IGA1'],
      sdg: ['SDG4']
    }
  };
  
  // Match course code prefix
  for (const [prefix, rule] of Object.entries(rules)) {
    if (prefix !== 'default' && code.startsWith(prefix)) {
      return rule;
    }
  }
  
  return rules.default;
}

// Helper function to determine ILO mappings based on ILO content and course
function determineILOMappings(ilo, courseCode, mappingRules, references) {
  const mappings = {
    so: [],
    iga: [],
    cdio: [],
    sdg: []
  };
  
  const iloDescription = (ilo.description || '').toLowerCase();
  const iloCode = (ilo.code || '').toUpperCase();
  
  // Get reference codes from rules
  const soCodes = mappingRules.so || [];
  const igaCodes = mappingRules.iga || [];
  const cdioCodes = mappingRules.cdio || [];
  const sdgCodes = mappingRules.sdg || [];
  
  // Map SOs
  for (const soCode of soCodes) {
    const soRef = references.so.find(r => r.so_code === soCode);
    if (soRef) {
      mappings.so.push({
        so_id: soRef.so_id,
        assessment_tasks: determineAssessmentTasks(iloDescription, iloCode)
      });
    }
  }
  
  // Map IGAs
  for (const igaCode of igaCodes) {
    const igaRef = references.iga.find(r => r.iga_code === igaCode);
    if (igaRef) {
      mappings.iga.push({
        iga_id: igaRef.iga_id,
        assessment_tasks: determineAssessmentTasks(iloDescription, iloCode)
      });
    }
  }
  
  // Map CDIOs
  for (const cdioCode of cdioCodes) {
    const cdioRef = references.cdio.find(r => r.cdio_code === cdioCode);
    if (cdioRef) {
      mappings.cdio.push({
        cdio_id: cdioRef.cdio_id,
        assessment_tasks: determineAssessmentTasks(iloDescription, iloCode)
      });
    }
  }
  
  // Map SDGs
  for (const sdgCode of sdgCodes) {
    const sdgRef = references.sdg.find(r => r.sdg_code === sdgCode);
    if (sdgRef) {
      mappings.sdg.push({
        sdg_id: sdgRef.sdg_id,
        assessment_tasks: determineAssessmentTasks(iloDescription, iloCode)
      });
    }
  }
  
  return mappings;
}

// Helper function to determine assessment tasks based on ILO content
function determineAssessmentTasks(iloDescription, iloCode) {
  const tasks = [];
  const desc = iloDescription.toLowerCase();
  
  // Determine tasks based on keywords in description
  if (desc.includes('quiz') || desc.includes('test') || desc.includes('examination')) {
    tasks.push('QZ');
  }
  if (desc.includes('exam') || desc.includes('final') || desc.includes('midterm')) {
    tasks.push('ME');
  }
  if (desc.includes('project') || desc.includes('capstone') || desc.includes('thesis')) {
    tasks.push('FP');
  }
  if (desc.includes('present') || desc.includes('presentation') || desc.includes('demo')) {
    tasks.push('P');
  }
  if (desc.includes('lab') || desc.includes('laboratory') || desc.includes('practical')) {
    tasks.push('LA');
  }
  if (desc.includes('question') || desc.includes('problem') || desc.includes('solve')) {
    tasks.push('Q');
  }
  
  // Default tasks if none matched
  if (tasks.length === 0) {
    tasks.push('QZ', 'ME');
  }
  
  return tasks;
}

// GET /api/ilos/term/:termId - Get all ILOs for a specific term (only ILOs aligned with SO, SDG, IGA, CDIO)
router.get('/term/:termId', async (req, res) => {
  const { termId } = req.params;
  
  try {
    // Get ILOs that exist in syllabi for this term AND are aligned with at least one mapping
    // (SO, SDG, IGA, or CDIO). Only return ILOs that have at least one mapping.
    const query = `
      SELECT DISTINCT
        i.ilo_id,
        i.code as ilo_code,
        i.description,
        COUNT(DISTINCT aiw.assessment_id) as assessment_count,
        SUM(aiw.weight_percentage) as total_weight,
        -- Get SO codes that this ILO is aligned with
        ARRAY_AGG(DISTINCT so.so_code ORDER BY so.so_code) FILTER (WHERE so.so_code IS NOT NULL) as aligned_so_codes,
        ARRAY_AGG(DISTINCT so.so_id ORDER BY so.so_id) FILTER (WHERE so.so_id IS NOT NULL) as aligned_so_ids,
        -- Get SDG codes that this ILO is aligned with
        ARRAY_AGG(DISTINCT sdg.sdg_code ORDER BY sdg.sdg_code) FILTER (WHERE sdg.sdg_code IS NOT NULL) as aligned_sdg_codes,
        ARRAY_AGG(DISTINCT sdg.sdg_id ORDER BY sdg.sdg_id) FILTER (WHERE sdg.sdg_id IS NOT NULL) as aligned_sdg_ids,
        -- Get IGA codes that this ILO is aligned with
        ARRAY_AGG(DISTINCT iga.iga_code ORDER BY iga.iga_code) FILTER (WHERE iga.iga_code IS NOT NULL) as aligned_iga_codes,
        ARRAY_AGG(DISTINCT iga.iga_id ORDER BY iga.iga_id) FILTER (WHERE iga.iga_id IS NOT NULL) as aligned_iga_ids,
        -- Get CDIO codes that this ILO is aligned with
        ARRAY_AGG(DISTINCT cdio.cdio_code ORDER BY cdio.cdio_code) FILTER (WHERE cdio.cdio_code IS NOT NULL) as aligned_cdio_codes,
        ARRAY_AGG(DISTINCT cdio.cdio_id ORDER BY cdio.cdio_id) FILTER (WHERE cdio.cdio_id IS NOT NULL) as aligned_cdio_ids
      FROM ilos i
      INNER JOIN syllabi sy ON i.syllabus_id = sy.syllabus_id
      INNER JOIN section_courses sc ON sy.section_course_id = sc.section_course_id
      -- Include all mapping types (SO, SDG, IGA, CDIO)
      LEFT JOIN ilo_so_mappings ism ON i.ilo_id = ism.ilo_id
      LEFT JOIN student_outcomes so ON ism.so_id = so.so_id
      LEFT JOIN ilo_sdg_mappings isdg ON i.ilo_id = isdg.ilo_id
      LEFT JOIN sdg_skills sdg ON isdg.sdg_id = sdg.sdg_id
      LEFT JOIN ilo_iga_mappings iiga ON i.ilo_id = iiga.ilo_id
      LEFT JOIN institutional_graduate_attributes iga ON iiga.iga_id = iga.iga_id
      LEFT JOIN ilo_cdio_mappings icdio ON i.ilo_id = icdio.ilo_id
      LEFT JOIN cdio_skills cdio ON icdio.cdio_id = cdio.cdio_id
      LEFT JOIN assessment_ilo_weights aiw ON i.ilo_id = aiw.ilo_id
      LEFT JOIN assessments a ON aiw.assessment_id = a.assessment_id
      LEFT JOIN section_courses sc2 ON a.section_course_id = sc2.section_course_id
      WHERE sc.term_id = $1
        AND (sc2.term_id = $1 OR sc2.term_id IS NULL)
        AND i.is_active = TRUE
        -- Ensure ILO has at least one mapping (SO, SDG, IGA, or CDIO)
        AND (
          ism.ilo_id IS NOT NULL OR 
          isdg.ilo_id IS NOT NULL OR 
          iiga.ilo_id IS NOT NULL OR 
          icdio.ilo_id IS NOT NULL
        )
      GROUP BY i.ilo_id, i.code, i.description
      ORDER BY i.code
    `;
    
    const result = await db.query(query, [termId]);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching ILOs for term:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

export default router;

