/**
 * Debug Clustering Script
 * 
 * This script helps debug clustering issues by:
 * 1. Checking student data quality
 * 2. Verifying cluster assignments
 * 3. Testing clustering API
 * 4. Analyzing cluster distribution
 * 
 * Usage: node backend/scripts/debug_clustering.js
 */

import db from '../config/database.js';
import clusteringService from '../services/clusteringService.js';

const DEBUG_MODE = true;

// Helper function to log debug information
const debugLog = (message, data = null) => {
  if (DEBUG_MODE) {
    console.log(`🔍 [DEBUG] ${message}`);
    if (data) {
      console.log(JSON.stringify(data, null, 2));
    }
  }
};

// Check student data quality
const checkStudentDataQuality = async () => {
  console.log('\n📊 Checking Student Data Quality...\n');
  
  try {
    const query = `
      SELECT 
        COUNT(*) as total_students,
        COUNT(DISTINCT attendance_percentage) as unique_attendance,
        COUNT(DISTINCT average_score) as unique_scores,
        MIN(attendance_percentage) as min_attendance,
        MAX(attendance_percentage) as max_attendance,
        AVG(attendance_percentage) as avg_attendance,
        MIN(average_score) as min_score,
        MAX(average_score) as max_score,
        AVG(average_score) as avg_score,
        MIN(average_submission_status_score) as min_status_score,
        MAX(average_submission_status_score) as max_status_score,
        AVG(average_submission_status_score) as avg_status_score,
        MIN(submission_rate) as min_submission_rate,
        MAX(submission_rate) as max_submission_rate,
        AVG(submission_rate) as avg_submission_rate,
        COUNT(CASE WHEN attendance_percentage IS NULL THEN 1 END) as null_attendance,
        COUNT(CASE WHEN average_score IS NULL THEN 1 END) as null_scores,
        COUNT(CASE WHEN average_submission_status_score IS NULL THEN 1 END) as null_status_score,
        COUNT(CASE WHEN submission_rate IS NULL THEN 1 END) as null_submission_rate
      FROM (
        SELECT 
          s.student_id,
          COALESCE(
            (SELECT AVG(CASE WHEN a.status = 'present' THEN 100.0 ELSE 0.0 END)
             FROM attendances a
             JOIN course_enrollments ce ON a.enrollment_id = ce.enrollment_id
             WHERE ce.student_id = s.student_id
             GROUP BY ce.student_id), 
            75.0
          ) as attendance_percentage,
          COALESCE(
            (SELECT AVG(sub.total_score)
             FROM submissions sub
             JOIN course_enrollments ce ON sub.enrollment_id = ce.enrollment_id
             WHERE ce.student_id = s.student_id
             GROUP BY ce.student_id),
            50.0
          ) as average_score,
          COALESCE(
            (SELECT AVG(
              CASE 
                WHEN COALESCE(sub.submission_status, 'missing') = 'ontime' THEN 0
                WHEN COALESCE(sub.submission_status, 'missing') = 'late' THEN 1
                WHEN COALESCE(sub.submission_status, 'missing') = 'missing' THEN 2
                ELSE 2
              END
            )
             FROM submissions sub
             JOIN assessments a ON sub.assessment_id = a.assessment_id
             JOIN course_enrollments ce ON sub.enrollment_id = ce.enrollment_id
             WHERE ce.student_id = s.student_id
             GROUP BY ce.student_id),
            1.0
          ) as average_submission_status_score,
          COALESCE(
            (SELECT COUNT(*) * 100.0 / NULLIF(COUNT(DISTINCT a.assessment_id), 0)
             FROM submissions sub
             JOIN assessments a ON sub.assessment_id = a.assessment_id
             JOIN course_enrollments ce ON sub.enrollment_id = ce.enrollment_id
             WHERE ce.student_id = s.student_id
             GROUP BY ce.student_id),
            100.0
          ) as submission_rate
        FROM students s
        LIMIT 100
      ) student_metrics
    `;
    
    const result = await db.query(query);
    const stats = result.rows[0];
    
    console.log('Student Data Statistics:');
    console.log(`  Total Students: ${stats.total_students}`);
    console.log(`  Unique Attendance Values: ${stats.unique_attendance}`);
    console.log(`  Unique Score Values: ${stats.unique_scores}`);
    console.log(`\n  Attendance Range: ${stats.min_attendance} - ${stats.max_attendance} (avg: ${stats.avg_attendance})`);
    console.log(`  Score Range: ${stats.min_score} - ${stats.max_score} (avg: ${stats.avg_score})`);
    console.log(`  Submission Status Score Range: ${stats.min_status_score} - ${stats.max_status_score} (avg: ${stats.avg_status_score}) (0=ontime, 1=late, 2=missing)`);
    console.log(`  Submission Rate Range: ${stats.min_submission_rate} - ${stats.max_submission_rate} (avg: ${stats.avg_submission_rate})`);
    console.log(`\n  Null Values:`);
    console.log(`    Attendance: ${stats.null_attendance}`);
    console.log(`    Scores: ${stats.null_scores}`);
    console.log(`    Status Score: ${stats.null_status_score}`);
    console.log(`    Submission Rate: ${stats.null_submission_rate}`);
    
    // Check for data variation issues
    if (stats.unique_attendance < 5) {
      console.warn('⚠️  WARNING: Low variation in attendance data. Clustering may not work well.');
    }
    if (stats.unique_scores < 5) {
      console.warn('⚠️  WARNING: Low variation in score data. Clustering may not work well.');
    }
    if (parseFloat(stats.max_attendance) - parseFloat(stats.min_attendance) < 20) {
      console.warn('⚠️  WARNING: Attendance range is too narrow. Clustering may not distinguish students well.');
    }
    if (parseFloat(stats.max_score) - parseFloat(stats.min_score) < 20) {
      console.warn('⚠️  WARNING: Score range is too narrow. Clustering may not distinguish students well.');
    }
    
    return stats;
  } catch (error) {
    console.error('❌ Error checking student data quality:', error);
    throw error;
  }
};

