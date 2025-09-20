#!/usr/bin/env node

import pg from 'pg';
import dotenv from 'dotenv';

const { Pool } = pg;
dotenv.config();

// Copy VITE_ environment variables to regular ones for backend use (for compatibility)
if (process.env.VITE_NEON_HOST) {
  process.env.NEON_HOST = process.env.VITE_NEON_HOST;
  process.env.NEON_DATABASE = process.env.VITE_NEON_DATABASE;
  process.env.NEON_USER = process.env.VITE_NEON_USER;
  process.env.NEON_PASSWORD = process.env.VITE_NEON_PASSWORD;
  process.env.NEON_PORT = process.env.VITE_NEON_PORT;
}

// Create connection to Neon database
const pool = new Pool({
  host: process.env.NEON_HOST || process.env.DB_HOST || 'localhost',
  database: process.env.NEON_DATABASE || process.env.DB_NAME || 'crms_db',
  user: process.env.NEON_USER || process.env.DB_USER || 'postgres',
  password: process.env.NEON_PASSWORD || process.env.DB_PASSWORD || 'password',
  port: parseInt(process.env.NEON_PORT || process.env.DB_PORT || '5432'),
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// Query optimization script
async function optimizeQueries() {
  console.log('🚀 Starting database query optimization...');
  console.log('🌐 Connecting to Neon database...');

  try {
    // Test connection first
    const testResult = await pool.query('SELECT NOW()');
    console.log('✅ Connected to Neon database:', testResult.rows[0].now);

    // 1. Add performance indexes
    console.log('📊 Adding performance indexes...');
    await pool.query(`
      -- Users table indexes
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_users_role_id ON users(role_id);
      CREATE INDEX IF NOT EXISTS idx_users_is_approved ON users(is_approved);
      CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);
      
      -- User profiles indexes
      CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
      CREATE INDEX IF NOT EXISTS idx_user_profiles_department_id ON user_profiles(department_id);
      
      -- Departments indexes
      CREATE INDEX IF NOT EXISTS idx_departments_name ON departments(name);
      CREATE INDEX IF NOT EXISTS idx_departments_abbreviation ON departments(department_abbreviation);
      
      -- Section courses indexes
      CREATE INDEX IF NOT EXISTS idx_section_courses_faculty_id ON section_courses(faculty_id);
      CREATE INDEX IF NOT EXISTS idx_section_courses_course_id ON section_courses(course_id);
      CREATE INDEX IF NOT EXISTS idx_section_courses_semester ON section_courses(semester);
      CREATE INDEX IF NOT EXISTS idx_section_courses_school_year ON section_courses(school_year);
      
      -- Students indexes
      CREATE INDEX IF NOT EXISTS idx_students_student_number ON students(student_number);
      CREATE INDEX IF NOT EXISTS idx_students_contact_email ON students(contact_email);
      CREATE INDEX IF NOT EXISTS idx_students_program_id ON students(program_id);
      
      -- Student enrollments indexes
      CREATE INDEX IF NOT EXISTS idx_student_enrollments_student_id ON student_enrollments(student_id);
      CREATE INDEX IF NOT EXISTS idx_student_enrollments_section_course_id ON student_enrollments(section_course_id);
      
      -- Composite indexes for common queries
      CREATE INDEX IF NOT EXISTS idx_users_role_approved ON users(role_id, is_approved);
      CREATE INDEX IF NOT EXISTS idx_user_profiles_department_user ON user_profiles(department_id, user_id);
      CREATE INDEX IF NOT EXISTS idx_section_courses_faculty_semester ON section_courses(faculty_id, semester, school_year);
    `);

    // 2. Update table statistics
    console.log('📈 Updating table statistics...');
    await pool.query(`
      ANALYZE users;
      ANALYZE user_profiles;
      ANALYZE departments;
      ANALYZE roles;
      ANALYZE section_courses;
      ANALYZE students;
      ANALYZE student_enrollments;
    `);

    // 3. Check query performance
    console.log('🔍 Checking query performance...');
    
    // Test users query performance
    const usersStart = Date.now();
    await pool.query('SELECT * FROM users WHERE role_id = $1 AND is_approved = $2', [2, true]);
    const usersDuration = Date.now() - usersStart;
    console.log(`✅ Users query: ${usersDuration}ms`);

    // Test section courses query performance
    const coursesStart = Date.now();
    await pool.query('SELECT * FROM section_courses WHERE faculty_id = $1', [1]);
    const coursesDuration = Date.now() - coursesStart;
    console.log(`✅ Section courses query: ${coursesDuration}ms`);

    // 4. Show database size and stats
    console.log('📊 Database statistics:');
    const stats = await pool.query(`
      SELECT 
        schemaname,
        tablename,
        attname,
        n_distinct,
        correlation
      FROM pg_stats 
      WHERE schemaname = 'public' 
      AND tablename IN ('users', 'section_courses', 'students')
      ORDER BY tablename, attname;
    `);
    
    console.table(stats.rows);

    console.log('✅ Database optimization completed successfully!');
    
  } catch (error) {
    console.error('❌ Error optimizing database:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run optimization if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  optimizeQueries()
    .then(() => {
      console.log('🎉 Optimization script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Optimization script failed:', error);
      process.exit(1);
    });
}

export default optimizeQueries;
