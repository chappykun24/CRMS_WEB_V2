/**
 * Test script to directly call the Python Clustering API
 * This helps diagnose why cluster labels are null
 */

import dotenv from 'dotenv';
dotenv.config();

const CLUSTER_SERVICE_URL = process.env.CLUSTER_SERVICE_URL || 
                            process.env.CLUSTER_API_URL || 
                            process.env.VITE_CLUSTER_API_URL;

if (!CLUSTER_SERVICE_URL) {
  console.error('❌ CLUSTER_SERVICE_URL is not set in environment variables');
  process.exit(1);
}

const API_ENDPOINT = CLUSTER_SERVICE_URL.endsWith('/api/cluster') 
  ? CLUSTER_SERVICE_URL 
  : `${CLUSTER_SERVICE_URL.replace(/\/$/, '')}/api/cluster`;

console.log('🔍 [TEST] Clustering API Test Script');
console.log('=====================================');
console.log(`📍 Service URL: ${CLUSTER_SERVICE_URL}`);
console.log(`📍 API Endpoint: ${API_ENDPOINT}`);
console.log('');

// Sample student data matching the format from the frontend
const sampleStudents = [
  {
    student_id: 54,
    attendance_percentage: 62.50,
    attendance_present_count: 10,
    attendance_absent_count: 3,
    attendance_late_count: 3,
    attendance_total_sessions: 16,
    average_score: 33.95,
    ilo_weighted_score: null,
    submission_rate: 1.0,
    submission_ontime_count: 18,
    submission_late_count: 4,
    submission_missing_count: 0,
    submission_total_assessments: 22,
    average_submission_status_score: 0.18,
    average_days_late: null
  },
  {
    student_id: 76,
    attendance_percentage: 75.0,
    attendance_present_count: 12,
    attendance_absent_count: 2,
    attendance_late_count: 2,
    attendance_total_sessions: 16,
    average_score: 85.5,
    ilo_weighted_score: null,
    submission_rate: 0.95,
    submission_ontime_count: 20,
    submission_late_count: 1,
    submission_missing_count: 1,
    submission_total_assessments: 22,
    average_submission_status_score: 0.9,
    average_days_late: null
  },
  {
    student_id: 57,
    attendance_percentage: 50.0,
    attendance_present_count: 8,
    attendance_absent_count: 4,
    attendance_late_count: 4,
    attendance_total_sessions: 16,
    average_score: 45.2,
    ilo_weighted_score: null,
    submission_rate: 0.8,
    submission_ontime_count: 15,
    submission_late_count: 3,
    submission_missing_count: 4,
    submission_total_assessments: 22,
    average_submission_status_score: 0.5,
    average_days_late: null
  }
];

async function testClusteringAPI() {
  try {
    console.log('📤 [TEST] Sending request to Python API...');
    console.log(`📤 [TEST] Payload: ${sampleStudents.length} students`);
    console.log(`📤 [TEST] Sample student:`, JSON.stringify(sampleStudents[0], null, 2));
    console.log('');

    const startTime = Date.now();
    
    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(sampleStudents),
    });

    const responseTime = Date.now() - startTime;

    console.log(`📡 [TEST] Response received:`);
    console.log(`   Status: ${response.status} ${response.statusText}`);
    console.log(`   Response Time: ${responseTime}ms`);
    console.log(`   Content-Type: ${response.headers.get('content-type')}`);
    console.log('');

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ [TEST] API Error:`);
      console.error(`   Status: ${response.status}`);
      console.error(`   Error: ${errorText}`);
      return;
    }

    const result = await response.json();
    
    console.log(`✅ [TEST] Response parsed successfully`);
    console.log(`   Type: ${Array.isArray(result) ? 'Array' : typeof result}`);
    console.log(`   Length: ${Array.isArray(result) ? result.length : 'N/A'}`);
    console.log('');

    if (!Array.isArray(result)) {
      console.error(`❌ [TEST] Invalid response type! Expected array, got ${typeof result}`);
      console.error(`   Response:`, JSON.stringify(result, null, 2));
      return;
    }

    if (result.length === 0) {
      console.error(`❌ [TEST] API returned empty array!`);
      return;
    }

    console.log(`📊 [TEST] Cluster Results Analysis:`);
    console.log(`   Total Results: ${result.length}`);
    console.log('');

    // Analyze each result
    result.forEach((r, idx) => {
      console.log(`   Result ${idx + 1}:`);
      console.log(`     student_id: ${r.student_id} (type: ${typeof r.student_id})`);
      console.log(`     cluster: ${r.cluster} (type: ${typeof r.cluster})`);
      console.log(`     cluster_label: ${r.cluster_label} (type: ${typeof r.cluster_label})`);
      console.log(`     silhouette_score: ${r.silhouette_score} (type: ${typeof r.silhouette_score})`);
      
      if (r.cluster_label === null || r.cluster_label === undefined) {
        console.error(`     ⚠️  NULL CLUSTER LABEL!`);
      }
      console.log('');
    });

    // Summary
    const withLabels = result.filter(r => r.cluster_label !== null && r.cluster_label !== undefined);
    const withoutLabels = result.filter(r => r.cluster_label === null || r.cluster_label === undefined);
    
    console.log(`📈 [TEST] Summary:`);
    console.log(`   Students with cluster labels: ${withLabels.length}/${result.length}`);
    console.log(`   Students without cluster labels: ${withoutLabels.length}/${result.length}`);
    
    if (withoutLabels.length > 0) {
      console.error(`   ❌ Found ${withoutLabels.length} students with null cluster labels!`);
      console.error(`   Sample IDs with null labels:`, withoutLabels.slice(0, 5).map(r => r.student_id));
    }

    // Check for student ID matches
    const sentIds = sampleStudents.map(s => s.student_id);
    const receivedIds = result.map(r => r.student_id);
    const missingIds = sentIds.filter(id => !receivedIds.includes(id));
    const extraIds = receivedIds.filter(id => !sentIds.includes(id));
    
    if (missingIds.length > 0) {
      console.warn(`   ⚠️  Missing student IDs in response:`, missingIds);
    }
    if (extraIds.length > 0) {
      console.warn(`   ⚠️  Extra student IDs in response:`, extraIds);
    }

    // Full response
    console.log('');
    console.log(`📋 [TEST] Full API Response:`);
    console.log(JSON.stringify(result, null, 2));

  } catch (error) {
    console.error(`❌ [TEST] Error calling clustering API:`);
    console.error(`   Name: ${error.name}`);
    console.error(`   Message: ${error.message}`);
    console.error(`   Stack:`, error.stack);
  }
}

// Run the test
testClusteringAPI();

