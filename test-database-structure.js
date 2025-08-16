import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load environment variables from .env.local
const envPath = path.join(process.cwd(), '.env.local');
console.log('🔍 Looking for .env.local at:', envPath);

// Try to read and parse .env.local manually
try {
  const envContent = fs.readFileSync(envPath, 'utf8');
  console.log('📖 .env.local file found and read successfully');
  
  // Parse environment variables manually
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      if (key && valueParts.length > 0) {
        const cleanKey = key.replace(/\x00/g, '').trim();
        const cleanValue = valueParts.join('=').replace(/\x00/g, '').trim();
        if (cleanKey && cleanValue) {
          process.env[cleanKey] = cleanValue;
        }
      }
    }
  });
  
  console.log('✅ Environment variables loaded manually');
} catch (error) {
  console.log('❌ Error reading .env.local:', error.message);
}

// Also try dotenv as fallback
dotenv.config({ path: envPath });

// Create database pool
const connectionString = `postgresql://${process.env.VITE_NEON_USER}:${process.env.VITE_NEON_PASSWORD}@${process.env.VITE_NEON_HOST}:${process.env.VITE_NEON_PORT || 5432}/${process.env.VITE_NEON_DATABASE}?sslmode=require`;

const pool = new Pool({
  connectionString,
  ssl: true,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

// Test database connection
const testConnection = async () => {
  try {
    const client = await pool.connect();
    console.log('✅ Database connection successful');
    client.release();
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    return false;
  }
};

// Close pool
const closePool = async () => {
  try {
    await pool.end();
    console.log('Database pool closed');
  } catch (error) {
    console.error('Error closing pool:', error);
  }
};

// Expected tables from your schema
const expectedTables = [
  'departments',
  'programs', 
  'program_specializations',
  'school_terms',
  'sections',
  'roles',
  'users',
  'user_approvals',
  'students',
  'user_profiles',
  'courses',
  'section_courses',
  'course_enrollments',
  'course_enrollment_requests',
  'syllabi',
  'ilos',
  'syllabus_ilos',
  'assessment_templates',
  'syllabus_assessment_plans',
  'assessments',
  'rubrics',
  'assessment_rubrics',
  'submissions',
  'rubric_scores',
  'grade_adjustments',
  'course_final_grades',
  'sessions',
  'attendance_logs',
  'analytics_clusters',
  'dashboards_data_cache',
  'assessment_ilo_weights',
  'student_ilo_scores',
  'notifications',
  'uploads'
];

// Test functions
async function testDatabaseConnection() {
  console.log('\n🔌 Testing Database Connection...');
  try {
    const isConnected = await testConnection();
    if (isConnected) {
      console.log('✅ Database connection successful');
      return true;
    } else {
      console.log('❌ Database connection failed');
      return false;
    }
  } catch (error) {
    console.error('❌ Connection test error:', error.message);
    return false;
  }
}

async function testTableExistence() {
  console.log('\n📋 Testing Table Existence...');
  const missingTables = [];
  const existingTables = [];

  try {
    for (const tableName of expectedTables) {
      try {
        const result = await pool.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = $1
          );
        `, [tableName]);

        if (result.rows[0].exists) {
          console.log(`✅ Table '${tableName}' exists`);
          existingTables.push(tableName);
        } else {
          console.log(`❌ Table '${tableName}' missing`);
          missingTables.push(tableName);
        }
      } catch (error) {
        console.error(`❌ Error checking table '${tableName}':`, error.message);
        missingTables.push(tableName);
      }
    }

    console.log(`\n📊 Summary: ${existingTables.length}/${expectedTables.length} tables exist`);
    
    if (missingTables.length > 0) {
      console.log('❌ Missing tables:', missingTables.join(', '));
    } else {
      console.log('🎉 All expected tables exist!');
    }

    return { existingTables, missingTables };
  } catch (error) {
    console.error('❌ Table existence test error:', error.message);
    return { existingTables: [], missingTables: expectedTables };
  }
}

async function testTableStructure() {
  console.log('\n🏗️  Testing Table Structure...');
  const structureIssues = [];

  try {
    for (const tableName of expectedTables) {
      try {
        // Get table columns
        const columnsResult = await pool.query(`
          SELECT column_name, data_type, is_nullable, column_default
          FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = $1
          ORDER BY ordinal_position;
        `, [tableName]);

        // Get table constraints
        const constraintsResult = await pool.query(`
          SELECT constraint_name, constraint_type
          FROM information_schema.table_constraints 
          WHERE table_schema = 'public' 
          AND table_name = $1;
        `, [tableName]);

        console.log(`\n📋 Table: ${tableName}`);
        console.log(`   Columns: ${columnsResult.rows.length}`);
        console.log(`   Constraints: ${constraintsResult.rows.length}`);

        // Check if table has basic structure
        if (columnsResult.rows.length === 0) {
          structureIssues.push(`${tableName}: No columns found`);
        }

        // Check for primary key
        const hasPrimaryKey = constraintsResult.rows.some(row => 
          row.constraint_type === 'PRIMARY KEY'
        );
        
        if (!hasPrimaryKey) {
          structureIssues.push(`${tableName}: Missing primary key`);
        }

      } catch (error) {
        console.error(`❌ Error checking structure of '${tableName}':`, error.message);
        structureIssues.push(`${tableName}: Error checking structure`);
      }
    }

    if (structureIssues.length > 0) {
      console.log('\n⚠️  Structure issues found:');
      structureIssues.forEach(issue => console.log(`   - ${issue}`));
    } else {
      console.log('\n🎉 All tables have proper structure!');
    }

    return structureIssues;
  } catch (error) {
    console.error('❌ Table structure test error:', error.message);
    return ['Error testing table structure'];
  }
}

async function testSampleQueries() {
  console.log('\n🔍 Testing Sample Queries...');
  const testResults = [];

  try {
    // Test 1: Count records in key tables
    const countQueries = [
      { name: 'departments', query: 'SELECT COUNT(*) FROM departments' },
      { name: 'programs', query: 'SELECT COUNT(*) FROM programs' },
      { name: 'users', query: 'SELECT COUNT(*) FROM users' },
      { name: 'courses', query: 'SELECT COUNT(*) FROM courses' }
    ];

    for (const test of countQueries) {
      try {
        const result = await pool.query(test.query);
        const count = parseInt(result.rows[0].count);
        console.log(`✅ ${test.name}: ${count} records`);
        testResults.push({ table: test.name, status: 'success', count });
      } catch (error) {
        console.log(`❌ ${test.name}: Query failed - ${error.message}`);
        testResults.push({ table: test.name, status: 'failed', error: error.message });
      }
    }

    // Test 2: Test JOIN queries
    console.log('\n🔗 Testing JOIN queries...');
    
    try {
      const joinResult = await pool.query(`
        SELECT d.name as department, p.name as program, COUNT(p.program_id) as program_count
        FROM departments d
        LEFT JOIN programs p ON d.department_id = p.department_id
        GROUP BY d.department_id, d.name, p.name
        LIMIT 5;
      `);
      console.log(`✅ JOIN query successful: ${joinResult.rows.length} results`);
      testResults.push({ test: 'JOIN query', status: 'success' });
    } catch (error) {
      console.log(`❌ JOIN query failed: ${error.message}`);
      testResults.push({ test: 'JOIN query', status: 'failed', error: error.message });
    }

    return testResults;
  } catch (error) {
    console.error('❌ Sample queries test error:', error.message);
    return [{ test: 'Sample queries', status: 'failed', error: error.message }];
  }
}

async function testIndexes() {
  console.log('\n📚 Testing Database Indexes...');
  const indexResults = [];

  try {
    // Check for key indexes
    const expectedIndexes = [
      'idx_syllabi_course_id',
      'idx_assessments_section_course_id',
      'idx_submissions_enrollment_id',
      'idx_attendance_logs_enrollment_id'
    ];

    for (const indexName of expectedIndexes) {
      try {
        const result = await pool.query(`
          SELECT indexname, tablename 
          FROM pg_indexes 
          WHERE indexname = $1;
        `, [indexName]);

        if (result.rows.length > 0) {
          console.log(`✅ Index '${indexName}' exists on table '${result.rows[0].tablename}'`);
          indexResults.push({ index: indexName, status: 'exists' });
        } else {
          console.log(`❌ Index '${indexName}' missing`);
          indexResults.push({ index: indexName, status: 'missing' });
        }
      } catch (error) {
        console.log(`❌ Error checking index '${indexName}': ${error.message}`);
        indexResults.push({ index: indexName, status: 'error', error: error.message });
      }
    }

    return indexResults;
  } catch (error) {
    console.error('❌ Index test error:', error.message);
    return [{ test: 'Indexes', status: 'failed', error: error.message }];
  }
}

async function runAllTests() {
  console.log('🚀 Starting Database Structure Tests...');
  console.log('=====================================');

  try {
    // Test 1: Connection
    const isConnected = await testDatabaseConnection();
    if (!isConnected) {
      console.log('\n❌ Cannot proceed with tests - database connection failed');
      return;
    }

    // Test 2: Table existence
    const tableResults = await testTableExistence();

    // Test 3: Table structure
    const structureIssues = await testTableStructure();

    // Test 4: Sample queries
    const queryResults = await testSampleQueries();

    // Test 5: Indexes
    const indexResults = await testIndexes();

    // Final summary
    console.log('\n📊 FINAL TEST SUMMARY');
    console.log('=====================');
    console.log(`✅ Database Connection: ${isConnected ? 'SUCCESS' : 'FAILED'}`);
    console.log(`✅ Tables Exist: ${tableResults.existingTables.length}/${expectedTables.length}`);
    console.log(`✅ Table Structure: ${structureIssues.length === 0 ? 'ALL GOOD' : `${structureIssues.length} ISSUES`}`);
    console.log(`✅ Sample Queries: ${queryResults.filter(r => r.status === 'success').length}/${queryResults.length}`);
    console.log(`✅ Indexes: ${indexResults.filter(r => r.status === 'exists').length}/${indexResults.length}`);

    if (tableResults.missingTables.length === 0 && structureIssues.length === 0) {
      console.log('\n🎉 CONGRATULATIONS! Your database structure is correct and complete!');
    } else {
      console.log('\n⚠️  Some issues were found. Please review the details above.');
    }

  } catch (error) {
    console.error('\n❌ Test execution failed:', error.message);
  } finally {
    await closePool();
    console.log('\n🔚 Database tests completed');
  }
}

// Run the tests
runAllTests().catch(console.error);
