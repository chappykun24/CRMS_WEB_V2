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
    res.status(201).json({ 
      syllabus_id: result.rows[0].syllabus_id,
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
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Syllabus not found' });
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

// PUT /api/syllabi/:id/submit-review - Submit syllabus for review
router.put('/:id/submit-review', async (req, res) => {
  const { id } = req.params;
  
  try {
    const query = `
      UPDATE syllabi SET
        review_status = 'pending',
        updated_at = CURRENT_TIMESTAMP
      WHERE syllabus_id = $1
      RETURNING syllabus_id, title, review_status
    `;
    
    const result = await db.query(query, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Syllabus not found' });
    }
    
    res.json({ 
      message: 'Syllabus submitted for review successfully',
      syllabus: result.rows[0]
    });
  } catch (error) {
    console.error('Error submitting syllabus for review:', error);
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

export default router;

