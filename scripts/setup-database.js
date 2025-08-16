import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '../.env.local') });

// Database connection - use the same config as the main app
const connectionString = process.env.DATABASE_URL || 
  `postgresql://${process.env.NEON_USER}:${process.env.NEON_PASSWORD}@${process.env.NEON_HOST}:${process.env.NEON_PORT || 5432}/${process.env.NEON_DATABASE}?sslmode=require`;

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

async function setupDatabase() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Starting CRMS Database Setup...');
    
    // Explicitly set search path to public schema and ensure it exists
    await client.query('CREATE SCHEMA IF NOT EXISTS public');
    await client.query('SET search_path TO public');
    console.log('📋 Schema set to public');
    
    // Grant necessary permissions
    await client.query('GRANT ALL ON SCHEMA public TO PUBLIC');
    await client.query('GRANT ALL ON ALL TABLES IN SCHEMA public TO PUBLIC');
    await client.query('GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO PUBLIC');
    console.log('🔐 Permissions granted');
    
    // Create tables in proper order (respecting foreign key dependencies)
    console.log('📚 Creating CRMS tables...');
    
    // 1. SCHOOL SETTINGS
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.departments (
        department_id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        department_abbreviation VARCHAR(50) UNIQUE NOT NULL
      )
    `);
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.programs (
        program_id SERIAL PRIMARY KEY,
        department_id INTEGER,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        program_abbreviation VARCHAR(50) UNIQUE NOT NULL,
        FOREIGN KEY (department_id) REFERENCES public.departments(department_id) ON DELETE CASCADE
      )
    `);
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.program_specializations (
        specialization_id SERIAL PRIMARY KEY,
        program_id INTEGER,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        abbreviation VARCHAR(50) UNIQUE NOT NULL,
        FOREIGN KEY (program_id) REFERENCES public.programs(program_id) ON DELETE CASCADE
      )
    `);
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.school_terms (
        term_id SERIAL PRIMARY KEY,
        school_year VARCHAR(50) NOT NULL,
        semester VARCHAR(10) CHECK (semester IN ('1st', '2nd', 'Summer')),
        start_date DATE,
        end_date DATE,
        is_active BOOLEAN DEFAULT FALSE
      )
    `);
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.sections (
        section_id SERIAL PRIMARY KEY,
        program_id INTEGER,
        specialization_id INTEGER,
        section_code VARCHAR(100) NOT NULL,
        year_level INTEGER CHECK (year_level BETWEEN 1 AND 5),
        term_id INTEGER,
        FOREIGN KEY (program_id) REFERENCES public.programs(program_id) ON DELETE CASCADE,
        FOREIGN KEY (specialization_id) REFERENCES public.program_specializations(specialization_id) ON DELETE CASCADE,
        FOREIGN KEY (term_id) REFERENCES public.school_terms(term_id) ON DELETE CASCADE
      )
    `);
    
    // 2. USERS & ROLES
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.roles (
        role_id SERIAL PRIMARY KEY,
        name VARCHAR(100) UNIQUE NOT NULL
      )
    `);
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.users (
        user_id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role_id INTEGER,
        profile_pic TEXT,
        is_approved BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (role_id) REFERENCES public.roles(role_id) ON DELETE SET NULL
      )
    `);
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.user_approvals (
        approval_id SERIAL PRIMARY KEY,
        user_id INTEGER,
        approved_by INTEGER,
        approved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        approval_note TEXT,
        FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE CASCADE,
        FOREIGN KEY (approved_by) REFERENCES public.users(user_id) ON DELETE SET NULL
      )
    `);
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.students (
        student_id SERIAL PRIMARY KEY,
        student_number VARCHAR(50) UNIQUE NOT NULL,
        full_name VARCHAR(255) NOT NULL,
        gender VARCHAR(10) CHECK (gender IN ('male', 'female', 'other')),
        birth_date DATE,
        contact_email VARCHAR(255),
        student_photo TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.user_profiles (
        user_profile_id SERIAL PRIMARY KEY,
        user_id INTEGER UNIQUE,
        profile_type VARCHAR(50),
        specialization TEXT,
        designation VARCHAR(100),
        office_assigned VARCHAR(255),
        program_id INTEGER,
        department_id INTEGER,
        term_start DATE,
        term_end DATE,
        contact_email VARCHAR(255),
        bio TEXT,
        position TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE CASCADE,
        FOREIGN KEY (program_id) REFERENCES public.programs(program_id) ON DELETE SET NULL,
        FOREIGN KEY (department_id) REFERENCES public.departments(department_id) ON DELETE SET NULL
      )
    `);
    
    // 3. COURSES & ENROLLMENTS
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.courses (
        course_id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        course_code VARCHAR(50) UNIQUE NOT NULL,
        description TEXT,
        term_id INTEGER,
        specialization_id INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (term_id) REFERENCES public.school_terms(term_id) ON DELETE SET NULL,
        FOREIGN KEY (specialization_id) REFERENCES public.program_specializations(specialization_id) ON DELETE SET NULL
      )
    `);
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.section_courses (
        section_course_id SERIAL PRIMARY KEY,
        section_id INTEGER,
        course_id INTEGER,
        instructor_id INTEGER,
        term_id INTEGER,
        FOREIGN KEY (section_id) REFERENCES public.sections(section_id) ON DELETE CASCADE,
        FOREIGN KEY (course_id) REFERENCES public.courses(course_id) ON DELETE CASCADE,
        FOREIGN KEY (instructor_id) REFERENCES public.users(user_id) ON DELETE SET NULL,
        FOREIGN KEY (term_id) REFERENCES public.school_terms(term_id) ON DELETE CASCADE
      )
    `);
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.course_enrollments (
        enrollment_id SERIAL PRIMARY KEY,
        section_course_id INTEGER,
        student_id INTEGER,
        enrollment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        status VARCHAR(20) CHECK (status IN ('enrolled', 'dropped', 'completed')),
        FOREIGN KEY (section_course_id) REFERENCES public.section_courses(section_course_id) ON DELETE CASCADE,
        FOREIGN KEY (student_id) REFERENCES public.students(student_id) ON DELETE CASCADE
      )
    `);
    
    // 4. SYLLABI & ILOs
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.syllabi (
        syllabus_id SERIAL PRIMARY KEY,
        course_id INTEGER,
        term_id INTEGER,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        assessment_framework JSONB,
        grading_policy JSONB,
        course_outline TEXT,
        learning_resources TEXT[],
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (course_id) REFERENCES public.courses(course_id) ON DELETE CASCADE,
        FOREIGN KEY (term_id) REFERENCES public.school_terms(term_id) ON DELETE SET NULL
      )
    `);
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.intended_learning_outcomes (
        ilo_id SERIAL PRIMARY KEY,
        syllabus_id INTEGER,
        outcome_code VARCHAR(50) NOT NULL,
        description TEXT NOT NULL,
        category VARCHAR(50),
        level VARCHAR(20),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (syllabus_id) REFERENCES public.syllabi(syllabus_id) ON DELETE CASCADE
      )
    `);
    
    // 5. ASSESSMENTS
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.assessment_templates (
        template_id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        assessment_type VARCHAR(50),
        total_points DECIMAL(5,2),
        passing_score DECIMAL(5,2),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.assessments (
        assessment_id SERIAL PRIMARY KEY,
        template_id INTEGER,
        section_course_id INTEGER,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        assessment_date DATE,
        total_points DECIMAL(5,2),
        passing_score DECIMAL(5,2),
        status VARCHAR(20) DEFAULT 'draft',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (template_id) REFERENCES public.assessment_templates(template_id) ON DELETE SET NULL,
        FOREIGN KEY (section_course_id) REFERENCES public.section_courses(section_course_id) ON DELETE CASCADE
      )
    `);
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.assessment_scores (
        score_id SERIAL PRIMARY KEY,
        assessment_id INTEGER,
        student_id INTEGER,
        score DECIMAL(5,2),
        max_score DECIMAL(5,2),
        submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (assessment_id) REFERENCES public.assessments(assessment_id) ON DELETE CASCADE,
        FOREIGN KEY (student_id) REFERENCES public.students(student_id) ON DELETE CASCADE
      )
    `);
    
    // 6. ATTENDANCE
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.attendance_sessions (
        session_id SERIAL PRIMARY KEY,
        section_course_id INTEGER,
        session_date DATE NOT NULL,
        start_time TIME,
        end_time TIME,
        created_by INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (section_course_id) REFERENCES public.section_courses(section_course_id) ON DELETE CASCADE,
        FOREIGN KEY (created_by) REFERENCES public.users(user_id) ON DELETE SET NULL
      )
    `);
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.attendance_records (
        record_id SERIAL PRIMARY KEY,
        session_id INTEGER,
        student_id INTEGER,
        status VARCHAR(20) CHECK (status IN ('present', 'absent', 'late', 'excused')),
        time_in TIME,
        time_out TIME,
        remarks TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (session_id) REFERENCES public.attendance_sessions(session_id) ON DELETE CASCADE,
        FOREIGN KEY (student_id) REFERENCES public.students(student_id) ON DELETE CASCADE
      )
    `);
    
    console.log('✅ All CRMS tables created successfully!');
    
    // Insert sample data
    console.log('📊 Inserting sample data...');
    
    // Insert departments
    await client.query(`
      INSERT INTO public.departments (name, department_abbreviation) VALUES 
      ('Computer Science', 'CS'),
      ('Engineering', 'ENG'),
      ('Business Administration', 'BA')
      ON CONFLICT (department_abbreviation) DO NOTHING
    `);
    
    // Insert programs
    await client.query(`
      INSERT INTO public.programs (department_id, name, description, program_abbreviation) VALUES 
      (1, 'Bachelor of Science in Computer Science', 'BS Computer Science Program', 'BSCS'),
      (2, 'Bachelor of Science in Civil Engineering', 'BS Civil Engineering Program', 'BSCE'),
      (3, 'Bachelor of Science in Business Administration', 'BS Business Administration Program', 'BSBA')
      ON CONFLICT (program_abbreviation) DO NOTHING
    `);
    
    // Insert school terms
    await client.query(`
      INSERT INTO public.school_terms (school_year, semester, start_date, end_date, is_active) VALUES 
      ('2024-2025', '1st', '2024-08-26', '2024-12-20', true),
      ('2024-2025', '2nd', '2025-01-13', '2025-05-16', false)
      ON CONFLICT DO NOTHING
    `);
    
    // Insert roles
    await client.query(`
      INSERT INTO public.roles (name) VALUES 
      ('ADMIN'), ('FACULTY'), ('DEAN'), ('STAFF'), ('PROGRAM_CHAIR')
      ON CONFLICT (name) DO NOTHING
    `);
    
    // Get role IDs
    const rolesResult = await client.query('SELECT role_id, name FROM public.roles ORDER BY role_id');
    const roles = rolesResult.rows;
    
    console.log('✅ Roles inserted:', roles.map(r => r.name).join(', '));
    
    // Insert users with placeholder passwords
    const users = [
      { name: 'Admin User', email: 'admin@university.edu', role: 'ADMIN' },
      { name: 'Faculty User', email: 'faculty@university.edu', role: 'FACULTY' },
      { name: 'Dean User', email: 'dean@university.edu', role: 'DEAN' },
      { name: 'Staff User', email: 'staff@university.edu', role: 'STAFF' },
      { name: 'Program Chair', email: 'chair@university.edu', role: 'PROGRAM_CHAIR' }
    ];
    
    for (const user of users) {
      const role = roles.find(r => r.name === user.role);
      if (role) {
        await client.query(`
          INSERT INTO public.users (name, email, password_hash, role_id, is_approved) 
          VALUES ($1, $2, $3, $4, true)
          ON CONFLICT (email) DO NOTHING
        `, [user.name, user.email, '$2b$10$placeholder_hash_' + user.role.toLowerCase(), role.role_id]);
        
        console.log(`✅ User created: ${user.name} (${user.email})`);
      }
    }
    
    // Insert basic profiles
    const profiles = [
      { designation: 'System Administrator', office: 'IT Department' },
      { designation: 'Assistant Professor', office: 'Computer Science Department' },
      { designation: 'Dean of Engineering', office: 'Engineering Dean Office' },
      { designation: 'Academic Staff', office: 'Registrar Office' },
      { designation: 'CS Program Chair', office: 'Computer Science Department' }
    ];
    
    for (let i = 0; i < profiles.length; i++) {
      const profile = profiles[i];
      await client.query(`
        INSERT INTO public.user_profiles (user_id, profile_type, designation, office_assigned)
        SELECT user_id, 
               CASE 
                 WHEN role_id = 1 THEN 'Administrator'
                 WHEN role_id = 2 THEN 'Faculty'
                 WHEN role_id = 3 THEN 'Dean'
                 WHEN role_id = 4 THEN 'Staff'
                 WHEN role_id = 5 THEN 'Program Chair'
                 ELSE 'User'
               END,
               $1, $2
        FROM public.users 
        WHERE user_id = ${i + 1}
        ON CONFLICT (user_id) DO NOTHING
      `, [profile.designation, profile.office]);
    }
    
    console.log('✅ Sample data inserted successfully!');
    console.log('📝 Note: Update password hashes with real bcrypt hashes before production use');
    
  } catch (error) {
    console.error('❌ Setup failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Test connection
async function testConnection() {
  try {
    const client = await pool.connect();
    console.log('✅ Database connection successful!');
    
    // Test schema access
    await client.query('SET search_path TO public');
    const result = await client.query('SELECT NOW() as current_time, current_schema() as schema');
    console.log('🕐 Current time:', result.rows[0].current_time);
    console.log('📋 Current schema:', result.rows[0].schema);
    
    client.release();
    return true;
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    return false;
  }
}

// Main execution
async function main() {
  try {
    // Test connection first
    const isConnected = await testConnection();
    if (!isConnected) {
      console.error('❌ Cannot proceed without database connection');
      process.exit(1);
    }
    
    // Run setup
    await setupDatabase();
    console.log('🎉 CRMS Database setup completed successfully!');
    
  } catch (error) {
    console.error('❌ Setup failed:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { setupDatabase, testConnection };
