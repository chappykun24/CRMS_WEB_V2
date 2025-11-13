import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { ChartBarIcon, FunnelIcon, MagnifyingGlassIcon, XMarkIcon, UserCircleIcon, ArrowPathIcon, ChevronDownIcon } from '@heroicons/react/24/solid';
import { TableSkeleton } from '../../components/skeletons';
import { trackEvent } from '../../utils/analytics';
import { getPrefetchedAnalytics, getPrefetchedSchoolTerms, prefetchDeanData } from '../../services/dataPrefetchService';
import { API_BASE_URL } from '../../utils/api';
import deanCacheService from '../../services/deanCacheService';
import { safeSetItem, safeGetItem, createCacheGetter, createCacheSetter } from '../../utils/cacheUtils';

// Analytics-specific skeleton components
const AnalyticsTableSkeleton = () => (
  <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
    <div className="max-h-[calc(100vh-250px)] overflow-y-auto">
      <table className="min-w-full bg-white text-sm">
        <thead className="bg-gray-50 sticky top-0 z-10">
          <tr>
            <th className="px-3 py-2 text-left font-semibold text-gray-700 border-b border-gray-200 text-xs">Student Name</th>
            <th className="px-3 py-2 text-left font-semibold text-gray-700 border-b border-gray-200 text-xs">Section</th>
            <th className="px-3 py-2 text-left font-semibold text-gray-700 border-b border-gray-200 text-xs">Program</th>
            <th className="px-3 py-2 text-left font-semibold text-gray-700 border-b border-gray-200 text-xs">Department</th>
            <th className="px-3 py-2 text-left font-semibold text-gray-700 border-b border-gray-200 text-xs">Attendance</th>
            <th className="px-3 py-2 text-left font-semibold text-gray-700 border-b border-gray-200 text-xs">Score</th>
            <th className="px-3 py-2 text-left font-semibold text-gray-700 border-b border-gray-200 text-xs">Submissions</th>
            <th className="px-3 py-2 text-left font-semibold text-gray-700 border-b border-gray-200 text-xs">Cluster</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {[...Array(10)].map((_, i) => (
            <tr key={i} className="animate-pulse">
              <td className="px-3 py-2">
                <div className="h-3 bg-gray-200 rounded w-32"></div>
              </td>
              <td className="px-3 py-2">
                <div className="h-3 bg-gray-200 rounded w-16"></div>
              </td>
              <td className="px-3 py-2">
                <div className="h-3 bg-gray-200 rounded w-20"></div>
              </td>
              <td className="px-3 py-2">
                <div className="h-3 bg-gray-200 rounded w-24"></div>
              </td>
              <td className="px-3 py-2">
                <div className="space-y-1">
                  <div className="h-3 bg-gray-200 rounded w-12"></div>
                  <div className="h-2 bg-gray-200 rounded w-20"></div>
                </div>
              </td>
              <td className="px-3 py-2">
                <div className="h-3 bg-gray-200 rounded w-12"></div>
              </td>
              <td className="px-3 py-2">
                <div className="space-y-1">
                  <div className="h-3 bg-gray-200 rounded w-12"></div>
                  <div className="h-2 bg-gray-200 rounded w-28"></div>
                </div>
              </td>
              <td className="px-3 py-2">
                <div className="h-5 bg-gray-200 rounded-full w-24"></div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

const StatisticsCardsSkeleton = () => (
  <div className="space-y-3">
    {[...Array(4)].map((_, i) => (
      <div key={i} className="bg-gradient-to-br from-gray-50 to-white rounded-lg shadow-sm border border-gray-200 p-4 animate-pulse">
        <div className="h-3 bg-gray-200 rounded w-24 mb-2"></div>
        <div className="h-8 bg-gray-200 rounded w-16"></div>
      </div>
    ))}
  </div>
);

const ChartsSkeleton = () => (
  <div className="space-y-4">
    {[...Array(6)].map((_, i) => (
      <div key={i} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-32 mb-3"></div>
        <div className="h-48 bg-gray-100 rounded"></div>
      </div>
    ))}
  </div>
);

// Cache helpers
const getCachedData = createCacheGetter(deanCacheService);
const setCachedData = createCacheSetter(deanCacheService);

import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ZAxis,
} from 'recharts';

const Analytics = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const [hasFetched, setHasFetched] = useState(false);
  const [clusterMeta, setClusterMeta] = useState({ enabled: false });
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCluster, setSelectedCluster] = useState('all');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [studentPhoto, setStudentPhoto] = useState(null);
  const [loadingPhoto, setLoadingPhoto] = useState(false);
  const [studentEnrollments, setStudentEnrollments] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState('all');
  const [classFilteredData, setClassFilteredData] = useState(null);
  const [loadingClassData, setLoadingClassData] = useState(false);
  const [chartsLoaded, setChartsLoaded] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;
  const [schoolTerms, setSchoolTerms] = useState([]);
  const [selectedTermId, setSelectedTermId] = useState('');
  const [sections, setSections] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [selectedSectionId, setSelectedSectionId] = useState('');
  const [selectedProgramId, setSelectedProgramId] = useState('');
  const [selectedDepartmentId, setSelectedDepartmentId] = useState('');
  const abortControllerRef = useRef(null);
  const termsAbortControllerRef = useRef(null);
  const progressIntervalRef = useRef(null);
  const setErrorRef = useRef(null);
  
  // Keep setError ref updated - initialize immediately
  setErrorRef.current = setError;
  
  // Also update in useEffect to ensure it stays current
  useEffect(() => {
    setErrorRef.current = setError;
  }, [setError]);

  // Fetch school terms with caching
  const fetchSchoolTerms = useCallback(async () => {
    console.log('🔍 [DEAN ANALYTICS] fetchSchoolTerms starting');
    
    // Check sessionStorage first for instant display
    const sessionCacheKey = 'dean_school_terms_session';
    const sessionCached = safeGetItem(sessionCacheKey);
    
    // Check enhanced cache
    const cacheKey = 'dean_school_terms';
    const cachedData = getCachedData('terms', cacheKey, 30 * 60 * 1000); // 30 minute cache
    
    if (sessionCached) {
      console.log('📦 [DEAN ANALYTICS] Using session cached school terms');
      setSchoolTerms(sessionCached);
      const activeTerm = sessionCached.find(t => t.is_active);
      if (activeTerm) {
        setSelectedTermId(activeTerm.term_id.toString());
      }
      // Continue to fetch fresh data in background
    } else if (cachedData) {
      console.log('📦 [DEAN ANALYTICS] Using enhanced cached school terms');
      setSchoolTerms(cachedData);
      const activeTerm = cachedData.find(t => t.is_active);
      if (activeTerm) {
        setSelectedTermId(activeTerm.term_id.toString());
      }
      // Cache in sessionStorage for next time
      safeSetItem(sessionCacheKey, cachedData);
      // Continue to fetch fresh data in background
    }
    
    // Cancel previous request if still pending
    if (termsAbortControllerRef.current) {
      termsAbortControllerRef.current.abort();
    }
    
    // Create new abort controller
    termsAbortControllerRef.current = new AbortController();
    
    try {
      console.log('🔄 [DEAN ANALYTICS] Fetching fresh school terms...');
      const response = await fetch(`${API_BASE_URL}/school-terms`, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        signal: termsAbortControllerRef.current.signal
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch school terms: ${response.status}`);
      }
      
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Response is not JSON');
      }
      
      const terms = await response.json();
      console.log(`✅ [DEAN ANALYTICS] Received ${Array.isArray(terms) ? terms.length : 0} school terms`);
      
      const termsData = Array.isArray(terms) ? terms : [];
      setSchoolTerms(termsData);
      
      // Set the active term as default if available
      const activeTerm = termsData.find(t => t.is_active);
      if (activeTerm) {
        setSelectedTermId(activeTerm.term_id.toString());
      }
      
      // Store in sessionStorage for instant next load
      if (!sessionCached) {
        safeSetItem(sessionCacheKey, termsData);
      }
      
      // Store full data in enhanced cache
      setCachedData('terms', cacheKey, termsData);
      
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('🚫 [DEAN ANALYTICS] School terms request was aborted');
        return;
      }
      console.error('❌ [DEAN ANALYTICS] Error fetching school terms:', error);
      // Only set error if we don't have cached data and setError is available
      const hasCachedTerms = sessionCached || cachedData;
      if (!hasCachedTerms && setErrorRef.current) {
        try {
          setErrorRef.current(error.message);
        } catch (e) {
          // Component may have unmounted, ignore silently
          console.warn('⚠️ [DEAN ANALYTICS] Could not set error state (component may have unmounted)');
        }
      }
    }
  }, []);

  // Fetch sections, programs, and departments
  const fetchFilterOptions = useCallback(async () => {
    try {
      const [sectionsRes, programsRes, departmentsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/section-courses/sections`, {
          headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' }
        }),
        fetch(`${API_BASE_URL}/catalog/programs`, {
          headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' }
        }),
        fetch(`${API_BASE_URL}/departments`, {
          headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' }
        })
      ]);

      if (sectionsRes.ok) {
        const sectionsData = await sectionsRes.json();
        setSections(Array.isArray(sectionsData) ? sectionsData : []);
      }
      if (programsRes.ok) {
        const programsData = await programsRes.json();
        setPrograms(Array.isArray(programsData) ? programsData : []);
      }
      if (departmentsRes.ok) {
        const departmentsData = await departmentsRes.json();
        setDepartments(Array.isArray(departmentsData) ? departmentsData : []);
      }
    } catch (error) {
      console.error('❌ [DEAN ANALYTICS] Error fetching filter options:', error);
    }
  }, []);

  // Fetch school terms on component mount
  useEffect(() => {
    fetchSchoolTerms();
    fetchFilterOptions();
    
    // Prefetch data for other dean pages in the background
    setTimeout(() => {
      prefetchDeanData();
    }, 1000);
    
    // Cleanup function to abort pending requests
    return () => {
      if (termsAbortControllerRef.current) {
        termsAbortControllerRef.current.abort();
      }
    };
  }, [fetchSchoolTerms, fetchFilterOptions]);

  // Auto-load analytics when component mounts or when school terms are loaded
  useEffect(() => {
    // Only auto-load on initial mount if we have school terms loaded
    // This ensures we have the term selection available
    if (!hasFetched && schoolTerms.length > 0 && !loading) {
      // Small delay to ensure state is ready
      const timer = setTimeout(() => {
        handleFetch();
      }, 200);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolTerms.length]);

  // Track if this is the initial term selection (from active term)
  const isInitialTermLoadRef = useRef(true);

  // Auto-refetch when filters change (only after initial load)
  useEffect(() => {
    if (hasFetched && !isInitialTermLoadRef.current) {
      handleFetch();
    }
    // Mark initial load as complete once we have a term selected
    if (selectedTermId) {
      isInitialTermLoadRef.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTermId, selectedSectionId, selectedProgramId, selectedDepartmentId]);

  // Load student photo when modal opens
  const loadStudentPhoto = useCallback(async (studentId) => {
    if (!studentId) return;
    
    setLoadingPhoto(true);
    setStudentPhoto(null);
    
    try {
      const response = await fetch(`${API_BASE_URL}/students/${studentId}/photo`, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setStudentPhoto(data.photo);
      } else {
        setStudentPhoto(null);
      }
    } catch (error) {
      console.error('❌ [DEAN ANALYTICS] Error loading student photo:', error);
      setStudentPhoto(null);
    } finally {
      setLoadingPhoto(false);
    }
  }, []);

  // Fetch student enrollments when modal opens
  const fetchStudentEnrollments = useCallback(async (studentId) => {
    if (!studentId) return;
    
    try {
      const response = await fetch(`${API_BASE_URL}/students/${studentId}/enrollments`, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          setStudentEnrollments(result.data);
          console.log('✅ [DEAN ANALYTICS] Loaded student enrollments:', result.data.length);
        }
      }
    } catch (error) {
      console.error('❌ [DEAN ANALYTICS] Error loading student enrollments:', error);
      setStudentEnrollments([]);
    }
  }, []);

  // Fetch per-class analytics data for a student
  const fetchClassAnalytics = useCallback(async (studentId, sectionCourseId) => {
    if (!studentId || !sectionCourseId) {
      setClassFilteredData(null);
      return;
    }
    
    setLoadingClassData(true);
    try {
      const params = new URLSearchParams({
        student_id: studentId,
        section_course_id: sectionCourseId
      });
      
      const response = await fetch(`${API_BASE_URL}/assessments/dean-analytics/sample?${params.toString()}`, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data && result.data.length > 0) {
          setClassFilteredData(result.data[0]); // Get the student's data for this class
          console.log('✅ [DEAN ANALYTICS] Loaded class-specific analytics');
        } else {
          setClassFilteredData(null);
        }
      } else {
        setClassFilteredData(null);
      }
    } catch (error) {
      console.error('❌ [DEAN ANALYTICS] Error loading class analytics:', error);
      setClassFilteredData(null);
    } finally {
      setLoadingClassData(false);
    }
  }, []);

  // Handle class filter change
  const handleClassFilterChange = useCallback((sectionCourseId) => {
    setSelectedClassId(sectionCourseId);
    if (sectionCourseId === 'all') {
      setClassFilteredData(null);
    } else if (selectedStudent) {
      fetchClassAnalytics(selectedStudent.student_id, sectionCourseId);
    }
  }, [selectedStudent, fetchClassAnalytics]);

  // Reset filter when modal opens/closes
  useEffect(() => {
    if (isModalOpen && selectedStudent) {
      fetchStudentEnrollments(selectedStudent.student_id);
      setSelectedClassId('all');
      setClassFilteredData(null);
    } else {
      setStudentEnrollments([]);
      setSelectedClassId('all');
      setClassFilteredData(null);
    }
  }, [isModalOpen, selectedStudent, fetchStudentEnrollments]);

  const handleFetch = useCallback((forceRefresh = false) => {
    console.log('🔍 [DEAN ANALYTICS] Starting fetch...', forceRefresh ? '(FORCE REFRESH)' : '');
    
    // Build cache key with all filters for better cache management
    const filterKey = [
      selectedTermId || 'all',
      selectedSectionId || 'all',
      selectedProgramId || 'all',
      selectedDepartmentId || 'all'
    ].join('_');
    
    // If force refresh, clear all caches first
    if (forceRefresh) {
      console.log('🔄 [DEAN ANALYTICS] Force refresh - clearing caches...');
    const sessionCacheKey = `dean_analytics_${filterKey}_session`;
      const cacheKey = `dean_analytics_${filterKey}`;
      
      // Clear sessionStorage cache
      try {
        sessionStorage.removeItem(sessionCacheKey);
        console.log('✅ [DEAN ANALYTICS] Cleared sessionStorage cache');
      } catch (e) {
        console.warn('⚠️ [DEAN ANALYTICS] Could not clear sessionStorage:', e);
      }
      
      // Clear enhanced cache
      try {
        deanCacheService.clear('analytics', cacheKey);
        console.log('✅ [DEAN ANALYTICS] Cleared enhanced cache');
      } catch (e) {
        console.warn('⚠️ [DEAN ANALYTICS] Could not clear enhanced cache:', e);
      }
      
      // Reset charts loaded state
      setChartsLoaded(false);
    }
    
    // Check sessionStorage first for instant display (skip if force refresh)
    const sessionCacheKey = `dean_analytics_${filterKey}_session`;
    const sessionCached = forceRefresh ? null : safeGetItem(sessionCacheKey);
    
    if (sessionCached && sessionCached.success) {
      console.log('📦 [DEAN ANALYTICS] Using session cached analytics data');
      setData(sessionCached.data || []);
      setClusterMeta(sessionCached.clustering || { enabled: false });
      setHasFetched(true);
      setLoading(false);
      setProgress(100);
      if (setErrorRef.current) setErrorRef.current(null);
      // Load charts after a short delay for better UX
      setTimeout(() => setChartsLoaded(true), 100);
      // Continue to fetch fresh data in background
    } else {
      setLoading(true);
      setProgress(0);
    }
    
    // Check enhanced cache (skip if force refresh)
    const cacheKey = `dean_analytics_${filterKey}`;
    const cachedData = forceRefresh ? null : getCachedData('analytics', cacheKey, 10 * 60 * 1000); // 10 minute cache
    if (cachedData && cachedData.success && !sessionCached) {
      console.log('📦 [DEAN ANALYTICS] Using enhanced cached analytics data');
      setData(cachedData.data || []);
      setClusterMeta(cachedData.clustering || { enabled: false });
      setHasFetched(true);
      setLoading(false);
      setProgress(100);
      if (setErrorRef.current) setErrorRef.current(null);
      // Cache in sessionStorage for next time
      safeSetItem(sessionCacheKey, cachedData);
      // Load charts after a short delay
      setTimeout(() => setChartsLoaded(true), 100);
      // Continue to fetch fresh data in background
    }
    
    // Cancel previous request if still pending
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    // Create new abort controller
    abortControllerRef.current = new AbortController();
    
    // Only show loading if no cache available
    const hasCache = sessionCached || (cachedData && cachedData.success);
    if (!hasCache) {
      setLoading(true);
      setProgress(0);
      
      // Simulate progress updates (only if not using cache)
      progressIntervalRef.current = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) {
            if (progressIntervalRef.current) {
              clearInterval(progressIntervalRef.current);
              progressIntervalRef.current = null;
            }
            return 90;
          }
          return prev + 10;
        });
      }, 300);
    }
    if (setErrorRef.current) setErrorRef.current(null);

    // Build URL with filters
    const params = new URLSearchParams();
    if (selectedTermId) params.append('term_id', selectedTermId);
    if (selectedSectionId) params.append('section_id', selectedSectionId);
    if (selectedProgramId) params.append('program_id', selectedProgramId);
    if (selectedDepartmentId) params.append('department_id', selectedDepartmentId);
    // Add force_refresh parameter to bypass backend cache and recompute clusters
    if (forceRefresh) {
      params.append('force_refresh', 'true');
      console.log('🔄 [DEAN ANALYTICS] Adding force_refresh parameter to API call');
    }
    const url = `${API_BASE_URL}/assessments/dean-analytics/sample${params.toString() ? '?' + params.toString() : ''}`;
    
    fetch(url, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      signal: abortControllerRef.current.signal
    })
      .then(async (res) => {
        console.log('📡 [Analytics] Response status:', res.status);
        setProgress(95);
        
        // Clone response before consuming to allow error handling
        const clonedRes = res.clone();
        
        // Check if response is OK (200-299)
        if (!res.ok) {
          // Try to parse as JSON first, but fallback to text for HTML error pages
          let errorData;
          const contentType = res.headers.get('content-type');
          try {
            if (contentType && contentType.includes('application/json')) {
              errorData = await res.json();
            } else {
              const errorText = await res.text();
              console.error('❌ [Analytics] Non-JSON error response:', errorText.substring(0, 200));
              errorData = { 
                success: false, 
                error: `Server error (${res.status}): ${res.status === 502 ? 'Backend service unavailable. The server may be down or the request timed out.' : errorText.substring(0, 100)}`
              };
            }
          } catch (parseError) {
            console.error('❌ [Analytics] Failed to parse error response:', parseError);
            // Try to read from cloned response
            try {
              const errorText = await clonedRes.text();
              console.error('❌ [Analytics] Error response text (first 500 chars):', errorText.substring(0, 500));
            } catch (e) {
              console.error('❌ [Analytics] Could not read error response:', e);
            }
            errorData = { 
              success: false, 
              error: `Server error (${res.status}): ${res.status === 502 ? 'Backend service unavailable or request timed out.' : 'Unable to parse error response'}`
            };
          }
          throw new Error(errorData.error || `HTTP ${res.status}: ${res.statusText}`);
        }
        
        // Clone again for error handling in JSON parsing
        const jsonClonedRes = res.clone();
        try {
          return await res.json();
        } catch (jsonError) {
          console.error('❌ [Analytics] Error parsing JSON:', jsonError);
          // Try to read response as text to see what we got
          try {
            const responseText = await jsonClonedRes.text();
            console.error('❌ [Analytics] Response text (first 1000 chars):', responseText.substring(0, 1000));
            // Check if response looks truncated
            if (responseText.length > 1000 && !responseText.endsWith('}') && !responseText.endsWith(']')) {
              console.error('❌ [Analytics] Response appears to be truncated!');
            }
          } catch (e) {
            console.error('❌ [Analytics] Could not read response as text:', e);
          }
          throw jsonError;
        }
      })
      .then((json) => {
        console.log('✅ [DEAN ANALYTICS] Received data:', json);
        console.log('🎯 [DEAN ANALYTICS] Clustering enabled:', json.clustering?.enabled);
        console.log('📊 [DEAN ANALYTICS] Sample data:', json.data?.slice(0, 3));
        
        if (json.success) {
          const studentsData = json.data || [];
          
          // Check if clustering data is present
          const studentsWithClusters = studentsData.filter(s => {
            const cluster = s.cluster_label;
            return cluster && 
                   cluster !== null && 
                   cluster !== undefined &&
                   !(typeof cluster === 'number' && isNaN(cluster)) &&
                   !(typeof cluster === 'string' && (cluster.toLowerCase() === 'nan' || cluster.trim() === ''));
          });
          
          console.log(`📊 [DEAN ANALYTICS] Students with clusters: ${studentsWithClusters.length}/${studentsData.length}`);
          
          if (studentsWithClusters.length === 0 && studentsData.length > 0) {
            const clusteringMeta = json.clustering || {};
            const errorMessage = clusteringMeta.error || 
              (clusteringMeta.enabled && !clusteringMeta.cached && clusteringMeta.silhouetteScore === null 
                ? 'Clustering API was called but returned no cluster labels. Check backend logs for details.' 
                : 'Clustering may not be working. Check CLUSTER_SERVICE_URL configuration.');
            
            console.error('❌ [DEAN ANALYTICS] No students have cluster labels!');
            console.error('❌ [DEAN ANALYTICS] Error:', errorMessage);
            console.error('❌ [DEAN ANALYTICS] Clustering meta:', JSON.stringify(clusteringMeta, null, 2));
            console.error('❌ [DEAN ANALYTICS] Sample student data:', JSON.stringify(studentsData[0], null, 2));
            console.error('❌ [DEAN ANALYTICS] Diagnostic steps:');
            console.error('   1. Check backend logs for clustering errors');
            console.error('   2. Verify CLUSTER_SERVICE_URL is set correctly');
            console.error('   3. Test clustering service: GET /api/assessments/clustering/health');
            console.error('   4. Check Python API logs on Railway');
            
            // Set error state for UI display
            if (setErrorRef.current) {
              try {
                setErrorRef.current(`Clustering failed: ${errorMessage}. Check console for details.`);
              } catch (e) {
                console.warn('⚠️ [DEAN ANALYTICS] Could not set error state');
              }
            }
          }
          
          setData(studentsData);
          setClusterMeta(json.clustering || { enabled: false });
          
          // Build cache key with all filters
          const filterKey = [
            selectedTermId || 'all',
            selectedSectionId || 'all',
            selectedProgramId || 'all',
            selectedDepartmentId || 'all'
          ].join('_');
          
          // Store in sessionStorage for instant next load
          const sessionCacheKey = `dean_analytics_${filterKey}_session`;
          safeSetItem(sessionCacheKey, json);
          
          // Store full data in enhanced cache
          const cacheKey = `dean_analytics_${filterKey}`;
          setCachedData('analytics', cacheKey, json);
          
          // Load charts after data is loaded
          setTimeout(() => setChartsLoaded(true), 200);
          
          // Log cluster distribution with detailed logging (only count valid clusters)
          const clusterCounts = studentsData.reduce((acc, row) => {
            let cluster = row.cluster_label;
            // Only count valid cluster labels (skip null/undefined/invalid)
            if (cluster && 
                cluster !== null && 
                cluster !== undefined &&
                !(typeof cluster === 'number' && isNaN(cluster)) &&
                !(typeof cluster === 'string' && (cluster.toLowerCase() === 'nan' || cluster.trim() === ''))) {
            acc[cluster] = (acc[cluster] || 0) + 1;
            }
            return acc;
          }, {});
          console.log('📈 [DEAN ANALYTICS] Cluster distribution:', clusterCounts);
          console.log('🔍 [DEAN ANALYTICS] Sample row with cluster:', studentsData[0]);
          console.log('🔍 [DEAN ANALYTICS] Clustering enabled status:', json.clustering?.enabled);
          console.log('🔍 [DEAN ANALYTICS] Backend platform:', json.clustering?.backendPlatform);
          console.log('🔍 [DEAN ANALYTICS] Clustering API platform:', json.clustering?.apiPlatform);
        } else {
          if (setErrorRef.current) {
            try {
              setErrorRef.current('Failed to load analytics');
            } catch (e) {
              console.warn('⚠️ [DEAN ANALYTICS] Could not set error state');
            }
          }
        }
        
        if (progressIntervalRef.current) {
          clearInterval(progressIntervalRef.current);
          progressIntervalRef.current = null;
        }
        setProgress(100);
        setTimeout(() => setLoading(false), 500);
        setHasFetched(true);
        setChartsLoaded(false); // Reset charts loaded state
        try {
          trackEvent('dean_analytics_loaded', {
            success: Boolean(json.success),
            count: Array.isArray(json.data) ? json.data.length : 0,
            clustering_enabled: Boolean(json?.clustering?.enabled),
            platform: json?.clustering?.platform || 'Unknown',
          });
        } catch {}
      })
      .catch((err) => {
        if (progressIntervalRef.current) {
          clearInterval(progressIntervalRef.current);
          progressIntervalRef.current = null;
        }
        
        if (err.name === 'AbortError') {
          console.log('🚫 [DEAN ANALYTICS] Request was aborted');
          return;
        }
        
        console.error('❌ [DEAN ANALYTICS] Fetch error:', err);
        // Display more specific error messages
        const errorMessage = err?.message || 'Unable to fetch analytics';
        const sessionCached = safeGetItem(`dean_analytics_${selectedTermId || 'all'}_session`);
        const cachedData = getCachedData('analytics', `dean_analytics_${selectedTermId || 'all'}`, 10 * 60 * 1000);
        if (!sessionCached && !cachedData && setErrorRef.current) {
          try {
            setErrorRef.current(errorMessage.includes('502') || errorMessage.includes('timeout') 
              ? 'Backend service is unavailable or the request timed out. Please try again in a moment.'
              : errorMessage);
          } catch (e) {
            console.warn('⚠️ [DEAN ANALYTICS] Could not set error state (component may have unmounted)');
          }
        }
        setProgress(0);
        setLoading(false);
        setHasFetched(true);
        setChartsLoaded(false);
        try {
          trackEvent('dean_analytics_error', { message: String(err?.message || err) });
        } catch {}
      });
  }, [selectedTermId, selectedSectionId, selectedProgramId, selectedDepartmentId]);

  const getClusterStyle = (label) => {
    // Return null if no valid cluster label (don't show "Not Clustered" fallback)
    if (!label || 
        label === null || 
        label === undefined ||
        (typeof label === 'number' && isNaN(label)) ||
        (typeof label === 'string' && (label.toLowerCase() === 'nan' || label.trim() === ''))) {
      return null; // Return null instead of fallback text
    }

    const normalized = String(label).toLowerCase();

    // At Risk - Red
    if (normalized.includes('risk') || normalized.includes('at risk')) {
      return { text: label, className: 'bg-red-100 text-red-700' };
    }

    // Needs Improvement/Needs Guidance - Orange/Yellow
    if (normalized.includes('improvement') || normalized.includes('guidance') || normalized.includes('needs')) {
      return { text: label, className: 'bg-orange-100 text-orange-700' };
    }

    // Excellent Performance - Green
    if (normalized.includes('excellent') || normalized.includes('high') || normalized.includes('performance')) {
      return { text: label, className: 'bg-emerald-100 text-emerald-700' };
    }

    // On Track/Performing Well - Blue
    if (normalized.includes('track') || normalized.includes('performing') || normalized.includes('on track')) {
      return { text: label, className: 'bg-blue-100 text-blue-700' };
    }

    // Default - Gray
    return { text: label, className: 'bg-gray-100 text-gray-600' };
  };

  // Get unique clusters from data (only valid clusters, no fallback)
  const uniqueClusters = useMemo(() => {
    const clusters = new Set();
    data.forEach(row => {
      const cluster = row.cluster_label;
      // Only add valid cluster labels (skip null/undefined/invalid)
      if (cluster && 
          cluster !== null && 
          cluster !== undefined &&
          !(typeof cluster === 'number' && isNaN(cluster)) &&
          !(typeof cluster === 'string' && (cluster.toLowerCase() === 'nan' || cluster.trim() === ''))) {
      clusters.add(cluster);
      }
    });
    return Array.from(clusters).sort();
  }, [data]);

  // Filter data based on search and selected cluster
  const filteredData = useMemo(() => {
    let filtered = data;

    // Filter by cluster
    if (selectedCluster !== 'all') {
      filtered = filtered.filter(row => {
        const cluster = row.cluster_label;
        // Only match valid cluster labels
        if (!cluster || 
            cluster === null || 
            cluster === undefined ||
            (typeof cluster === 'number' && isNaN(cluster)) ||
            (typeof cluster === 'string' && (cluster.toLowerCase() === 'nan' || cluster.trim() === ''))) {
          return false; // Exclude students without valid clusters
        }
        return cluster === selectedCluster;
      });
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(row =>
        (row.full_name || '').toLowerCase().includes(query) ||
        (row.student_number || '').toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [data, selectedCluster, searchQuery]);

  // Paginated data
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredData.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredData, currentPage]);

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCluster, searchQuery, selectedTermId, selectedSectionId, selectedProgramId, selectedDepartmentId]);

  // Calculate statistics
  const stats = useMemo(() => {
    if (filteredData.length === 0) return null;
    
    const total = filteredData.length;
    const avgAttendance = filteredData.reduce((sum, row) => sum + (parseFloat(row.attendance_percentage) || 0), 0) / total;
    const avgScore = filteredData.reduce((sum, row) => sum + (parseFloat(row.average_score) || 0), 0) / total;
    const avgSubmissionRate = filteredData.reduce((sum, row) => {
      const rate = parseFloat(row.submission_rate) || 0;
      return sum + rate;
    }, 0) / total * 100; // Convert to percentage
    
    return {
      total,
      avgAttendance: avgAttendance.toFixed(2),
      avgScore: avgScore.toFixed(2),
      avgSubmissionRate: avgSubmissionRate.toFixed(1)
    };
  }, [filteredData]);

  // Prepare chart data
  const chartData = useMemo(() => {
    if (filteredData.length === 0) return null;

    // Cluster distribution for pie chart (only valid clusters)
    const clusterDistribution = {};
    filteredData.forEach(row => {
      const cluster = row.cluster_label;
      // Only count valid cluster labels
      if (cluster && 
          cluster !== null && 
          cluster !== undefined &&
          !(typeof cluster === 'number' && isNaN(cluster)) &&
          !(typeof cluster === 'string' && (cluster.toLowerCase() === 'nan' || cluster.trim() === ''))) {
      clusterDistribution[cluster] = (clusterDistribution[cluster] || 0) + 1;
      }
    });

    const clusterData = Object.entries(clusterDistribution).map(([name, value]) => ({
      name,
      value
    }));

    // Attendance distribution (bins: 0-20, 21-40, 41-60, 61-80, 81-100)
    const attendanceBins = {
      '0-20%': 0,
      '21-40%': 0,
      '41-60%': 0,
      '61-80%': 0,
      '81-100%': 0
    };
    filteredData.forEach(row => {
      const attendance = parseFloat(row.attendance_percentage) || 0;
      if (attendance <= 20) attendanceBins['0-20%']++;
      else if (attendance <= 40) attendanceBins['21-40%']++;
      else if (attendance <= 60) attendanceBins['41-60%']++;
      else if (attendance <= 80) attendanceBins['61-80%']++;
      else attendanceBins['81-100%']++;
    });

    const attendanceData = Object.entries(attendanceBins).map(([name, value]) => ({
      name,
      students: value
    }));

    // Score distribution (bins: 0-20, 21-40, 41-60, 61-80, 81-100)
    const scoreBins = {
      '0-20': 0,
      '21-40': 0,
      '41-60': 0,
      '61-80': 0,
      '81-100': 0
    };
    filteredData.forEach(row => {
      const score = parseFloat(row.average_score) || 0;
      if (score <= 20) scoreBins['0-20']++;
      else if (score <= 40) scoreBins['21-40']++;
      else if (score <= 60) scoreBins['41-60']++;
      else if (score <= 80) scoreBins['61-80']++;
      else scoreBins['81-100']++;
    });

    const scoreData = Object.entries(scoreBins).map(([name, value]) => ({
      name,
      students: value
    }));

    // Submission rate distribution
    const submissionBins = {
      '0-20%': 0,
      '21-40%': 0,
      '41-60%': 0,
      '61-80%': 0,
      '81-100%': 0
    };
    filteredData.forEach(row => {
      const rate = (parseFloat(row.submission_rate) || 0) * 100; // Convert to percentage
      if (rate <= 20) submissionBins['0-20%']++;
      else if (rate <= 40) submissionBins['21-40%']++;
      else if (rate <= 60) submissionBins['41-60%']++;
      else if (rate <= 80) submissionBins['61-80%']++;
      else submissionBins['81-100%']++;
    });

    const submissionData = Object.entries(submissionBins).map(([name, value]) => ({
      name,
      students: value
    }));

    // Scatter plot data: Attendance vs Score, colored by cluster (only include rows with valid clusters)
    const scatterData = filteredData
      .filter(row => row.cluster_label && 
        row.cluster_label !== null && 
        row.cluster_label !== undefined &&
        !(typeof row.cluster_label === 'number' && isNaN(row.cluster_label)) &&
        !(typeof row.cluster_label === 'string' && (row.cluster_label.toLowerCase() === 'nan' || row.cluster_label.trim() === '')))
      .map(row => ({
      attendance: parseFloat(row.attendance_percentage) || 0,
      score: parseFloat(row.average_score) || 0,
      submissionRate: (parseFloat(row.submission_rate) || 0) * 100,
        cluster: row.cluster_label,
      name: row.full_name
    }));

    return {
      clusterData,
      attendanceData,
      scoreData,
      submissionData,
      scatterData
    };
  }, [filteredData]);

  // Color palette for charts
  const COLORS = {
    pie: ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#6b7280'],
    bar: '#3b82f6',
    barSecondary: '#10b981'
  };

  return (
    <>
      <style>{`
        select {
          appearance: none !important;
          background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e") !important;
          background-position: right 8px center !important;
          background-repeat: no-repeat !important;
          background-size: 16px !important;
          padding-right: 40px !important;
          cursor: pointer !important;
        }
      `}</style>
      <div className="p-4 overflow-y-auto h-full">
        {/* Header with Refresh Button - Always Visible */}
          <div className="mb-4 flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-gray-900">Dean Analytics Dashboard</h1>
              {clusterMeta?.silhouetteScore !== null && clusterMeta?.silhouetteScore !== undefined && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm"
                  style={{
                    backgroundColor: clusterMeta.silhouetteScore > 0.5 
                      ? '#f0fdf4' 
                      : clusterMeta.silhouetteScore > 0.3 
                        ? '#f0fdf4' 
                        : clusterMeta.silhouetteScore > 0.1 
                          ? '#fefce8' 
                          : '#fef2f2',
                    borderColor: clusterMeta.silhouetteScore > 0.5 
                      ? '#86efac' 
                      : clusterMeta.silhouetteScore > 0.3 
                        ? '#86efac' 
                        : clusterMeta.silhouetteScore > 0.1 
                          ? '#fde047' 
                          : '#fca5a5',
                    color: clusterMeta.silhouetteScore > 0.5 
                      ? '#166534' 
                      : clusterMeta.silhouetteScore > 0.3 
                        ? '#166534' 
                        : clusterMeta.silhouetteScore > 0.1 
                          ? '#854d0e' 
                          : '#991b1b'
                  }}
                  title={`Clustering Accuracy: ${clusterMeta.silhouetteScore > 0.5 ? 'Excellent' : clusterMeta.silhouetteScore > 0.3 ? 'Good' : clusterMeta.silhouetteScore > 0.1 ? 'Fair' : 'Poor'} (${clusterMeta.silhouetteScore.toFixed(4)}). Range: -1 to 1, higher is better.`}
                >
                  <span className="font-semibold">Accuracy:</span>
                  <span className="font-bold">{clusterMeta.silhouetteScore.toFixed(3)}</span>
                  <span className="text-xs opacity-75">
                    ({clusterMeta.silhouetteScore > 0.5 ? 'Excellent' : clusterMeta.silhouetteScore > 0.3 ? 'Good' : clusterMeta.silhouetteScore > 0.1 ? 'Fair' : 'Poor'})
                  </span>
                </div>
              )}
            </div>
            <button
              onClick={() => handleFetch(true)}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-sm font-medium shadow-sm"
              title="Refresh data and recompute clusters from latest dataset"
            >
              <ArrowPathIcon className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh & Recompute Clusters
            </button>
          </div>

        {/* Progress Bar */}
        {loading && (
          <div className="mb-4 bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Loading analytics...</span>
              <span className="text-sm font-semibold text-red-600">{progress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
              <div
                className="bg-red-600 h-2.5 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Error Message */}
        {hasFetched && error && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        {/* Skeleton Loading */}
        {loading && !hasFetched && (
          <div className="flex gap-4">
            {/* Main Content Area - Left Side */}
            <div className="flex-1 space-y-4">
              {/* Filters Skeleton */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 animate-pulse">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1 h-10 bg-gray-200 rounded-lg"></div>
                  <div className="md:w-64 h-10 bg-gray-200 rounded-lg"></div>
                  <div className="md:w-64 h-10 bg-gray-200 rounded-lg"></div>
                  <div className="md:w-64 h-10 bg-gray-200 rounded-lg"></div>
                  <div className="md:w-64 h-10 bg-gray-200 rounded-lg"></div>
                </div>
              </div>
              
              {/* Table Skeleton */}
              <AnalyticsTableSkeleton />
            </div>

            {/* Right Sidebar - Statistics and Charts Skeleton */}
            <div className="w-72 space-y-3">
              <StatisticsCardsSkeleton />
              <ChartsSkeleton />
            </div>
          </div>
        )}

        {/* Main Content */}
        {hasFetched && !loading && !error && (
          <div className="flex gap-4">
            {/* Main Content Area - Left Side */}
            <div className="flex-1 space-y-4 min-w-0">
              {/* Filters */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3">
                <div className="flex flex-col md:flex-row gap-3">
                  {/* Search */}
                  <div className="flex-1">
                    <div className="relative">
                      <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search by student name..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
                      />
                    </div>
                  </div>

                  {/* School Term Filter */}
                  <div className="md:w-56">
                    <div className="relative">
                      <FunnelIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <select
                        value={selectedTermId}
                        onChange={(e) => setSelectedTermId(e.target.value)}
                        className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none appearance-none bg-white cursor-pointer text-sm"
                      >
                        <option value="">All Terms</option>
                        {schoolTerms.map(term => (
                          <option key={term.term_id} value={term.term_id.toString()}>
                            {term.school_year} - {term.semester}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Department Filter */}
                  <div className="md:w-56">
                    <div className="relative">
                      <FunnelIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <select
                        value={selectedDepartmentId}
                        onChange={(e) => setSelectedDepartmentId(e.target.value)}
                        className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none appearance-none bg-white cursor-pointer text-sm"
                      >
                        <option value="">All Departments</option>
                        {departments.map(dept => (
                          <option key={dept.department_id} value={dept.department_id.toString()}>
                            {dept.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Program Filter */}
                  <div className="md:w-56">
                    <div className="relative">
                      <FunnelIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <select
                        value={selectedProgramId}
                        onChange={(e) => setSelectedProgramId(e.target.value)}
                        className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none appearance-none bg-white cursor-pointer text-sm"
                      >
                        <option value="">All Programs</option>
                        {programs
                          .filter(p => !selectedDepartmentId || p.department_id?.toString() === selectedDepartmentId)
                          .map(program => (
                            <option key={program.program_id} value={program.program_id.toString()}>
                              {program.name}
                            </option>
                          ))}
                      </select>
                    </div>
                  </div>

                  {/* Section Filter */}
                  <div className="md:w-56">
                    <div className="relative">
                      <FunnelIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <select
                        value={selectedSectionId}
                        onChange={(e) => setSelectedSectionId(e.target.value)}
                        className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none appearance-none bg-white cursor-pointer text-sm"
                      >
                        <option value="">All Sections</option>
                        {sections
                          .filter(s => !selectedProgramId || s.program_id?.toString() === selectedProgramId)
                          .map(section => (
                            <option key={section.section_id} value={section.section_id.toString()}>
                              {section.section_code}
                            </option>
                          ))}
                      </select>
                    </div>
                  </div>

                  {/* Cluster Filter */}
                  {uniqueClusters.length > 0 && (
                    <div className="md:w-56">
                      <div className="relative">
                        <FunnelIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <select
                          value={selectedCluster}
                          onChange={(e) => setSelectedCluster(e.target.value)}
                          className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none appearance-none bg-white cursor-pointer"
                        >
                          <option value="all">All Clusters ({data.length})</option>
                          {uniqueClusters.map(cluster => (
                            <option key={cluster} value={cluster}>
                              {cluster} ({data.filter(d => d.cluster_label === cluster).length})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}
                </div>

                {/* Filter Results Count */}
                {(filteredData.length !== data.length || selectedTermId || selectedSectionId || selectedProgramId || selectedDepartmentId) && (
                  <p className="mt-3 text-sm text-gray-600">
                    Showing {filteredData.length} of {data.length} students
                    {(() => {
                      const filters = [];
                      if (selectedTermId) {
                        const term = schoolTerms.find(t => t.term_id.toString() === selectedTermId);
                        if (term) filters.push(`${term.school_year} - ${term.semester}`);
                      }
                      if (selectedDepartmentId) {
                        const dept = departments.find(d => d.department_id.toString() === selectedDepartmentId);
                        if (dept) filters.push(`Dept: ${dept.name}`);
                      }
                      if (selectedProgramId) {
                        const prog = programs.find(p => p.program_id.toString() === selectedProgramId);
                        if (prog) filters.push(`Program: ${prog.name}`);
                      }
                      if (selectedSectionId) {
                        const sec = sections.find(s => s.section_id.toString() === selectedSectionId);
                        if (sec) filters.push(`Section: ${sec.section_code}`);
                      }
                      return filters.length > 0 ? ` (${filters.join(', ')})` : '';
                    })()}
                  </p>
                )}
              </div>

              {/* Data Table */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="max-h-[calc(100vh-250px)] overflow-y-auto">
                  {filteredData.length === 0 ? (
                    <div className="flex items-center justify-center py-16">
                      <div className="text-center">
                        <ChartBarIcon className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No data found</h3>
                        <p className="text-gray-500">Try adjusting your filters or search query.</p>
                      </div>
                    </div>
                  ) : (
                    <table className="min-w-full bg-white text-sm">
                      <thead className="bg-gray-50 sticky top-0 z-10">
                        <tr>
                          <th className="px-3 py-2 text-left font-semibold text-gray-700 border-b border-gray-200 text-xs">Student Name</th>
                          <th className="px-3 py-2 text-left font-semibold text-gray-700 border-b border-gray-200 text-xs">Section</th>
                          <th className="px-3 py-2 text-left font-semibold text-gray-700 border-b border-gray-200 text-xs">Program</th>
                          <th className="px-3 py-2 text-left font-semibold text-gray-700 border-b border-gray-200 text-xs">Department</th>
                          <th className="px-3 py-2 text-left font-semibold text-gray-700 border-b border-gray-200 text-xs">Attendance</th>
                          <th className="px-3 py-2 text-left font-semibold text-gray-700 border-b border-gray-200 text-xs">Score</th>
                          <th className="px-3 py-2 text-left font-semibold text-gray-700 border-b border-gray-200 text-xs">Submissions</th>
                          <th className="px-3 py-2 text-left font-semibold text-gray-700 border-b border-gray-200 text-xs">Cluster</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {paginatedData.map((row) => {
                          const clusterStyle = getClusterStyle(row.cluster_label);

                          return (
                            <tr 
                              key={row.student_id} 
                              className="hover:bg-gray-50 transition-colors cursor-pointer"
                              onClick={() => {
                                setSelectedStudent(row);
                                setIsModalOpen(true);
                                // Load photo only when modal opens
                                loadStudentPhoto(row.student_id);
                              }}
                            >
                              <td className="px-3 py-2 whitespace-nowrap font-medium text-gray-900 text-xs">{row.full_name}</td>
                              <td className="px-3 py-2 whitespace-nowrap text-gray-600 text-xs">
                                {row.section_code || 'N/A'}
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap text-gray-600 text-xs">
                                {row.program_abbreviation || row.program_name || 'N/A'}
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap text-gray-600 text-xs">
                                {row.department_abbreviation || row.department_name || 'N/A'}
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap text-gray-600">
                                <div className="text-xs">
                                  <div>{row.attendance_percentage !== null && row.attendance_percentage !== undefined 
                                    ? `${parseFloat(row.attendance_percentage).toFixed(1)}%` 
                                    : 'N/A'}</div>
                                  {row.attendance_present_count !== null && row.attendance_total_sessions !== null && (
                                    <div className="text-gray-500 text-xs">
                                      {row.attendance_present_count}/{row.attendance_total_sessions} present
                                    </div>
                                  )}
                                </div>
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap text-gray-600 text-xs">
                                {row.average_score !== null && row.average_score !== undefined 
                                  ? parseFloat(row.average_score).toFixed(1) 
                                  : 'N/A'}
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap text-gray-600">
                                <div className="text-xs">
                                  <div>{row.submission_rate !== null && row.submission_rate !== undefined 
                                    ? `${(parseFloat(row.submission_rate) * 100).toFixed(1)}%` 
                                    : 'N/A'}</div>
                                  {row.submission_ontime_count !== null && row.submission_total_assessments !== null && (
                                    <div className="text-gray-500 text-xs">
                                      {row.submission_ontime_count} ontime, {row.submission_late_count || 0} late, {row.submission_missing_count || 0} missing
                                    </div>
                                  )}
                                </div>
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap">
                                {clusterStyle ? (
                                <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${clusterStyle.className}`}>
                                  {clusterStyle.text}
                                </span>
                                ) : (
                                  <span className="text-gray-400 text-xs">—</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                  
                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="bg-gray-50 px-4 py-3 border-t border-gray-200 flex items-center justify-between">
                      <div className="text-sm text-gray-700">
                        Showing <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> to{' '}
                        <span className="font-medium">
                          {Math.min(currentPage * itemsPerPage, filteredData.length)}
                        </span>{' '}
                        of <span className="font-medium">{filteredData.length}</span> results
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                          disabled={currentPage === 1}
                          className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Previous
                        </button>
                        <span className="px-3 py-1 text-sm text-gray-700">
                          Page {currentPage} of {totalPages}
                        </span>
                        <button
                          onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                          disabled={currentPage === totalPages}
                          className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Sidebar - Statistics and Charts */}
            <div className="w-72 flex-shrink-0 space-y-3 overflow-y-auto max-h-[calc(100vh-80px)]">
              {/* Statistics Cards */}
              {loading && !stats ? (
                <StatisticsCardsSkeleton />
              ) : stats && (
                <div className="space-y-2">
                  <div className="bg-gradient-to-br from-gray-50 to-white rounded-lg shadow-sm border border-gray-200 p-3">
                    <p className="text-xs text-gray-500 mb-1">Total Students</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                  </div>
                  <div className="bg-gradient-to-br from-blue-50 to-white rounded-lg shadow-sm border border-blue-200 p-3">
                    <p className="text-xs text-blue-600 mb-1">Avg Attendance</p>
                    <p className="text-2xl font-bold text-blue-600">{stats.avgAttendance}%</p>
                  </div>
                  <div className="bg-gradient-to-br from-emerald-50 to-white rounded-lg shadow-sm border border-emerald-200 p-3">
                    <p className="text-xs text-emerald-600 mb-1">Avg Score</p>
                    <p className="text-2xl font-bold text-emerald-600">{stats.avgScore}</p>
                  </div>
                  <div className="bg-gradient-to-br from-purple-50 to-white rounded-lg shadow-sm border border-purple-200 p-3">
                    <p className="text-xs text-purple-600 mb-1">Avg Submission Rate</p>
                    <p className="text-2xl font-bold text-purple-600">{stats.avgSubmissionRate}%</p>
                  </div>
                </div>
              )}

              {/* Charts Section - Lazy Load */}
              {!chartsLoaded && (
                <ChartsSkeleton />
              )}
              {chartData && chartsLoaded && (
                <div className="space-y-3">
                  {/* Cluster Distribution Pie Chart */}
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3">
                    <h3 className="text-xs font-semibold text-gray-900 mb-2">Cluster Distribution</h3>
                    <ResponsiveContainer width="100%" height={180}>
                      <PieChart>
                        <Pie
                          data={chartData.clusterData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          outerRadius={60}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {chartData.clusterData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS.pie[index % COLORS.pie.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Attendance Distribution Bar Chart */}
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3">
                    <h3 className="text-xs font-semibold text-gray-900 mb-2">Attendance Distribution</h3>
                    <ResponsiveContainer width="100%" height={180}>
                      <BarChart data={chartData.attendanceData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" angle={-45} textAnchor="end" height={60} tick={{ fontSize: 8 }} />
                        <YAxis tick={{ fontSize: 8 }} />
                        <Tooltip />
                        <Bar dataKey="students" fill={COLORS.bar} name="Students" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Score Distribution Bar Chart */}
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3">
                    <h3 className="text-xs font-semibold text-gray-900 mb-2">Average Score Distribution</h3>
                    <ResponsiveContainer width="100%" height={180}>
                      <BarChart data={chartData.scoreData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" angle={-45} textAnchor="end" height={60} tick={{ fontSize: 8 }} />
                        <YAxis tick={{ fontSize: 8 }} />
                        <Tooltip />
                        <Bar dataKey="students" fill={COLORS.barSecondary} name="Students" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Submission Rate Distribution Bar Chart */}
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3">
                    <h3 className="text-xs font-semibold text-gray-900 mb-2">Submission Rate Distribution</h3>
                    <ResponsiveContainer width="100%" height={180}>
                      <BarChart data={chartData.submissionData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" angle={-45} textAnchor="end" height={60} tick={{ fontSize: 8 }} />
                        <YAxis tick={{ fontSize: 8 }} />
                        <Tooltip />
                        <Bar dataKey="students" fill="#8b5cf6" name="Students" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Scatter Plot: Attendance vs Score */}
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3">
                    <h3 className="text-xs font-semibold text-gray-900 mb-2">Attendance vs Score</h3>
                    <ResponsiveContainer width="100%" height={200}>
                      <ScatterChart data={chartData.scatterData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          type="number" 
                          dataKey="attendance" 
                          name="Attendance %" 
                          domain={[0, 100]}
                          label={{ value: 'Attendance %', position: 'insideBottom', offset: -5 }}
                          tick={{ fontSize: 9 }}
                        />
                        <YAxis 
                          type="number" 
                          dataKey="score" 
                          name="Score" 
                          domain={[0, 100]}
                          label={{ value: 'Average Score', angle: -90, position: 'insideLeft' }}
                          tick={{ fontSize: 9 }}
                        />
                        <ZAxis 
                          type="number" 
                          dataKey="submissionRate" 
                          range={[50, 400]}
                          name="Submission Rate %"
                        />
                        <Tooltip 
                          cursor={{ strokeDasharray: '3 3' }}
                          content={({ active, payload }) => {
                            if (active && payload && payload[0]) {
                              const data = payload[0].payload;
                              return (
                                <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
                                  <p className="font-semibold text-gray-900 mb-2">{data.name}</p>
                                  <p className="text-xs text-gray-600">
                                    <span className="font-medium">Attendance:</span> {data.attendance.toFixed(1)}%
                                  </p>
                                  <p className="text-xs text-gray-600">
                                    <span className="font-medium">Score:</span> {data.score.toFixed(1)}
                                  </p>
                                  <p className="text-xs text-gray-600">
                                    <span className="font-medium">Submission Rate:</span> {data.submissionRate.toFixed(1)}%
                                  </p>
                                  <p className="text-xs text-gray-500 mt-1">
                                    <span className="font-medium">Cluster:</span> {data.cluster}
                                  </p>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Legend />
                        <Scatter 
                          name="Students" 
                          data={chartData.scatterData} 
                          fill="#3b82f6"
                          shape={(props) => {
                            const { cx, cy, payload } = props;
                            // Color by cluster
                            const clusterColors = {
                              'Excellent Performance': '#10b981',
                              'On Track': '#3b82f6',
                              'Performing Well': '#3b82f6',
                              'Needs Improvement': '#f59e0b',
                              'Needs Guidance': '#f59e0b',
                              'At Risk': '#ef4444',
                              'Needs Support': '#ef4444'
                            };
                            const color = clusterColors[payload.cluster] || '#9ca3af';
                            return <circle cx={cx} cy={cy} r={5} fill={color} stroke="#fff" strokeWidth={1} />;
                          }}
                        />
                      </ScatterChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Scatter Plot: Submission Rate vs Score */}
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                    <h3 className="text-sm font-semibold text-gray-900 mb-3">Submission Rate vs Score</h3>
                    <ResponsiveContainer width="100%" height={250}>
                      <ScatterChart data={chartData.scatterData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          type="number" 
                          dataKey="submissionRate" 
                          name="Submission Rate %" 
                          domain={[0, 100]}
                          label={{ value: 'Submission Rate %', position: 'insideBottom', offset: -5 }}
                          tick={{ fontSize: 9 }}
                        />
                        <YAxis 
                          type="number" 
                          dataKey="score" 
                          name="Score" 
                          domain={[0, 100]}
                          label={{ value: 'Average Score', angle: -90, position: 'insideLeft' }}
                          tick={{ fontSize: 9 }}
                        />
                        <ZAxis 
                          type="number" 
                          dataKey="attendance" 
                          range={[50, 400]}
                          name="Attendance %"
                        />
                        <Tooltip 
                          cursor={{ strokeDasharray: '3 3' }}
                          content={({ active, payload }) => {
                            if (active && payload && payload[0]) {
                              const data = payload[0].payload;
                              return (
                                <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
                                  <p className="font-semibold text-gray-900 mb-2">{data.name}</p>
                                  <p className="text-xs text-gray-600">
                                    <span className="font-medium">Submission Rate:</span> {data.submissionRate.toFixed(1)}%
                                  </p>
                                  <p className="text-xs text-gray-600">
                                    <span className="font-medium">Score:</span> {data.score.toFixed(1)}
                                  </p>
                                  <p className="text-xs text-gray-600">
                                    <span className="font-medium">Attendance:</span> {data.attendance.toFixed(1)}%
                                  </p>
                                  <p className="text-xs text-gray-500 mt-1">
                                    <span className="font-medium">Cluster:</span> {data.cluster}
                                  </p>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Legend />
                        <Scatter 
                          name="Students" 
                          data={chartData.scatterData} 
                          fill="#10b981"
                          shape={(props) => {
                            const { cx, cy, payload } = props;
                            // Color by cluster
                            const clusterColors = {
                              'Excellent Performance': '#10b981',
                              'On Track': '#3b82f6',
                              'Performing Well': '#3b82f6',
                              'Needs Improvement': '#f59e0b',
                              'Needs Guidance': '#f59e0b',
                              'At Risk': '#ef4444',
                              'Needs Support': '#ef4444'
                            };
                            const color = clusterColors[payload.cluster] || '#9ca3af';
                            return <circle cx={cx} cy={cy} r={5} fill={color} stroke="#fff" strokeWidth={1} />;
                          }}
                        />
                      </ScatterChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Student Details Modal */}
      {isModalOpen && selectedStudent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => {
          setIsModalOpen(false);
          setStudentPhoto(null); // Clear photo when modal closes
        }}>
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 z-10">
              <div className="flex items-center justify-between mb-3">
              <h2 className="text-xl font-bold text-gray-900">Student Details</h2>
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  setStudentPhoto(null); // Clear photo when modal closes
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
              </div>
              
              {/* Class Filter Dropdown */}
              {studentEnrollments.length > 0 && (
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-gray-700">Filter by Class:</label>
                  <div className="relative">
                    <select
                      value={selectedClassId}
                      onChange={(e) => handleClassFilterChange(e.target.value)}
                      disabled={loadingClassData}
                      className="appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2 pr-8 text-sm font-medium text-gray-700 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <option value="all">All Classes</option>
                      {studentEnrollments.map((enrollment) => (
                        <option key={enrollment.section_course_id} value={enrollment.section_course_id}>
                          {enrollment.course_code} - {enrollment.course_title} ({enrollment.section_code})
                        </option>
                      ))}
                    </select>
                    <ChevronDownIcon className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500 pointer-events-none" />
                  </div>
                  {loadingClassData && (
                    <div className="text-xs text-gray-500">Loading...</div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Body */}
            <div className="p-6">
              {(() => {
                // Use filtered data if a class is selected, otherwise use selectedStudent
                const displayData = classFilteredData || selectedStudent;
                
                return (
                  <>
              {/* Student Header Info */}
              <div className="flex items-start gap-6 mb-6 pb-6 border-b border-gray-200">
                {/* Student Image - Lazy Loaded */}
                <div className="flex-shrink-0">
                  {loadingPhoto ? (
                    <div className="w-24 h-24 rounded-full bg-gray-200 animate-pulse flex items-center justify-center">
                      <UserCircleIcon className="w-12 h-12 text-gray-400" />
                    </div>
                  ) : studentPhoto ? (
                    <img
                      src={studentPhoto}
                      alt={selectedStudent.full_name}
                      className="w-24 h-24 rounded-full object-cover border-4 border-gray-200"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'block';
                      }}
                    />
                  ) : null}
                  <UserCircleIcon className={`w-24 h-24 text-gray-300 ${studentPhoto ? 'hidden' : ''}`} />
                </div>

                {/* Student Basic Info */}
                <div className="flex-1">
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">{selectedStudent.full_name}</h3>
                  <div className="space-y-1">
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">SR-code:</span>{' '}
                      <span className="text-gray-900">{selectedStudent.student_number || 'N/A'}</span>
                    </p>
                    {selectedStudent.contact_email && (
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">Email:</span>{' '}
                        <span className="text-gray-900">{selectedStudent.contact_email}</span>
                      </p>
                    )}
                    <div className="mt-2">
                      {(() => {
                        const clusterStyle = getClusterStyle(displayData.cluster_label);
                        return clusterStyle ? (
                          <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${clusterStyle.className}`}>
                            {clusterStyle.text}
                      </span>
                        ) : (
                          <span className="text-gray-400 text-sm">—</span>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              </div>

              {/* Analytics with Progress Bars */}
              <div className="space-y-6">
                <h4 className="text-lg font-semibold text-gray-900">Performance Analytics</h4>

                {/* Attendance Rate */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Attendance Rate</span>
                    <span className="text-sm font-semibold text-gray-900">
                      {displayData.attendance_percentage !== null && displayData.attendance_percentage !== undefined
                        ? `${parseFloat(displayData.attendance_percentage).toFixed(1)}%`
                        : 'N/A'}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                    <div
                      className={`h-3 rounded-full transition-all duration-500 ${
                        (parseFloat(displayData.attendance_percentage) || 0) >= 80
                          ? 'bg-emerald-500'
                          : (parseFloat(displayData.attendance_percentage) || 0) >= 60
                          ? 'bg-blue-500'
                          : (parseFloat(displayData.attendance_percentage) || 0) >= 40
                          ? 'bg-yellow-500'
                          : 'bg-red-500'
                      }`}
                      style={{ width: `${Math.min(parseFloat(displayData.attendance_percentage) || 0, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Average Score */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Average Score</span>
                    <span className="text-sm font-semibold text-gray-900">
                      {displayData.average_score !== null && displayData.average_score !== undefined
                        ? parseFloat(displayData.average_score).toFixed(1)
                        : 'N/A'}
                      {displayData.average_score !== null && displayData.average_score !== undefined && (
                        <span className="text-gray-500 ml-1">/ 100</span>
                      )}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                    <div
                      className={`h-3 rounded-full transition-all duration-500 ${
                        (parseFloat(displayData.average_score) || 0) >= 80
                          ? 'bg-emerald-500'
                          : (parseFloat(displayData.average_score) || 0) >= 60
                          ? 'bg-blue-500'
                          : (parseFloat(displayData.average_score) || 0) >= 40
                          ? 'bg-yellow-500'
                          : 'bg-red-500'
                      }`}
                      style={{ width: `${Math.min(parseFloat(displayData.average_score) || 0, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Submission Rate */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Submission Rate</span>
                    <span className="text-sm font-semibold text-gray-900">
                      {displayData.submission_rate !== null && displayData.submission_rate !== undefined
                        ? `${(parseFloat(displayData.submission_rate) * 100).toFixed(1)}%`
                        : 'N/A'}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                    <div
                      className={`h-3 rounded-full transition-all duration-500 ${
                        (parseFloat(displayData.submission_rate) || 0) * 100 >= 80
                          ? 'bg-emerald-500'
                          : (parseFloat(displayData.submission_rate) || 0) * 100 >= 60
                          ? 'bg-blue-500'
                          : (parseFloat(displayData.submission_rate) || 0) * 100 >= 40
                          ? 'bg-yellow-500'
                          : 'bg-red-500'
                      }`}
                      style={{ width: `${Math.min((parseFloat(displayData.submission_rate) || 0) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Detailed Attendance Information */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h4 className="text-lg font-semibold text-gray-900 mb-4">Detailed Attendance</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                    <p className="text-xs text-green-600 mb-1">Present</p>
                    <p className="text-lg font-bold text-green-700">
                      {displayData.attendance_present_count ?? '—'}
                    </p>
                  </div>
                  <div className="bg-red-50 rounded-lg p-3 border border-red-200">
                    <p className="text-xs text-red-600 mb-1">Absent</p>
                    <p className="text-lg font-bold text-red-700">
                      {displayData.attendance_absent_count ?? '—'}
                    </p>
                  </div>
                  <div className="bg-yellow-50 rounded-lg p-3 border border-yellow-200">
                    <p className="text-xs text-yellow-600 mb-1">Late</p>
                    <p className="text-lg font-bold text-yellow-700">
                      {displayData.attendance_late_count ?? '—'}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                    <p className="text-xs text-gray-600 mb-1">Total Sessions</p>
                    <p className="text-lg font-bold text-gray-700">
                      {displayData.attendance_total_sessions ?? '—'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Detailed Submission Behavior */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h4 className="text-lg font-semibold text-gray-900 mb-4">Detailed Submission Behavior</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                    <p className="text-xs text-green-600 mb-1">Ontime</p>
                    <p className="text-lg font-bold text-green-700">
                      {displayData.submission_ontime_count ?? '—'}
                    </p>
                  </div>
                  <div className="bg-yellow-50 rounded-lg p-3 border border-yellow-200">
                    <p className="text-xs text-yellow-600 mb-1">Late</p>
                    <p className="text-lg font-bold text-yellow-700">
                      {displayData.submission_late_count ?? '—'}
                    </p>
                  </div>
                  <div className="bg-red-50 rounded-lg p-3 border border-red-200">
                    <p className="text-xs text-red-600 mb-1">Missing</p>
                    <p className="text-lg font-bold text-red-700">
                      {displayData.submission_missing_count ?? '—'}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                    <p className="text-xs text-gray-600 mb-1">Total Assessments</p>
                    <p className="text-lg font-bold text-gray-700">
                      {displayData.submission_total_assessments ?? '—'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Section/Program/Department Info */}
              {(displayData.section_code || displayData.program_name || displayData.department_name) && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">Academic Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {displayData.section_code && (
                      <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                        <p className="text-xs text-blue-600 mb-1">Section</p>
                        <p className="text-sm font-medium text-blue-900">{displayData.section_code}</p>
                      </div>
                    )}
                    {displayData.program_name && (
                      <div className="bg-purple-50 rounded-lg p-3 border border-purple-200">
                        <p className="text-xs text-purple-600 mb-1">Program</p>
                        <p className="text-sm font-medium text-purple-900">{displayData.program_name}</p>
                      </div>
                    )}
                    {displayData.department_name && (
                      <div className="bg-indigo-50 rounded-lg p-3 border border-indigo-200">
                        <p className="text-xs text-indigo-600 mb-1">Department</p>
                        <p className="text-sm font-medium text-indigo-900">{displayData.department_name}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Clustering Information */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h4 className="text-lg font-semibold text-gray-900 mb-4">Clustering Information</h4>
                <div className="space-y-3">
                  <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                    <p className="text-xs text-gray-500 mb-1">Cluster Label</p>
                    <p className="text-sm font-medium text-gray-900">
                      {(() => {
                        const clusterStyle = getClusterStyle(displayData.cluster_label);
                        return clusterStyle ? clusterStyle.text : '—';
                      })()}
                    </p>
                  </div>
                  {displayData.silhouette_score !== null && displayData.silhouette_score !== undefined && (
                    <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                      <p className="text-xs text-blue-600 mb-1">Silhouette Score</p>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-blue-900">
                          {parseFloat(displayData.silhouette_score).toFixed(4)}
                        </p>
                        <span className={`text-xs px-2 py-1 rounded ${
                          parseFloat(displayData.silhouette_score) > 0.5 
                            ? 'bg-green-100 text-green-700' 
                            : parseFloat(displayData.silhouette_score) > 0.3
                            ? 'bg-blue-100 text-blue-700'
                            : parseFloat(displayData.silhouette_score) > 0.1
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {parseFloat(displayData.silhouette_score) > 0.5 
                            ? 'Excellent' 
                            : parseFloat(displayData.silhouette_score) > 0.3
                            ? 'Good'
                            : parseFloat(displayData.silhouette_score) > 0.1
                            ? 'Fair'
                            : 'Poor'}
                        </span>
                      </div>
                    </div>
                  )}
                  {displayData.clustering_explanation && (
                    <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                      <p className="text-xs text-gray-500 mb-1">Cluster Explanation</p>
                      <p className="text-sm text-gray-700 leading-relaxed">
                        {displayData.clustering_explanation}
                      </p>
                    </div>
                  )}
                </div>
              </div>
                  </>
                );
              })()}
            </div>

            {/* Modal Footer */}
            <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-end">
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  setStudentPhoto(null); // Clear photo when modal closes
                }}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Analytics;
