/**
 * Identify ILOs in Existing Classes for Term 12
 * 
 * This script identifies all ILOs associated with classes (section_courses) in term 12.
 * 
 * Usage:
 *   node scripts/identify-term-12-ilos.js [term_id]
 * 
 * If term_id is not provided, defaults to 12.
 * 
 * Environment Variables Required:
 *   DATABASE_URL - Neon PostgreSQL connection string
 *   Or set: NEON_HOST, NEON_PORT, NEON_DATABASE, NEON_USER, NEON_PASSWORD
 */

import pg from 'pg';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

const { Client } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from multiple locations
dotenv.config({ path: join(__dirname, '../.env') });
dotenv.config({ path: join(__dirname, '../backend/.env') });
dotenv.config();

// Direct Neon database credentials
const directCredentials = {
  host: 'ep-wild-paper-aeedio16-pooler.c-2.us-east-2.aws.neon.tech',
  database: 'neondb',
  user: 'neondb_owner',
  password: 'npg_u7tYTRj2wcED',
  port: 5432
};

// Use connection string if available, otherwise use direct credentials
let client;
if (process.env.DATABASE_URL) {
  client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
} else {
  // Use direct credentials (primary method)
  client = new Client({
    host: process.env.NEON_HOST || process.env.VITE_NEON_HOST || directCredentials.host,
    database: process.env.NEON_DATABASE || process.env.VITE_NEON_DATABASE || directCredentials.database,
    user: process.env.NEON_USER || process.env.VITE_NEON_USER || directCredentials.user,
    password: process.env.NEON_PASSWORD || process.env.VITE_NEON_PASSWORD || directCredentials.password,
    port: parseInt(process.env.NEON_PORT || process.env.VITE_NEON_PORT || directCredentials.port.toString()),
    ssl: { rejectUnauthorized: false }
  });
}

/**
 * Get term information
 */
async function getTermInfo(termId) {
  try {
    const query = `
      SELECT 
        term_id,
        school_year,
        semester,
        start_date,
        end_date,
        is_active
      FROM school_terms
      WHERE term_id = $1
    `;
    
    const result = await client.query(query, [termId]);
    return result.rows[0] || null;
  } catch (error) {
    console.error('Error fetching term info:', error.message);
    return null;
  }
}

/**
 * Identify all ILOs for classes in a specific term
 */
