import express from 'express';
import db from '../config/database.js';

const router = express.Router();

// GET /api/standards/term/:termId - Get all standards (SO, IGA, CDIO, SDG) for a specific term
// Returns standards that have ILOs mapped to them in that term
router.get('/term/:termId', async (req, res) => {
  const { termId } = req.params;
  
  try {
    // Get SOs that have ILOs mapped in this term
    const soQuery = `
      SELECT DISTINCT
        so.so_id,
        'SO' as standard_type,
        so.so_code as code,
        so.description,
        COUNT(DISTINCT i.ilo_id) as ilo_count,
        COUNT(DISTINCT aiw.assessment_id) as assessment_count
      FROM student_outcomes so
      INNER JOIN ilo_so_mappings ism ON so.so_id = ism.so_id
      INNER JOIN ilos i ON ism.ilo_id = i.ilo_id
      INNER JOIN syllabi sy ON i.syllabus_id = sy.syllabus_id
      INNER JOIN section_courses sc ON sy.section_course_id = sc.section_course_id
      LEFT JOIN assessment_ilo_weights aiw ON i.ilo_id = aiw.ilo_id
      LEFT JOIN assessments a ON aiw.assessment_id = a.assessment_id
      LEFT JOIN section_courses sc2 ON a.section_course_id = sc2.section_course_id
      WHERE sc.term_id = $1
        AND (sc2.term_id = $1 OR sc2.term_id IS NULL)
        AND so.is_active = TRUE
        AND i.is_active = TRUE
      GROUP BY so.so_id, so.so_code, so.description
      ORDER BY so.so_code
    `;
    
    // Get IGAs that have ILOs mapped in this term
    const igaQuery = `
      SELECT DISTINCT
        iga.iga_id,
        'IGA' as standard_type,
        iga.iga_code as code,
        iga.description,
        COUNT(DISTINCT i.ilo_id) as ilo_count,
        COUNT(DISTINCT aiw.assessment_id) as assessment_count
      FROM institutional_graduate_attributes iga
      INNER JOIN ilo_iga_mappings iiga ON iga.iga_id = iiga.iga_id
      INNER JOIN ilos i ON iiga.ilo_id = i.ilo_id
      INNER JOIN syllabi sy ON i.syllabus_id = sy.syllabus_id
      INNER JOIN section_courses sc ON sy.section_course_id = sc.section_course_id
      LEFT JOIN assessment_ilo_weights aiw ON i.ilo_id = aiw.ilo_id
      LEFT JOIN assessments a ON aiw.assessment_id = a.assessment_id
      LEFT JOIN section_courses sc2 ON a.section_course_id = sc2.section_course_id
      WHERE sc.term_id = $1
        AND (sc2.term_id = $1 OR sc2.term_id IS NULL)
        AND iga.is_active = TRUE
        AND i.is_active = TRUE
      GROUP BY iga.iga_id, iga.iga_code, iga.description
      ORDER BY iga.iga_code
    `;
    
    // Get CDIOs that have ILOs mapped in this term
    const cdioQuery = `
      SELECT DISTINCT
        cdio.cdio_id,
        'CDIO' as standard_type,
        cdio.cdio_code as code,
        cdio.description,
        COUNT(DISTINCT i.ilo_id) as ilo_count,
        COUNT(DISTINCT aiw.assessment_id) as assessment_count
      FROM cdio_skills cdio
      INNER JOIN ilo_cdio_mappings icdio ON cdio.cdio_id = icdio.cdio_id
      INNER JOIN ilos i ON icdio.ilo_id = i.ilo_id
      INNER JOIN syllabi sy ON i.syllabus_id = sy.syllabus_id
      INNER JOIN section_courses sc ON sy.section_course_id = sc.section_course_id
      LEFT JOIN assessment_ilo_weights aiw ON i.ilo_id = aiw.ilo_id
      LEFT JOIN assessments a ON aiw.assessment_id = a.assessment_id
      LEFT JOIN section_courses sc2 ON a.section_course_id = sc2.section_course_id
      WHERE sc.term_id = $1
        AND (sc2.term_id = $1 OR sc2.term_id IS NULL)
        AND cdio.is_active = TRUE
        AND i.is_active = TRUE
      GROUP BY cdio.cdio_id, cdio.cdio_code, cdio.description
      ORDER BY cdio.cdio_code
    `;
    
    // Get SDGs that have ILOs mapped in this term
    const sdgQuery = `
      SELECT DISTINCT
        sdg.sdg_id,
        'SDG' as standard_type,
        sdg.sdg_code as code,
        sdg.description,
        COUNT(DISTINCT i.ilo_id) as ilo_count,
        COUNT(DISTINCT aiw.assessment_id) as assessment_count
      FROM sdg_skills sdg
      INNER JOIN ilo_sdg_mappings isdg ON sdg.sdg_id = isdg.sdg_id
      INNER JOIN ilos i ON isdg.ilo_id = i.ilo_id
      INNER JOIN syllabi sy ON i.syllabus_id = sy.syllabus_id
      INNER JOIN section_courses sc ON sy.section_course_id = sc.section_course_id
      LEFT JOIN assessment_ilo_weights aiw ON i.ilo_id = aiw.ilo_id
      LEFT JOIN assessments a ON aiw.assessment_id = a.assessment_id
      LEFT JOIN section_courses sc2 ON a.section_course_id = sc2.section_course_id
      WHERE sc.term_id = $1
        AND (sc2.term_id = $1 OR sc2.term_id IS NULL)
        AND sdg.is_active = TRUE
        AND i.is_active = TRUE
      GROUP BY sdg.sdg_id, sdg.sdg_code, sdg.description
      ORDER BY sdg.sdg_code
    `;
    
    const [soResult, igaResult, cdioResult, sdgResult] = await Promise.all([
      db.query(soQuery, [termId]),
      db.query(igaQuery, [termId]),
      db.query(cdioQuery, [termId]),
      db.query(sdgQuery, [termId])
    ]);
    
    const standards = {
      so: soResult.rows,
      iga: igaResult.rows,
      cdio: cdioResult.rows,
      sdg: sdgResult.rows
    };
    
    res.json(standards);
  } catch (error) {
    console.error('Error fetching standards for term:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

export default router;

