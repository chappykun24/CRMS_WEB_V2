import { Pool } from 'pg';

export default async function handler(req, res) {
  console.log('📝 [STUDENTS-LIST] Request received:', {
    method: req.method,
    url: req.url,
    timestamp: new Date().toISOString()
  });

  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    console.log('📝 [STUDENTS-LIST] OPTIONS request, sending CORS response');
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    console.log('❌ [STUDENTS-LIST] Invalid method:', req.method);
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    console.log('📝 [STUDENTS-LIST] Processing students list request...');
    
    // Check if environment variables are set
    const requiredEnvVars = ['NEON_HOST', 'NEON_DATABASE', 'NEON_USER', 'NEON_PASSWORD'];
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      console.log('❌ [STUDENTS-LIST] Missing environment variables:', missingVars);
      return res.status(500).json({ 
        success: false, 
        error: `Missing environment variables: ${missingVars.join(', ')}`,
        message: 'Please set Neon database environment variables in Vercel dashboard'
      });
    }

    console.log('📝 [STUDENTS-LIST] Environment variables OK, connecting to database...');

    // Database connection
    const connectionString = `postgresql://${process.env.NEON_USER}:${process.env.NEON_PASSWORD}@${process.env.NEON_HOST}:${process.env.NEON_PORT || 5432}/${process.env.NEON_DATABASE}?sslmode=require`;
    
    const pool = new Pool({
      connectionString,
      ssl: true,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });

    try {
      console.log('📝 [STUDENTS-LIST] Pool created, fetching students...');

      // Fetch students with user information and profiles
      const studentsQuery = `
        SELECT 
          s.student_id,
          s.student_number,
          s.full_name,
          s.gender,
          s.birth_date,
          s.contact_email,
          s.student_photo,
          s.created_at,
          s.updated_at,
          u.is_approved,
          up.department_id,
          up.program_id,
          up.specialization,
          up.term_start,
          up.term_end
        FROM students s
        LEFT JOIN users u ON s.student_id = u.user_id
        LEFT JOIN user_profiles up ON s.student_id = up.user_id
        ORDER BY s.created_at DESC
      `;
      
      const studentsResult = await pool.query(studentsQuery);
      const students = studentsResult.rows;

      console.log(`✅ [STUDENTS-LIST] Found ${students.length} students`);

      await pool.end();
      console.log('✅ [STUDENTS-LIST] Database pool closed successfully');

      const response = {
        success: true,
        students: students,
        count: students.length
      };

      console.log('✅ [STUDENTS-LIST] Sending success response');
      res.status(200).json(response);
      console.log('✅ [STUDENTS-LIST] Students list request completed successfully');

    } catch (dbError) {
      console.log('❌ [STUDENTS-LIST] Database operation failed:', dbError.message);
      await pool.end();
      const errorResponse = { 
        success: false,
        error: `Failed to fetch students: ${dbError.message}`,
        details: 'Please try again or contact support'
      };
      console.log('❌ [STUDENTS-LIST] Sending error response:', errorResponse);
      res.status(500).json(errorResponse);
    }
  } catch (error) {
    console.error('❌ [STUDENTS-LIST] Error occurred:', error);
    const errorResponse = { 
      success: false,
      error: error.message,
      details: 'Check Vercel function logs for more information'
    };
    console.log('❌ [STUDENTS-LIST] Sending error response:', errorResponse);
    res.status(500).json(errorResponse);
  }
}