async function identifyTermILOs(termId = 12) {
  try {
    await client.connect();
    console.log(`\n🔍 Identifying ILOs for classes in Term ${termId}...\n`);
    
    // Get term information
    const termInfo = await getTermInfo(termId);
    if (!termInfo) {
      console.log(`❌ Term ${termId} not found in database.`);
      return;
    }
    
    console.log(`Term: ${termInfo.school_year} ${termInfo.semester || ''}`.trim());
    console.log(`Active: ${termInfo.is_active ? 'Yes' : 'No'}`);
    if (termInfo.start_date) console.log(`Start Date: ${termInfo.start_date}`);
    if (termInfo.end_date) console.log(`End Date: ${termInfo.end_date}`);
    console.log('\n' + '='.repeat(80) + '\n');
    
    // Query to get all section_courses with their ILOs for the term
    const query = `
      SELECT 
        sc.section_course_id,
        c.course_code,
        c.title as course_title,
        s.section_code,
        u.name as instructor_name,
        sy.syllabus_id,
        sy.review_status,
        sy.approval_status,
        i.ilo_id,
        i.code as ilo_code,
        i.description as ilo_description,
        i.category,
        i.level,
        i.weight_percentage,
        i.is_active as ilo_is_active
      FROM section_courses sc
      INNER JOIN courses c ON sc.course_id = c.course_id
      INNER JOIN sections s ON sc.section_id = s.section_id
      LEFT JOIN users u ON sc.instructor_id = u.user_id
      LEFT JOIN syllabi sy ON sc.section_course_id = sy.section_course_id
      LEFT JOIN ilos i ON sy.syllabus_id = i.syllabus_id
      WHERE sc.term_id = $1
      ORDER BY 
        c.course_code,
        s.section_code,
        i.code
    `;
    
    const result = await client.query(query, [termId]);
    
    if (result.rows.length === 0) {
      console.log(`❌ No classes found for Term ${termId}.`);
      return;
    }
    
    // Group results by section_course
    const classesMap = new Map();
    
    result.rows.forEach(row => {
      const key = row.section_course_id;
      
      if (!classesMap.has(key)) {
        classesMap.set(key, {
          section_course_id: row.section_course_id,
          course_code: row.course_code,
          course_title: row.course_title,
          section_code: row.section_code,
          instructor_name: row.instructor_name,
          syllabus_id: row.syllabus_id,
          review_status: row.review_status,
          approval_status: row.approval_status,
          ilos: []
        });
      }
      
      // Add ILO if it exists
      if (row.ilo_id) {
        classesMap.get(key).ilos.push({
          ilo_id: row.ilo_id,
          ilo_code: row.ilo_code,
          ilo_description: row.ilo_description,
          category: row.category,
          level: row.level,
          weight_percentage: row.weight_percentage,
          is_active: row.ilo_is_active
        });
      }
    });
    
    // Display results
    const classes = Array.from(classesMap.values());
    let totalClasses = 0;
    let classesWithSyllabi = 0;
    let classesWithILOs = 0;
    let totalILOs = 0;
    
    classes.forEach((classInfo, index) => {
      totalClasses++;
      const hasSyllabus = classInfo.syllabus_id !== null;
      const hasILOs = classInfo.ilos.length > 0;
      
      if (hasSyllabus) classesWithSyllabi++;
      if (hasILOs) {
        classesWithILOs++;
        totalILOs += classInfo.ilos.length;
      }
      
      console.log(`${index + 1}. Class: ${classInfo.course_code} - ${classInfo.course_title}`);
      console.log(`   Section: ${classInfo.section_code}`);
      console.log(`   Section Course ID: ${classInfo.section_course_id}`);
      if (classInfo.instructor_name) {
        console.log(`   Instructor: ${classInfo.instructor_name}`);
      }
      
      if (hasSyllabus) {
        console.log(`   Syllabus ID: ${classInfo.syllabus_id}`);
        console.log(`   Review Status: ${classInfo.review_status || 'N/A'}`);
        console.log(`   Approval Status: ${classInfo.approval_status || 'N/A'}`);
      } else {
        console.log(`   ⚠️  No syllabus found for this class`);
      }
      
      if (hasILOs) {
        console.log(`   ILOs (${classInfo.ilos.length}):`);
        classInfo.ilos.forEach((ilo, iloIndex) => {
          console.log(`      ${iloIndex + 1}. ${ilo.ilo_code}${ilo.is_active ? '' : ' (INACTIVE)'}`);
          if (ilo.ilo_description) {
            const desc = ilo.ilo_description.length > 100 
              ? ilo.ilo_description.substring(0, 100) + '...' 
              : ilo.ilo_description;
            console.log(`         ${desc}`);
          }
          if (ilo.category) console.log(`         Category: ${ilo.category}`);
          if (ilo.level) console.log(`         Level: ${ilo.level}`);
          if (ilo.weight_percentage) console.log(`         Weight: ${ilo.weight_percentage}%`);
          console.log(`         ILO ID: ${ilo.ilo_id}`);
        });
      } else if (hasSyllabus) {
        console.log(`   ⚠️  No ILOs found for this syllabus`);
      } else {
        console.log(`   ⚠️  No syllabus, so no ILOs available`);
      }
      
      console.log('');
    });
    
    // Summary
    console.log('='.repeat(80));
    console.log('\n📊 SUMMARY:\n');
    console.log(`Total Classes in Term ${termId}: ${totalClasses}`);
    console.log(`Classes with Syllabi: ${classesWithSyllabi}`);
    console.log(`Classes with ILOs: ${classesWithILOs}`);
    console.log(`Total ILOs Found: ${totalILOs}`);
    console.log(`\n✅ Analysis complete!\n`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await client.end();
  }
}

// Get term_id from command line argument or default to 12
const termId = parseInt(process.argv[2]) || 12;

identifyTermILOs(termId).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

