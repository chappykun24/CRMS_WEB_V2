import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import db from '../config/database.js';

const router = express.Router();

// Get attendance for a specific class/section
router.get('/class/:sectionCourseId', authenticateToken, async (req, res) => {
  try {
    const { sectionCourseId } = req.params;
    const { date, startDate, endDate } = req.query;

    let query = `
      SELECT 
        al.attendance_id,
        al.enrollment_id,
        al.session_id,
        al.status,
        al.session_date,
        al.recorded_at,
        al.remarks,
        s.student_id,
        CONCAT(u.first_name, ' ', u.last_name) as full_name,
        s.student_number,
        u.profile_photo,
        ses.session_id,
        ses.title,
        ses.session_type,
        ses.meeting_type
      FROM attendance_logs al
      JOIN course_enrollments ce ON al.enrollment_id = ce.enrollment_id
      JOIN students s ON ce.student_id = s.student_id
      JOIN users u ON s.user_id = u.user_id
      LEFT JOIN sessions ses ON al.session_id = ses.session_id
      WHERE ce.section_course_id = $1
    `;

    const params = [sectionCourseId];

    if (date) {
      query += ` AND al.session_date = $${params.length + 1}`;
      params.push(date);
    } else if (startDate && endDate) {
      query += ` AND al.session_date BETWEEN $${params.length + 1} AND $${params.length + 2}`;
      params.push(startDate, endDate);
    }

    query += ` ORDER BY al.session_date DESC, s.full_name`;

    const result = await db.query(query, params);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching attendance:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get attendance sessions for a class
router.get('/sessions/:sectionCourseId', authenticateToken, async (req, res) => {
  try {
    const { sectionCourseId } = req.params;
    const { startDate, endDate } = req.query;

    let query = `
      SELECT 
        s.session_id,
        s.session_date,
        s.title,
        s.session_type,
        s.meeting_type,
        s.created_at,
        COUNT(al.attendance_id) as attendance_count
      FROM sessions s
      LEFT JOIN attendance_logs al ON s.session_id = al.session_id
      WHERE s.section_course_id = $1
    `;

    const params = [sectionCourseId];

    if (startDate && endDate) {
      query += ` AND s.session_date BETWEEN $${params.length + 1} AND $${params.length + 2}`;
      params.push(startDate, endDate);
    }

    query += ` GROUP BY s.session_id, s.session_date, s.title, s.session_type, s.meeting_type, s.created_at ORDER BY s.session_date DESC`;

    const result = await db.query(query, params);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching sessions:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Create a new attendance session
router.post('/sessions', authenticateToken, async (req, res) => {
  try {
    console.log('🔍 [ATTENDANCE DEBUG] Session creation request received');
    console.log('🔍 [ATTENDANCE DEBUG] Request body:', req.body);
    
    const {
      section_course_id,
      session_date,
      title,
      session_type,
      meeting_type
    } = req.body;

    if (!section_course_id || !session_date || !title) {
      console.log('❌ [ATTENDANCE DEBUG] Missing required fields');
      return res.status(400).json({
        success: false,
        error: 'section_course_id, session_date, and title are required'
      });
    }

    console.log('🔍 [ATTENDANCE DEBUG] Inserting session into database...');
    const result = await db.query(`
      INSERT INTO sessions (
        section_course_id, session_date, title, session_type, meeting_type
      ) VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [
      section_course_id, session_date, title, session_type, meeting_type
    ]);

    console.log('✅ [ATTENDANCE DEBUG] Session created successfully:', result.rows[0]);
    res.status(201).json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('❌ [ATTENDANCE DEBUG] Error creating session:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Mark attendance for a session
router.post('/mark', authenticateToken, async (req, res) => {
  try {
    console.log('🔍 [ATTENDANCE DEBUG] Mark attendance request received');
    console.log('🔍 [ATTENDANCE DEBUG] Request body:', req.body);
    
    const { session_id, attendance_records } = req.body;

    if (!session_id || !attendance_records || !Array.isArray(attendance_records)) {
      console.log('❌ [ATTENDANCE DEBUG] Missing required fields for attendance marking');
      return res.status(400).json({
        success: false,
        error: 'session_id and attendance_records array are required'
      });
    }

    // Get session details
    console.log('🔍 [ATTENDANCE DEBUG] Looking up session:', session_id);
    const sessionResult = await db.query(
      'SELECT session_date FROM sessions WHERE session_id = $1',
      [session_id]
    );

    if (sessionResult.rows.length === 0) {
      console.log('❌ [ATTENDANCE DEBUG] Session not found:', session_id);
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }

    const sessionDate = sessionResult.rows[0].session_date;
    console.log('✅ [ATTENDANCE DEBUG] Session found, date:', sessionDate);

    // Use transaction to ensure data consistency
    console.log('🔍 [ATTENDANCE DEBUG] Starting transaction...');
    const client = await db.getClient();
    await client.query('BEGIN');

    try {
      // Delete existing attendance records for this session
      console.log('🔍 [ATTENDANCE DEBUG] Deleting existing attendance records for session:', session_id);
      await client.query(
        'DELETE FROM attendance_logs WHERE session_id = $1',
        [session_id]
      );

      // Insert new attendance records
      console.log('🔍 [ATTENDANCE DEBUG] Inserting', attendance_records.length, 'attendance records...');
      for (const record of attendance_records) {
        const { enrollment_id, status, remarks } = record;
        console.log('🔍 [ATTENDANCE DEBUG] Inserting record:', { enrollment_id, status, remarks });
        
        // Validate attendance status
        const validStatuses = ['present', 'absent', 'late', 'excuse'];
        if (!validStatuses.includes(status)) {
          console.log('❌ [ATTENDANCE DEBUG] Invalid status:', status);
          throw new Error(`Invalid attendance status: ${status}. Valid statuses are: ${validStatuses.join(', ')}`);
        }
        
        // Validate enrollment_id
        if (!enrollment_id) {
          console.log('❌ [ATTENDANCE DEBUG] Missing enrollment_id');
          throw new Error('enrollment_id is required for attendance record');
        }
        
        await client.query(`
          INSERT INTO attendance_logs (
            enrollment_id, session_id, status, session_date, remarks
          ) VALUES ($1, $2, $3, $4, $5)
        `, [enrollment_id, session_id, status, sessionDate, remarks || null]);
      }

      await client.query('COMMIT');
      console.log('✅ [ATTENDANCE DEBUG] Transaction committed successfully');

      res.json({
        success: true,
        message: 'Attendance marked successfully'
      });
    } catch (error) {
      console.log('❌ [ATTENDANCE DEBUG] Transaction error, rolling back:', error.message);
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('❌ [ATTENDANCE DEBUG] Error marking attendance:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get students enrolled in a section course
router.get('/students/:sectionCourseId', authenticateToken, async (req, res) => {
  try {
    const { sectionCourseId } = req.params;

    const result = await db.query(`
      SELECT 
        ce.enrollment_id,
        s.student_id,
        CONCAT(u.first_name, ' ', u.last_name) as full_name,
        s.student_number,
        u.profile_photo,
        u.email as contact_email,
        ce.enrolled_at as enrollment_date,
        ce.status as enrollment_status
      FROM course_enrollments ce
      JOIN students s ON ce.student_id = s.student_id
      JOIN users u ON s.user_id = u.user_id
      WHERE ce.section_course_id = $1
      ORDER BY u.first_name, u.last_name
    `, [sectionCourseId]);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching students:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get attendance statistics for a class
router.get('/stats/:sectionCourseId', authenticateToken, async (req, res) => {
  try {
    const { sectionCourseId } = req.params;
    const { startDate, endDate } = req.query;

    let dateFilter = '';
    const params = [sectionCourseId];

    if (startDate && endDate) {
      dateFilter = `AND al.session_date BETWEEN $2 AND $3`;
      params.push(startDate, endDate);
    }

    const result = await db.query(`
      SELECT 
        s.student_id,
        CONCAT(u.first_name, ' ', u.last_name) as full_name,
        s.student_number,
        COUNT(al.attendance_id) as total_sessions,
        COUNT(CASE WHEN al.status = 'present' THEN 1 END) as present_count,
        COUNT(CASE WHEN al.status = 'absent' THEN 1 END) as absent_count,
        COUNT(CASE WHEN al.status = 'late' THEN 1 END) as late_count,
        COUNT(CASE WHEN al.status = 'excused' THEN 1 END) as excused_count,
        ROUND(
          (COUNT(CASE WHEN al.status = 'present' THEN 1 END)::FLOAT / 
           NULLIF(COUNT(al.attendance_id), 0)) * 100, 2
        ) as attendance_percentage
      FROM students s
      JOIN users u ON s.user_id = u.user_id
      JOIN course_enrollments ce ON s.student_id = ce.student_id
      LEFT JOIN attendance_logs al ON ce.enrollment_id = al.enrollment_id ${dateFilter}
      WHERE ce.section_course_id = $1
      GROUP BY s.student_id, u.first_name, u.last_name, s.student_number
      ORDER BY u.first_name, u.last_name
    `, params);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching attendance stats:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Update attendance record
router.put('/:attendanceId', authenticateToken, async (req, res) => {
  try {
    const { attendanceId } = req.params;
    const { status, remarks } = req.body;

    const result = await db.query(`
      UPDATE attendance_logs 
      SET status = $1, remarks = $2, updated_at = CURRENT_TIMESTAMP
      WHERE attendance_id = $3
      RETURNING *
    `, [status, remarks, attendanceId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Attendance record not found'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating attendance:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Delete attendance session
router.delete('/sessions/:sessionId', authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params;

    // Delete attendance logs first (due to foreign key constraint)
    await db.query('DELETE FROM attendance_logs WHERE session_id = $1', [sessionId]);
    
    // Delete the session
    const result = await db.query('DELETE FROM sessions WHERE session_id = $1', [sessionId]);

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }

    res.json({
      success: true,
      message: 'Session and attendance records deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting session:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Export attendance data
router.get('/export/:sectionCourseId', authenticateToken, async (req, res) => {
  try {
    const { sectionCourseId } = req.params;
    const { format = 'csv', startDate, endDate } = req.query;

    let query = `
      SELECT 
        CONCAT(u.first_name, ' ', u.last_name) as student_name,
        s.student_number,
        ses.title as session_title,
        ses.session_date,
        ses.session_type,
        ses.meeting_type,
        al.status,
        al.remarks,
        al.recorded_at
      FROM attendance_logs al
      JOIN course_enrollments ce ON al.enrollment_id = ce.enrollment_id
      JOIN students s ON ce.student_id = s.student_id
      JOIN users u ON s.user_id = u.user_id
      LEFT JOIN sessions ses ON al.session_id = ses.session_id
      WHERE ce.section_course_id = $1
    `;

    const params = [sectionCourseId];

    if (startDate && endDate) {
      query += ` AND al.session_date BETWEEN $2 AND $3`;
      params.push(startDate, endDate);
    }

    query += ` ORDER BY ses.session_date DESC, u.first_name, u.last_name`;

    const result = await db.query(query, params);

    if (format === 'csv') {
      // Generate CSV
      const csvHeader = 'Student Name,Student Number,Session Title,Session Date,Session Type,Meeting Type,Status,Remarks,Recorded At\n';
      const csvData = result.rows.map(row => 
        `"${row.student_name}","${row.student_number}","${row.session_title}","${row.session_date}","${row.session_type}","${row.meeting_type}","${row.status}","${row.remarks || ''}","${row.recorded_at}"`
      ).join('\n');
      
      const csv = csvHeader + csvData;
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="attendance_${sectionCourseId}_${new Date().toISOString().split('T')[0]}.csv"`);
      res.send(csv);
    } else {
      // Return JSON
      res.json({
        success: true,
        data: result.rows
      });
    }
  } catch (error) {
    console.error('Error exporting attendance:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get attendance summary for faculty dashboard
router.get('/summary/:facultyId', authenticateToken, async (req, res) => {
  try {
    const { facultyId } = req.params;
    const { startDate, endDate } = req.query;

    let dateFilter = '';
    const params = [facultyId];

    if (startDate && endDate) {
      dateFilter = `AND al.session_date BETWEEN $2 AND $3`;
      params.push(startDate, endDate);
    }

    const result = await db.query(`
      SELECT 
        sc.section_course_id,
        c.course_code,
        c.title as course_title,
        s.section_code,
        COUNT(DISTINCT ses.session_id) as total_sessions,
        COUNT(al.attendance_id) as total_attendance_records,
        COUNT(CASE WHEN al.status = 'present' THEN 1 END) as present_count,
        COUNT(CASE WHEN al.status = 'absent' THEN 1 END) as absent_count,
        COUNT(CASE WHEN al.status = 'late' THEN 1 END) as late_count,
        COUNT(CASE WHEN al.status = 'excused' THEN 1 END) as excused_count,
        ROUND(
          (COUNT(CASE WHEN al.status = 'present' THEN 1 END)::FLOAT / 
           NULLIF(COUNT(al.attendance_id), 0)) * 100, 2
        ) as overall_attendance_percentage
      FROM section_courses sc
      JOIN courses c ON sc.course_id = c.course_id
      JOIN sections s ON sc.section_id = s.section_id
      LEFT JOIN sessions ses ON sc.section_course_id = ses.section_course_id
      LEFT JOIN attendance_logs al ON ses.session_id = al.session_id ${dateFilter}
      WHERE sc.instructor_id = $1
      GROUP BY sc.section_course_id, c.course_code, c.title, s.section_code
      ORDER BY c.course_code
    `, params);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching attendance summary:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