// Check cluster distribution
const checkClusterDistribution = async (termId = null) => {
  console.log('\n📈 Checking Cluster Distribution...\n');
  
  try {
    let query, params;
    
    if (termId) {
      query = `
        SELECT 
          ac.cluster_label,
          COUNT(*) as student_count,
          ROUND(AVG((ac.based_on->>'attendance')::numeric), 2) as avg_attendance,
          ROUND(AVG((ac.based_on->>'score')::numeric), 2) as avg_score,
          ROUND(AVG((ac.based_on->>'average_submission_status_score')::numeric), 2) as avg_status_score,
          ROUND(AVG((ac.based_on->>'submission_rate')::numeric), 2) as avg_submission_rate,
          MIN(ac.generated_at) as first_generated,
          MAX(ac.generated_at) as last_generated
        FROM analytics_clusters ac
        WHERE ac.term_id = $1 AND ac.student_id IS NOT NULL
        GROUP BY ac.cluster_label
        ORDER BY 
          CASE ac.cluster_label
            WHEN 'Excellent Performance' THEN 1
            WHEN 'Good Performance' THEN 2
            WHEN 'Needs Improvement' THEN 3
            WHEN 'At Risk' THEN 4
            ELSE 5
          END
      `;
      params = [termId];
    } else {
      query = `
        SELECT 
          ac.cluster_label,
          COUNT(*) as student_count,
          ROUND(AVG((ac.based_on->>'attendance')::numeric), 2) as avg_attendance,
          ROUND(AVG((ac.based_on->>'score')::numeric), 2) as avg_score,
          ROUND(AVG((ac.based_on->>'average_submission_status_score')::numeric), 2) as avg_status_score,
          ROUND(AVG((ac.based_on->>'submission_rate')::numeric), 2) as avg_submission_rate,
          MIN(ac.generated_at) as first_generated,
          MAX(ac.generated_at) as last_generated
        FROM analytics_clusters ac
        WHERE ac.student_id IS NOT NULL
          AND ac.generated_at > NOW() - INTERVAL '24 hours'
        GROUP BY ac.cluster_label
        ORDER BY 
          CASE ac.cluster_label
            WHEN 'Excellent Performance' THEN 1
            WHEN 'Good Performance' THEN 2
            WHEN 'Needs Improvement' THEN 3
            WHEN 'At Risk' THEN 4
            ELSE 5
          END
      `;
      params = [];
    }
    
    const result = await db.query(query, params);
    
    if (result.rows.length === 0) {
      console.log('⚠️  No clusters found in cache.');
      return null;
    }
    
    console.log('Cluster Distribution:');
    console.log('─'.repeat(100));
    result.rows.forEach(row => {
      console.log(`\n${row.cluster_label || 'Not Clustered'}:`);
      console.log(`  Student Count: ${row.student_count}`);
      console.log(`  Avg Attendance: ${row.avg_attendance}%`);
      console.log(`  Avg Score: ${row.avg_score}`);
      console.log(`  Avg Status Score: ${row.avg_status_score} (0=ontime, 1=late, 2=missing)`);
      console.log(`  Avg Submission Rate: ${row.avg_submission_rate}%`);
      console.log(`  Generated: ${row.first_generated} to ${row.last_generated}`);
    });
    
    // Check for issues
    const totalStudents = result.rows.reduce((sum, row) => sum + parseInt(row.student_count), 0);
    const singleCluster = result.rows.length === 1;
    const unbalancedCluster = result.rows.some(row => 
      parseInt(row.student_count) / totalStudents > 0.8
    );
    
    if (singleCluster) {
      console.warn('\n⚠️  WARNING: All students are in a single cluster. This suggests a clustering issue.');
    }
    if (unbalancedCluster) {
      console.warn('\n⚠️  WARNING: One cluster contains >80% of students. Clustering may not be working correctly.');
    }
    
    return result.rows;
  } catch (error) {
    console.error('❌ Error checking cluster distribution:', error);
    throw error;
  }
};

