import { Pool } from 'pg';

export default async function handler(req, res) {
  console.log('📝 [STUDENT-MANAGEMENT] Request received:', {
    method: req.method,
    url: req.url,
    timestamp: new Date().toISOString()
  });

  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    console.log('📝 [STUDENT-MANAGEMENT] OPTIONS request, sending CORS response');
    res.status(200).end();
    return;
  }

  if (!['GET', 'PUT', 'DELETE'].includes(req.method)) {
    console.log('❌ [STUDENT-MANAGEMENT] Invalid method:', req.method);
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    console.log('📝 [STUDENT-MANAGEMENT] Processing student management request...');
    
    // Check if environment variables are set
    const requiredEnvVars = ['NEON_HOST', 'NEON_DATABASE', 'NEON_USER', 'NEON_PASSWORD'];
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      console.log('❌ [STUDENT-MANAGEMENT] Missing environment variables:', missingVars);
      return res.status(500).json({ 
        success: false, 
        error: `Missing environment variables: ${missingVars.join(', ')}`,
        message: 'Please set Neon database environment variables in Vercel dashboard'
      });
    }

    console.log('📝 [STUDENT-MANAGEMENT] Environment variables OK, connecting to database...');

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
      const { id } = req.query;
      console.log('📝 [STUDENT-MANAGEMENT] Student ID:', id);

      if (req.method === 'GET') {
        // Get student by ID (students table only)
        console.log('📝 [STUDENT-MANAGEMENT] Fetching student...');
        const studentQuery = `
          SELECT 
            student_id,
            student_number,
            full_name,
            gender,
            birth_date,
            contact_email,
            student_photo,
            created_at,
            updated_at
          FROM students
          WHERE student_id = $1
        `;
        
        const studentResult = await pool.query(studentQuery, [id]);
        
        if (studentResult.rows.length === 0) {
          await pool.end();
          return res.status(404).json({ success: false, error: 'Student not found' });
        }

        const student = studentResult.rows[0];
        console.log('✅ [STUDENT-MANAGEMENT] Student fetched successfully');

        await pool.end();
        res.status(200).json({ success: true, student });

      } else if (req.method === 'PUT') {
        // Update student (students table only)
        console.log('📝 [STUDENT-MANAGEMENT] Updating student...');
        const { 
          studentNumber, firstName, lastName, middleInitial, suffix, 
          email, gender, birthDate, profilePic 
        } = req.body;

        // Validate minimal required fields for an update
        if (!studentNumber || !firstName || !lastName || !email) {
          await pool.end();
          return res.status(400).json({ 
            success: false, 
            error: 'Student number, first name, last name, and email are required' 
          });
        }

        // Combine name fields
        const fullName = [firstName, middleInitial, lastName, suffix].filter(Boolean).join(' ');

        // Update student record
        const updateStudentQuery = `
          UPDATE students 
          SET student_number = $1, full_name = $2, gender = $3, birth_date = $4, 
              contact_email = $5, student_photo = $6, updated_at = CURRENT_TIMESTAMP
          WHERE student_id = $7
        `;
        
        await pool.query(updateStudentQuery, [
          studentNumber, fullName, gender || null, birthDate || null, 
          email, profilePic || null, id
        ]);

        console.log('✅ [STUDENT-MANAGEMENT] Student updated successfully');
        await pool.end();
        res.status(200).json({ success: true, message: 'Student updated successfully' });

      } else if (req.method === 'DELETE') {
        // Delete student (students table only)
        console.log('📝 [STUDENT-MANAGEMENT] Deleting student...');
        await pool.query('DELETE FROM students WHERE student_id = $1', [id]);
        console.log('✅ [STUDENT-MANAGEMENT] Student deleted successfully');
        await pool.end();
        res.status(200).json({ success: true, message: 'Student deleted successfully' });
      }

    } catch (dbError) {
      console.log('❌ [STUDENT-MANAGEMENT] Database operation failed:', dbError.message);
      await pool.end();
      const errorResponse = { 
        success: false,
        error: `Student operation failed: ${dbError.message}`,
        details: 'Please try again or contact support'
      };
      console.log('❌ [STUDENT-MANAGEMENT] Sending error response:', errorResponse);
      res.status(500).json(errorResponse);
    }
  } catch (error) {
    console.error('❌ [STUDENT-MANAGEMENT] Error occurred:', error);
    const errorResponse = { 
      success: false,
      error: error.message,
      details: 'Check Vercel function logs for more information'
    };
    console.log('❌ [STUDENT-MANAGEMENT] Sending error response:', errorResponse);
    res.status(500).json(errorResponse);
  }
}
