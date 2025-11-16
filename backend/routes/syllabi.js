import express from 'express';
import db from '../config/database.js';

const router = express.Router();

// GET /api/syllabi/faculty/:facultyId - Get all syllabi for a faculty member
router.get('/faculty/:facultyId', async (req, res) => {
  const { facultyId } = req.params;
  
  try {
    const query = `
      SELECT 
        s.syllabus_id,
        s.course_id,
        s.term_id,
        s.title,
        s.description,
        s.assessment_framework,
        s.grading_policy,
        s.course_outline,
        s.learning_resources,
        s.prerequisites,
        s.course_objectives,
        s.version,
        s.is_template,
        s.template_name,
        s.section_course_id,
        s.review_status,
        s.approval_status,
        s.created_at,
        s.updated_at,
        sc.section_id,
        sec.section_code,
        c.title as course_title,
        c.course_code,
        st.school_year,
        st.semester,
        u.name as instructor_name
      FROM syllabi s
      LEFT JOIN section_courses sc ON s.section_course_id = sc.section_course_id
      LEFT JOIN sections sec ON sc.section_id = sec.section_id
      LEFT JOIN courses c ON s.course_id = c.course_id
      LEFT JOIN school_terms st ON s.term_id = st.term_id
      LEFT JOIN users u ON s.created_by = u.user_id
      WHERE s.created_by = $1
      ORDER BY s.created_at DESC
    `;
    
    const result = await db.query(query, [facultyId]);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching syllabi:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// GET /api/syllabi/class/:sectionCourseId - Get all syllabi for a specific class
router.get('/class/:sectionCourseId', async (req, res) => {
  const { sectionCourseId } = req.params;
  
  try {
    const query = `
      SELECT 
        s.syllabus_id,
        s.course_id,
        s.term_id,
        s.title,
        s.description,
        s.assessment_framework,
        s.grading_policy,
        s.course_outline,
        s.learning_resources,
        s.prerequisites,
        s.course_objectives,
        s.version,
        s.is_template,
        s.template_name,
        s.section_course_id,
        s.review_status,
        s.approval_status,
        s.created_at,
        s.updated_at,
        c.title as course_title,
        c.course_code,
        st.school_year,
        st.semester
      FROM syllabi s
      LEFT JOIN courses c ON s.course_id = c.course_id
      LEFT JOIN school_terms st ON s.term_id = st.term_id
      WHERE s.section_course_id = $1
      ORDER BY s.created_at DESC
    `;
    
    const result = await db.query(query, [sectionCourseId]);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching class syllabi:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// GET /api/syllabi - Get all syllabi (for program chairs and deans)
router.get('/', async (req, res) => {
  try {
    const query = `
      SELECT 
        s.syllabus_id,
        s.course_id,
        s.term_id,
        s.title,
        s.description,
        s.assessment_framework,
        s.grading_policy,
        s.course_outline,
        s.learning_resources,
        s.prerequisites,
        s.course_objectives,
        s.version,
        s.is_template,
        s.template_name,
        s.section_course_id,
        s.review_status,
        s.approval_status,
        s.reviewed_by,
        s.reviewed_at,
        s.approved_by,
        s.approved_at,
        s.created_at,
        s.updated_at,
        c.title as course_title,
        c.course_code,
        st.school_year,
        st.semester,
        u.name as instructor_name
      FROM syllabi s
      LEFT JOIN courses c ON s.course_id = c.course_id
      LEFT JOIN school_terms st ON s.term_id = st.term_id
      LEFT JOIN users u ON s.created_by = u.user_id
      ORDER BY s.created_at DESC
    `;
    
    const result = await db.query(query);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching all syllabi:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// GET /api/syllabi/:id - Get a specific syllabus with details
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  
  try {
    const query = `
      SELECT 
        s.*,
        sc.section_id,
        sec.section_code,
        c.title as course_title,
        c.course_code,
        st.school_year,
        st.semester,
        u.name as instructor_name
      FROM syllabi s
      LEFT JOIN section_courses sc ON s.section_course_id = sc.section_course_id
      LEFT JOIN sections sec ON sc.section_id = sec.section_id
      LEFT JOIN courses c ON s.course_id = c.course_id
      LEFT JOIN school_terms st ON s.term_id = st.term_id
      LEFT JOIN users u ON s.created_by = u.user_id
      WHERE s.syllabus_id = $1
    `;
    
    const result = await db.query(query, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Syllabus not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching syllabus:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// POST /api/syllabi - Create a new syllabus
router.post('/', async (req, res) => {
  const {
    course_id,
    term_id,
    title,
    description,
    assessment_framework,
    grading_policy,
    course_outline,
    learning_resources,
    prerequisites,
    course_objectives,
    version,
    is_template,
    template_name,
    section_course_id,
    created_by
  } = req.body;
  
  try {
    // Helper function to properly handle JSON fields
    const prepareJSONField = (field) => {
      if (!field) return null;
      if (typeof field === 'string') {
        // Try to parse if it's a JSON string
        try {
          return JSON.parse(field);
        } catch (e) {
          // If not valid JSON, return as string for JSONB to handle
          return field;
        }
      }
      // If already an object or array, return as is (pg will handle conversion)
      return field;
    };

    // Handle learning_resources - convert array to PostgreSQL array format
    const prepareLearningResources = (resources) => {
      if (!resources) return null;
      if (Array.isArray(resources)) return resources;
      if (typeof resources === 'string') {
        // Try to parse JSON array
        try {
          const parsed = JSON.parse(resources);
          return Array.isArray(parsed) ? parsed : resources.split(',').map(r => r.trim()).filter(r => r);
        } catch (e) {
          // If not JSON, treat as comma-separated string
          return resources.split(',').map(r => r.trim()).filter(r => r);
        }
      }
      return null;
    };

    const query = `
      INSERT INTO syllabi (
        course_id, term_id, title, description, assessment_framework,
        grading_policy, course_outline, learning_resources, prerequisites,
        course_objectives, version, is_template, template_name,
        section_course_id, created_by, review_status, approval_status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, 'pending', 'pending')
      RETURNING syllabus_id, title, version, review_status, approval_status, created_at
    `;
    
    const values = [
      course_id, 
      term_id, 
      title, 
      description,
      prepareJSONField(assessment_framework),
      prepareJSONField(grading_policy),
      course_outline,
      prepareLearningResources(learning_resources),
      prerequisites,
      course_objectives,
      version || '1.0',
      is_template || false,
      template_name || null,
      section_course_id,
      created_by
    ];
    
    const result = await db.query(query, values);
    const syllabusId = result.rows[0].syllabus_id;
    
    // Create ILOs if provided
    if (req.body.ilos && Array.isArray(req.body.ilos) && req.body.ilos.length > 0) {
      try {
        for (const ilo of req.body.ilos) {
          // Skip temporary ILOs (those with temp IDs)
          if (ilo.ilo_id && ilo.ilo_id.toString().startsWith('temp_')) {
            delete ilo.ilo_id;
          }
          
          const iloQuery = `
            INSERT INTO ilos (syllabus_id, code, description, category, level, weight_percentage, assessment_methods, learning_activities)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING ilo_id
          `;
          
          const iloValues = [
            syllabusId,
            ilo.code,
            ilo.description,
            ilo.category || null,
            ilo.level || null,
            ilo.weight_percentage || null,
            Array.isArray(ilo.assessment_methods) ? ilo.assessment_methods : [],
            Array.isArray(ilo.learning_activities) ? ilo.learning_activities : []
          ];
          
          const iloResult = await db.query(iloQuery, iloValues);
          const newIloId = iloResult.rows[0].ilo_id;
          
          // Create mappings if provided
          const createMappings = async (mappings, tableName, idColumn) => {
            if (mappings && Array.isArray(mappings) && mappings.length > 0) {
              for (const mapping of mappings) {
                const mappingQuery = `
                  INSERT INTO ${tableName} (ilo_id, ${idColumn}, assessment_tasks)
                  VALUES ($1, $2, $3)
                  ON CONFLICT (ilo_id, ${idColumn}) DO UPDATE
                  SET assessment_tasks = $3, updated_at = CURRENT_TIMESTAMP
                `;
                await db.query(mappingQuery, [
                  newIloId,
                  mapping[idColumn],
                  Array.isArray(mapping.assessment_tasks) ? mapping.assessment_tasks : []
                ]);
              }
            }
          };
          
          if (ilo.so_mappings) await createMappings(ilo.so_mappings, 'ilo_so_mappings', 'so_id');
          if (ilo.iga_mappings) await createMappings(ilo.iga_mappings, 'ilo_iga_mappings', 'iga_id');
          if (ilo.cdio_mappings) await createMappings(ilo.cdio_mappings, 'ilo_cdio_mappings', 'cdio_id');
          if (ilo.sdg_mappings) await createMappings(ilo.sdg_mappings, 'ilo_sdg_mappings', 'sdg_id');
        }
      } catch (iloError) {
        console.error('Error creating ILOs:', iloError);
        // Continue even if ILO creation fails - syllabus is already created
      }
    }
    
    res.status(201).json({ 
      syllabus_id: syllabusId,
      message: 'Syllabus created successfully',
      syllabus: result.rows[0]
    });
  } catch (error) {
    console.error('Error creating syllabus:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// PUT /api/syllabi/:id - Update a syllabus
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const {
    title,
    description,
    assessment_framework,
    grading_policy,
    course_outline,
    learning_resources,
    prerequisites,
    course_objectives,
    version
  } = req.body;
  
  try {
    // Helper function to properly handle JSON fields
    const prepareJSONField = (field) => {
      if (!field) return null;
      if (typeof field === 'string') {
        // Try to parse if it's a JSON string
        try {
          return JSON.parse(field);
        } catch (e) {
          // If not valid JSON, return as string for JSONB to handle
          return field;
        }
      }
      // If already an object or array, return as is (pg will handle conversion)
      return field;
    };

    // Handle learning_resources - convert array to PostgreSQL array format
    const prepareLearningResources = (resources) => {
      if (!resources) return null;
      if (Array.isArray(resources)) return resources;
      if (typeof resources === 'string') {
        // Try to parse JSON array
        try {
          const parsed = JSON.parse(resources);
          return Array.isArray(parsed) ? parsed : resources.split(',').map(r => r.trim()).filter(r => r);
        } catch (e) {
          // If not JSON, treat as comma-separated string
          return resources.split(',').map(r => r.trim()).filter(r => r);
        }
      }
      return null;
    };

    const query = `
      UPDATE syllabi SET
        title = $1,
        description = $2,
        assessment_framework = $3,
        grading_policy = $4,
        course_outline = $5,
        learning_resources = $6,
        prerequisites = $7,
        course_objectives = $8,
        version = $9,
        updated_at = CURRENT_TIMESTAMP
      WHERE syllabus_id = $10
      RETURNING syllabus_id, title, version, updated_at
    `;
    
    const values = [
      title,
      description,
      prepareJSONField(assessment_framework),
      prepareJSONField(grading_policy),
      course_outline,
      prepareLearningResources(learning_resources),
      prerequisites,
      course_objectives,
      version,
      id
    ];
    
    const result = await db.query(query, values);
    const syllabusId = parseInt(id);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Syllabus not found' });
    }
    
    // Update ILOs if provided
    if (req.body.ilos && Array.isArray(req.body.ilos)) {
      try {
        // Get existing ILOs for this syllabus
        const existingIlosResult = await db.query(
          'SELECT ilo_id FROM ilos WHERE syllabus_id = $1',
          [syllabusId]
        );
        const existingIloIds = existingIlosResult.rows.map(row => row.ilo_id);
        const newIloIds = [];
        
        // Process each ILO
        for (const ilo of req.body.ilos) {
          if (ilo.ilo_id && !ilo.ilo_id.toString().startsWith('temp_') && existingIloIds.includes(parseInt(ilo.ilo_id))) {
            // Update existing ILO
            const updateIloQuery = `
              UPDATE ilos 
              SET code = $1, description = $2, category = $3, level = $4, 
                  weight_percentage = $5, assessment_methods = $6, learning_activities = $7,
                  updated_at = CURRENT_TIMESTAMP
              WHERE ilo_id = $8 AND syllabus_id = $9
              RETURNING ilo_id
            `;
            const updateResult = await db.query(updateIloQuery, [
              ilo.code,
              ilo.description,
              ilo.category || null,
              ilo.level || null,
              ilo.weight_percentage || null,
              Array.isArray(ilo.assessment_methods) ? ilo.assessment_methods : [],
              Array.isArray(ilo.learning_activities) ? ilo.learning_activities : [],
              ilo.ilo_id,
              syllabusId
            ]);
            if (updateResult.rows.length > 0) {
              newIloIds.push(updateResult.rows[0].ilo_id);
            }
            
            // Update mappings - delete old and insert new
            const updateMappings = async (mappings, tableName, idColumn) => {
              await db.query(`DELETE FROM ${tableName} WHERE ilo_id = $1`, [ilo.ilo_id]);
              if (mappings && Array.isArray(mappings) && mappings.length > 0) {
                for (const mapping of mappings) {
                  await db.query(
                    `INSERT INTO ${tableName} (ilo_id, ${idColumn}, assessment_tasks) VALUES ($1, $2, $3)`,
                    [
                      ilo.ilo_id,
                      mapping[idColumn],
                      Array.isArray(mapping.assessment_tasks) ? mapping.assessment_tasks : []
                    ]
                  );
                }
              }
            };
            
            if (ilo.so_mappings) await updateMappings(ilo.so_mappings, 'ilo_so_mappings', 'so_id');
            if (ilo.iga_mappings) await updateMappings(ilo.iga_mappings, 'ilo_iga_mappings', 'iga_id');
            if (ilo.cdio_mappings) await updateMappings(ilo.cdio_mappings, 'ilo_cdio_mappings', 'cdio_id');
            if (ilo.sdg_mappings) await updateMappings(ilo.sdg_mappings, 'ilo_sdg_mappings', 'sdg_id');
          } else {
            // Create new ILO
            const createIloQuery = `
              INSERT INTO ilos (syllabus_id, code, description, category, level, weight_percentage, assessment_methods, learning_activities)
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
              RETURNING ilo_id
            `;
            const createResult = await db.query(createIloQuery, [
              syllabusId,
              ilo.code,
              ilo.description,
              ilo.category || null,
              ilo.level || null,
              ilo.weight_percentage || null,
              Array.isArray(ilo.assessment_methods) ? ilo.assessment_methods : [],
              Array.isArray(ilo.learning_activities) ? ilo.learning_activities : []
            ]);
            const newIloId = createResult.rows[0].ilo_id;
            newIloIds.push(newIloId);
            
            // Create mappings
            const createMappings = async (mappings, tableName, idColumn) => {
              if (mappings && Array.isArray(mappings) && mappings.length > 0) {
                for (const mapping of mappings) {
                  await db.query(
                    `INSERT INTO ${tableName} (ilo_id, ${idColumn}, assessment_tasks) VALUES ($1, $2, $3)`,
                    [
                      newIloId,
                      mapping[idColumn],
                      Array.isArray(mapping.assessment_tasks) ? mapping.assessment_tasks : []
                    ]
                  );
                }
              }
            };
            
            if (ilo.so_mappings) await createMappings(ilo.so_mappings, 'ilo_so_mappings', 'so_id');
            if (ilo.iga_mappings) await createMappings(ilo.iga_mappings, 'ilo_iga_mappings', 'iga_id');
            if (ilo.cdio_mappings) await createMappings(ilo.cdio_mappings, 'ilo_cdio_mappings', 'cdio_id');
            if (ilo.sdg_mappings) await createMappings(ilo.sdg_mappings, 'ilo_sdg_mappings', 'sdg_id');
          }
        }
        
        // Delete ILOs that are no longer in the list
        const ilosToDelete = existingIloIds.filter(id => !newIloIds.includes(id));
        if (ilosToDelete.length > 0) {
          await db.query('DELETE FROM ilos WHERE ilo_id = ANY($1::int[])', [ilosToDelete]);
        }
      } catch (iloError) {
        console.error('Error updating ILOs:', iloError);
        // Continue even if ILO update fails
      }
    }
    
    res.json({ 
      message: 'Syllabus updated successfully',
      syllabus: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating syllabus:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// PUT /api/syllabi/:id/submit-review - Submit syllabus for review (Faculty)
router.put('/:id/submit-review', async (req, res) => {
  const { id } = req.params;
  const { created_by } = req.body; // User ID of the faculty member
  
  try {
    // Verify the syllabus belongs to the user
    const checkQuery = 'SELECT syllabus_id, created_by, review_status FROM syllabi WHERE syllabus_id = $1';
    const checkResult = await db.query(checkQuery, [id]);
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Syllabus not found' });
    }
    
    const syllabus = checkResult.rows[0];
    
    // Only allow submission if it's in draft/pending state and belongs to the user
    if (syllabus.created_by !== created_by) {
      return res.status(403).json({ error: 'You can only submit your own syllabi for review' });
    }
    
    if (syllabus.review_status === 'approved' || syllabus.approval_status === 'approved') {
      return res.status(400).json({ error: 'Syllabus is already approved' });
    }
    
    const query = `
      UPDATE syllabi SET
        review_status = 'pending',
        updated_at = CURRENT_TIMESTAMP
      WHERE syllabus_id = $1
      RETURNING syllabus_id, title, review_status, approval_status
    `;
    
    const result = await db.query(query, [id]);
    
    res.json({ 
      message: 'Syllabus submitted for review successfully',
      syllabus: result.rows[0]
    });
  } catch (error) {
    console.error('Error submitting syllabus for review:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// PUT /api/syllabi/:id/review - Review syllabus (Program Chair)
router.put('/:id/review', async (req, res) => {
  const { id } = req.params;
  const { reviewed_by, review_status, review_comment } = req.body; // review_status: 'approved', 'rejected', 'needs_revision'
  
  try {
    if (!['approved', 'rejected', 'needs_revision'].includes(review_status)) {
      return res.status(400).json({ error: 'Invalid review status' });
    }
    
    const query = `
      UPDATE syllabi SET
        review_status = $1,
        reviewed_by = $2,
        reviewed_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE syllabus_id = $3
      RETURNING syllabus_id, title, review_status, reviewed_by, reviewed_at
    `;
    
    const result = await db.query(query, [review_status, reviewed_by, id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Syllabus not found' });
    }
    
    // If approved by program chair, set approval_status to pending for dean
    if (review_status === 'approved') {
      await db.query(
        'UPDATE syllabi SET approval_status = $1 WHERE syllabus_id = $2',
        ['pending', id]
      );
    }
    
    res.json({ 
      message: `Syllabus ${review_status} by program chair`,
      syllabus: result.rows[0]
    });
  } catch (error) {
    console.error('Error reviewing syllabus:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// PUT /api/syllabi/:id/approve - Approve syllabus (Dean)
router.put('/:id/approve', async (req, res) => {
  const { id } = req.params;
  const { approved_by, approval_status } = req.body; // approval_status: 'approved', 'rejected'
  
  try {
    if (!['approved', 'rejected'].includes(approval_status)) {
      return res.status(400).json({ error: 'Invalid approval status' });
    }
    
    // Check if syllabus has been reviewed and approved by program chair
    const checkQuery = 'SELECT review_status, approval_status FROM syllabi WHERE syllabus_id = $1';
    const checkResult = await db.query(checkQuery, [id]);
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Syllabus not found' });
    }
    
    const syllabus = checkResult.rows[0];
    
    if (syllabus.review_status !== 'approved') {
      return res.status(400).json({ error: 'Syllabus must be approved by program chair before dean approval' });
    }
    
    const query = `
      UPDATE syllabi SET
        approval_status = $1,
        approved_by = $2,
        approved_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE syllabus_id = $3
      RETURNING syllabus_id, title, approval_status, approved_by, approved_at
    `;
    
    const result = await db.query(query, [approval_status, approved_by, id]);
    
    res.json({ 
      message: `Syllabus ${approval_status} by dean`,
      syllabus: result.rows[0]
    });
  } catch (error) {
    console.error('Error approving syllabus:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// DELETE /api/syllabi/:id - Delete a syllabus
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  
  try {
    // First check if syllabus exists
    const checkQuery = 'SELECT syllabus_id, title FROM syllabi WHERE syllabus_id = $1';
    const checkResult = await db.query(checkQuery, [id]);
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Syllabus not found' });
    }
    
    // Delete the syllabus (cascade will handle related records)
    const deleteQuery = 'DELETE FROM syllabi WHERE syllabus_id = $1 RETURNING title';
    const result = await db.query(deleteQuery, [id]);
    
    res.json({ 
      message: 'Syllabus deleted successfully',
      deleted_syllabus: result.rows[0].title
    });
  } catch (error) {
    console.error('Error deleting syllabus:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// POST /api/syllabi/:id/edit-request - Create an edit request for an approved syllabus
router.post('/:id/edit-request', async (req, res) => {
  const { id } = req.params;
  const { reason, requested_by } = req.body;

  if (!reason || !requested_by) {
    return res.status(400).json({ error: 'reason and requested_by are required' });
  }

  try {
    // Check if syllabus exists and is approved
    const syllabusCheck = await db.query(
      'SELECT syllabus_id, approval_status, review_status FROM syllabi WHERE syllabus_id = $1',
      [id]
    );

    if (syllabusCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Syllabus not found' });
    }

    const syllabus = syllabusCheck.rows[0];
    if (syllabus.approval_status !== 'approved' || syllabus.review_status !== 'approved') {
      return res.status(400).json({ error: 'Only approved syllabuses can have edit requests' });
    }

    // Check if there's already a pending edit request
    const existingRequest = await db.query(
      'SELECT edit_request_id FROM syllabus_edit_requests WHERE syllabus_id = $1 AND status = $2',
      [id, 'pending']
    );

    if (existingRequest.rows.length > 0) {
      return res.status(400).json({ error: 'There is already a pending edit request for this syllabus' });
    }

    // Create edit request
    const result = await db.query(
      `INSERT INTO syllabus_edit_requests 
       (syllabus_id, requested_by, reason, status, created_at, updated_at)
       VALUES ($1, $2, $3, 'pending', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING edit_request_id, syllabus_id, requested_by, reason, status, created_at`,
      [id, requested_by, reason]
    );

    res.status(201).json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error creating edit request:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// POST /api/syllabi/:id/publish - Publish a syllabus and create assessments from sub-assessments
router.post('/:id/publish', async (req, res) => {
  const { id } = req.params;
  const { published_by } = req.body;

  try {
    // Check if syllabus exists and is approved
    const syllabusCheck = await db.query(
      `SELECT 
        syllabus_id, 
        approval_status, 
        review_status, 
        section_course_id,
        grading_policy,
        created_by
      FROM syllabi 
      WHERE syllabus_id = $1`,
      [id]
    );

    if (syllabusCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Syllabus not found' });
    }

    const syllabus = syllabusCheck.rows[0];
    
    if (syllabus.approval_status !== 'approved' || syllabus.review_status !== 'approved') {
      return res.status(400).json({ error: 'Only approved syllabuses can be published' });
    }

    if (!syllabus.section_course_id) {
      return res.status(400).json({ error: 'Syllabus must be linked to a section course to be published' });
    }

    // Parse grading_policy to get sub_assessments
    let gradingPolicy = syllabus.grading_policy;
    if (typeof gradingPolicy === 'string') {
      try {
        gradingPolicy = JSON.parse(gradingPolicy);
      } catch (e) {
        gradingPolicy = {};
      }
    }

    const subAssessments = gradingPolicy?.sub_assessments || {};
    
    if (Object.keys(subAssessments).length === 0) {
      return res.status(400).json({ error: 'No sub-assessments found in syllabus to publish' });
    }

    // Check if already published
    const publishedCheck = await db.query(
      `SELECT assessment_id FROM assessments 
       WHERE syllabus_id = $1 AND is_published = TRUE 
       LIMIT 1`,
      [id]
    );

    if (publishedCheck.rows.length > 0) {
      return res.status(400).json({ error: 'Syllabus has already been published' });
    }

    await db.query('BEGIN');

    // Get assessment_criteria to map sub-assessments to criteria
    const assessmentCriteria = gradingPolicy?.assessment_criteria || [];
    
    // Create assessments from sub-assessments
    const createdAssessments = [];
    
    for (const [criterionIndex, subAssessmentsList] of Object.entries(subAssessments)) {
      if (!Array.isArray(subAssessmentsList) || subAssessmentsList.length === 0) continue;
      
      const criterion = assessmentCriteria[parseInt(criterionIndex)];
      const criterionName = criterion?.name || `Assessment ${criterionIndex}`;
      
      for (const subAssessment of subAssessmentsList) {
        const assessmentTitle = subAssessment.name || subAssessment.abbreviation || 'Untitled Assessment';
        const weightPercentage = parseFloat(subAssessment.weight_percentage) || 0;
        const totalPoints = parseFloat(subAssessment.score) || 100;
        
        // Determine assessment type based on criterion or default
        const assessmentType = criterion?.abbreviation?.toLowerCase().includes('quiz') ? 'Quiz' :
                              criterion?.abbreviation?.toLowerCase().includes('exam') ? 'Exam' :
                              criterion?.abbreviation?.toLowerCase().includes('project') ? 'Project' :
                              criterion?.abbreviation?.toLowerCase().includes('lab') ? 'Lab' :
                              'Assignment';
        
        const insertQuery = `
          INSERT INTO assessments (
            syllabus_id,
            section_course_id,
            title,
            description,
            type,
            category,
            total_points,
            weight_percentage,
            is_published,
            is_graded,
            status,
            created_by,
            created_at,
            updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          RETURNING assessment_id, title, type, total_points, weight_percentage
        `;
        
        const result = await db.query(insertQuery, [
          id,
          syllabus.section_course_id,
          assessmentTitle,
          `Sub-assessment from ${criterionName}`,
          assessmentType,
          'Summative',
          totalPoints,
          weightPercentage,
          true, // is_published
          false, // is_graded
          'active', // status
          published_by || syllabus.created_by
        ]);
        
        createdAssessments.push(result.rows[0]);
      }
    }

    // Update grading_policy metadata to mark as published
    const updatedGradingPolicy = {
      ...gradingPolicy,
      metadata: {
        ...(gradingPolicy.metadata || {}),
        published: true,
        published_at: new Date().toISOString(),
        published_by: published_by || syllabus.created_by
      }
    };

    await db.query(
      `UPDATE syllabi 
       SET grading_policy = $1, updated_at = CURRENT_TIMESTAMP
       WHERE syllabus_id = $2`,
      [JSON.stringify(updatedGradingPolicy), id]
    );

    await db.query('COMMIT');

    res.json({
      success: true,
      message: `Syllabus published successfully. Created ${createdAssessments.length} assessment(s).`,
      assessments: createdAssessments,
      syllabus_id: id
    });
  } catch (error) {
    await db.query('ROLLBACK');
    console.error('Error publishing syllabus:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// GET /api/syllabi/edit-requests - Get all edit requests (for dean/program chair)
router.get('/edit-requests', async (req, res) => {
  try {
    const { role, user_id } = req.query; // role: 'dean' or 'program_chair'

    let query = `
      SELECT 
        ser.edit_request_id,
        ser.syllabus_id,
        ser.requested_by,
        ser.reason,
        ser.status,
        ser.dean_approved,
        ser.program_chair_approved,
        ser.dean_approved_by,
        ser.program_chair_approved_by,
        ser.dean_approved_at,
        ser.program_chair_approved_at,
        ser.completed_at,
        ser.created_at,
        ser.updated_at,
        s.title as syllabus_title,
        s.version as syllabus_version,
        s.approval_status,
        s.review_status,
        u.name as requested_by_name,
        u.email as requested_by_email,
        c.course_code,
        c.title as course_title
      FROM syllabus_edit_requests ser
      INNER JOIN syllabi s ON ser.syllabus_id = s.syllabus_id
      INNER JOIN users u ON ser.requested_by = u.user_id
      LEFT JOIN courses c ON s.course_id = c.course_id
    `;

    const conditions = [];
    const params = [];

    // Filter based on role
    if (role === 'dean') {
      conditions.push('ser.dean_approved = FALSE');
    } else if (role === 'program_chair') {
      conditions.push('ser.program_chair_approved = FALSE');
    }

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }

    query += ' ORDER BY ser.created_at DESC';

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching edit requests:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// PUT /api/syllabi/edit-requests/:id/approve - Approve/reject an edit request (dean or program chair)
router.put('/edit-requests/:id/approve', async (req, res) => {
  const { id } = req.params;
  const { approved, approved_by, role } = req.body; // role: 'dean' or 'program_chair'

  if (!approved_by || !role) {
    return res.status(400).json({ error: 'approved_by and role are required' });
  }

  if (role !== 'dean' && role !== 'program_chair') {
    return res.status(400).json({ error: 'role must be either "dean" or "program_chair"' });
  }

  try {
    // Get the edit request
    const requestResult = await db.query(
      'SELECT * FROM syllabus_edit_requests WHERE edit_request_id = $1',
      [id]
    );

    if (requestResult.rows.length === 0) {
      return res.status(404).json({ error: 'Edit request not found' });
    }

    const editRequest = requestResult.rows[0];

    // Update approval status based on role
    const updateField = role === 'dean' ? 'dean_approved' : 'program_chair_approved';
    const approvedByField = role === 'dean' ? 'dean_approved_by' : 'program_chair_approved_by';
    const approvedAtField = role === 'dean' ? 'dean_approved_at' : 'program_chair_approved_at';

    let status = editRequest.status;
    
    if (approved) {
      // Update approval field
      await db.query(
        `UPDATE syllabus_edit_requests 
         SET ${updateField} = TRUE, 
             ${approvedByField} = $1, 
             ${approvedAtField} = CURRENT_TIMESTAMP,
             updated_at = CURRENT_TIMESTAMP
         WHERE edit_request_id = $2`,
        [approved_by, id]
      );

      // Check if both approvals are complete
      const updatedRequest = await db.query(
        'SELECT dean_approved, program_chair_approved FROM syllabus_edit_requests WHERE edit_request_id = $1',
        [id]
      );

      if (updatedRequest.rows[0].dean_approved && updatedRequest.rows[0].program_chair_approved) {
        status = 'approved';
        await db.query(
          'UPDATE syllabus_edit_requests SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE edit_request_id = $2',
          [status, id]
        );
      }
    } else {
      // Reject the request
      status = 'rejected';
      await db.query(
        `UPDATE syllabus_edit_requests 
         SET status = $1, 
             ${updateField} = FALSE,
             updated_at = CURRENT_TIMESTAMP
         WHERE edit_request_id = $2`,
        [status, id]
      );
    }

    res.json({
      success: true,
      message: `Edit request ${approved ? 'approved' : 'rejected'} successfully`
    });
  } catch (error) {
    console.error('Error approving edit request:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

export default router;