// Test clustering API with sample data
const testClusteringAPI = async () => {
  console.log('\n🧪 Testing Clustering API...\n');
  
  try {
    const config = clusteringService.getClusteringConfig();
    
    if (!config.enabled) {
      console.warn('⚠️  Clustering is disabled. Enable it by setting CLUSTER_SERVICE_URL.');
      return null;
    }
    
    console.log(`Cluster Service URL: ${config.url}`);
    console.log(`Endpoint: ${config.endpoint}`);
    
    // Create sample test data
    const testStudents = [
      {
        student_id: 999999,
        attendance_percentage: 95,
        average_score: 85,
        average_submission_status_score: 0,
        submission_rate: 100
      },
      {
        student_id: 999998,
        attendance_percentage: 50,
        average_score: 30,
        average_submission_status_score: 2,
        submission_rate: 60
      },
      {
        student_id: 999997,
        attendance_percentage: 75,
        average_score: 40,
        average_submission_status_score: 1,
        submission_rate: 80
      }
    ];
    
    console.log('Sending test data to clustering API...');
    debugLog('Test data:', testStudents);
    
    const result = await clusteringService.getStudentClusters(testStudents, null, {
      cacheMaxAgeHours: 0, // Don't use cache for testing
      timeoutMs: 30000
    });
    
    if (result.error) {
      console.error(`❌ Clustering API Error: ${result.error}`);
      return null;
    }
    
    console.log('\n✅ Clustering API Response:');
    testStudents.forEach((student, index) => {
      const clusterInfo = result.clusters.get(student.student_id);
      console.log(`\nStudent ${student.student_id}:`);
      console.log(`  Attendance: ${student.attendance_percentage}%`);
      console.log(`  Score: ${student.average_score}`);
      console.log(`  Status Score: ${student.average_submission_status_score} (0=ontime, 1=late, 2=missing)`);
      console.log(`  Submission Rate: ${student.submission_rate}%`);
      console.log(`  Cluster: ${clusterInfo?.cluster_label || 'Not Clustered'}`);
      console.log(`  Cluster Number: ${clusterInfo?.cluster ?? 'N/A'}`);
    });
    
    return result;
  } catch (error) {
    console.error('❌ Error testing clustering API:', error);
    throw error;
  }
};

// Main function
const main = async () => {
  console.log('🔍 Clustering Debug Script');
  console.log('='.repeat(100));
  
  try {
    // Check student data quality
    await checkStudentDataQuality();
    
    // Check cluster distribution
    await checkClusterDistribution();
    
    // Test clustering API
    await testClusteringAPI();
    
    console.log('\n✅ Debug script completed successfully!');
  } catch (error) {
    console.error('\n❌ Debug script failed:', error);
    process.exit(1);
  } finally {
    await db.end();
  }
};

// Run the script
main();

