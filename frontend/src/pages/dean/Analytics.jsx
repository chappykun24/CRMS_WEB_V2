import React, { useState, useEffect, useMemo } from 'react';
import { ChartBarIcon, FunnelIcon, MagnifyingGlassIcon, XMarkIcon, UserCircleIcon } from '@heroicons/react/24/solid';
import { TableSkeleton } from '../../components/skeletons';
import { trackEvent } from '../../utils/analytics';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
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

  const handleFetch = () => {
    console.log('🔍 [Analytics] Starting fetch...');
    setLoading(true);
    setProgress(0);
    setError(null);
    
    // Simulate progress updates
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90;
        }
        return prev + 10;
      });
    }, 300);

    fetch('/api/assessments/dean-analytics/sample')
      .then(async (res) => {
        console.log('📡 [Analytics] Response status:', res.status);
        setProgress(95);
        
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
            errorData = { 
              success: false, 
              error: `Server error (${res.status}): ${res.status === 502 ? 'Backend service unavailable or request timed out.' : 'Unable to parse error response'}`
            };
          }
          throw new Error(errorData.error || `HTTP ${res.status}: ${res.statusText}`);
        }
        
        return res.json();
      })
      .then((json) => {
        console.log('✅ [Analytics] Received data:', json);
        console.log('🎯 [Analytics] Clustering enabled:', json.clustering?.enabled);
        console.log('📊 [Analytics] Sample data:', json.data?.slice(0, 3));
        
        if (json.success) {
          setData(json.data || []);
          setClusterMeta(json.clustering || { enabled: false });
          
          // Log cluster distribution with detailed logging
          const clusterCounts = json.data?.reduce((acc, row) => {
            let cluster = row.cluster_label;
            if (!cluster || 
                cluster === null || 
                cluster === undefined ||
                (typeof cluster === 'number' && isNaN(cluster)) ||
                (typeof cluster === 'string' && (cluster.toLowerCase() === 'nan' || cluster.trim() === ''))) {
              cluster = 'Not Clustered';
            }
            acc[cluster] = (acc[cluster] || 0) + 1;
            return acc;
          }, {});
          console.log('📈 [Analytics] Cluster distribution:', clusterCounts);
          console.log('🔍 [Analytics] Sample row with cluster:', json.data?.[0]);
          console.log('🔍 [Analytics] Clustering enabled status:', json.clustering?.enabled);
          console.log('🔍 [Analytics] Backend platform:', json.clustering?.backendPlatform);
          console.log('🔍 [Analytics] Clustering API platform:', json.clustering?.apiPlatform);
        } else {
          setError('Failed to load analytics');
        }
        
        setProgress(100);
        setTimeout(() => setLoading(false), 500);
        setHasFetched(true);
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
        console.error('❌ [Analytics] Fetch error:', err);
        // Display more specific error messages
        const errorMessage = err?.message || 'Unable to fetch analytics';
        setError(errorMessage.includes('502') || errorMessage.includes('timeout') 
          ? 'Backend service is unavailable or the request timed out. Please try again in a moment.'
          : errorMessage);
        setProgress(0);
        setLoading(false);
        setHasFetched(true);
        try {
          trackEvent('dean_analytics_error', { message: String(err?.message || err) });
        } catch {}
      });
  };

  const getClusterStyle = (label) => {
    // Handle null, undefined, NaN, empty string, or 'nan' string
    if (!label || 
        label === null || 
        label === undefined ||
        (typeof label === 'number' && isNaN(label)) ||
        (typeof label === 'string' && (label.toLowerCase() === 'nan' || label.trim() === ''))) {
      return { text: 'Not Clustered', className: 'bg-gray-100 text-gray-600' };
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

  // Get unique clusters from data
  const uniqueClusters = useMemo(() => {
    const clusters = new Set();
    data.forEach(row => {
      let cluster = row.cluster_label;
      // Handle null, undefined, NaN, or 'nan' string
      if (!cluster || 
          cluster === null || 
          cluster === undefined ||
          (typeof cluster === 'number' && isNaN(cluster)) ||
          (typeof cluster === 'string' && (cluster.toLowerCase() === 'nan' || cluster.trim() === ''))) {
        cluster = 'Not Clustered';
      }
      clusters.add(cluster);
    });
    return Array.from(clusters).sort();
  }, [data]);

  // Filter data based on search and selected cluster
  const filteredData = useMemo(() => {
    let filtered = data;

    // Filter by cluster
    if (selectedCluster !== 'all') {
      filtered = filtered.filter(row => {
        let cluster = row.cluster_label;
        if (!cluster || 
            cluster === null || 
            cluster === undefined ||
            (typeof cluster === 'number' && isNaN(cluster)) ||
            (typeof cluster === 'string' && (cluster.toLowerCase() === 'nan' || cluster.trim() === ''))) {
          cluster = 'Not Clustered';
        }
        return cluster === selectedCluster;
      });
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(row =>
        (row.full_name || '').toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [data, selectedCluster, searchQuery]);

  // Calculate statistics
  const stats = useMemo(() => {
    if (filteredData.length === 0) return null;
    
    const total = filteredData.length;
    const avgAttendance = filteredData.reduce((sum, row) => sum + (parseFloat(row.attendance_percentage) || 0), 0) / total;
    const avgScore = filteredData.reduce((sum, row) => sum + (parseFloat(row.average_score) || 0), 0) / total;
    const avgDaysLate = filteredData.reduce((sum, row) => sum + (parseFloat(row.average_days_late) || 0), 0) / total;
    const avgSubmissionRate = filteredData.reduce((sum, row) => {
      const rate = parseFloat(row.submission_rate) || 0;
      return sum + rate;
    }, 0) / total * 100; // Convert to percentage
    
    return {
      total,
      avgAttendance: avgAttendance.toFixed(2),
      avgScore: avgScore.toFixed(2),
      avgDaysLate: avgDaysLate.toFixed(1),
      avgSubmissionRate: avgSubmissionRate.toFixed(1)
    };
  }, [filteredData]);

  // Prepare chart data
  const chartData = useMemo(() => {
    if (filteredData.length === 0) return null;

    // Cluster distribution for pie chart
    const clusterDistribution = {};
    filteredData.forEach(row => {
      let cluster = row.cluster_label;
      if (!cluster || 
          cluster === null || 
          cluster === undefined ||
          (typeof cluster === 'number' && isNaN(cluster)) ||
          (typeof cluster === 'string' && (cluster.toLowerCase() === 'nan' || cluster.trim() === ''))) {
        cluster = 'Not Clustered';
      }
      clusterDistribution[cluster] = (clusterDistribution[cluster] || 0) + 1;
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

    return {
      clusterData,
      attendanceData,
      scoreData,
      submissionData
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
      <div className="p-6 overflow-y-auto h-full">
        {!hasFetched && (
          <div className="flex justify-end mb-6">
            <button
              className="inline-flex items-center px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors duration-200 shadow-sm"
              onClick={() => { try { trackEvent('dean_analytics_load_clicked') } catch {}; handleFetch() }}
              disabled={loading}
            >
              {loading ? (
                <>
                  <ChartBarIcon className="h-5 w-5 mr-2 animate-pulse" />
                  Loading...
                </>
              ) : (
                <>
                  <ChartBarIcon className="h-5 w-5 mr-2" />
                  Load Analytics
                </>
              )}
            </button>
          </div>
        )}

        {/* Progress Bar */}
        {loading && (
          <div className="mb-6 bg-white rounded-lg shadow-sm border border-gray-200 p-4">
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
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        {/* Skeleton Loading */}
        {loading && (
          <div className="mb-6">
            <TableSkeleton rows={8} columns={5} />
          </div>
        )}

        {/* Main Content */}
        {hasFetched && !loading && !error && (
          <div className="flex gap-6">
            {/* Main Content Area - Left Side */}
            <div className="flex-1 space-y-6">
              {/* Filters */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <div className="flex flex-col md:flex-row gap-4">
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

                  {/* Cluster Filter */}
                  {uniqueClusters.length > 0 && (
                    <div className="md:w-64">
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
                              {cluster} ({data.filter(d => (d.cluster_label || 'Not Clustered') === cluster).length})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}
                </div>

                {/* Filter Results Count */}
                {filteredData.length !== data.length && (
                  <p className="mt-3 text-sm text-gray-600">
                    Showing {filteredData.length} of {data.length} students
                  </p>
                )}
              </div>

              {/* Data Table */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="max-h-[calc(100vh-300px)] overflow-y-auto">
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
                          <th className="px-6 py-3 text-left font-semibold text-gray-700 border-b border-gray-200">Student Name</th>
                          <th className="px-6 py-3 text-left font-semibold text-gray-700 border-b border-gray-200">Attendance %</th>
                          <th className="px-6 py-3 text-left font-semibold text-gray-700 border-b border-gray-200">Average Score</th>
                          <th className="px-6 py-3 text-left font-semibold text-gray-700 border-b border-gray-200">Avg Days Late</th>
                          <th className="px-6 py-3 text-left font-semibold text-gray-700 border-b border-gray-200">Submission Rate</th>
                          <th className="px-6 py-3 text-left font-semibold text-gray-700 border-b border-gray-200">Cluster</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {filteredData.map((row) => {
                          const clusterStyle = getClusterStyle(row.cluster_label);

                          return (
                            <tr 
                              key={row.student_id} 
                              className="hover:bg-gray-50 transition-colors cursor-pointer"
                              onClick={() => {
                                setSelectedStudent(row);
                                setIsModalOpen(true);
                              }}
                            >
                              <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{row.full_name}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                                {row.attendance_percentage !== null && row.attendance_percentage !== undefined 
                                  ? `${parseFloat(row.attendance_percentage).toFixed(1)}%` 
                                  : 'N/A'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                                {row.average_score !== null && row.average_score !== undefined 
                                  ? parseFloat(row.average_score).toFixed(1) 
                                  : 'N/A'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                                {row.average_days_late !== null && row.average_days_late !== undefined 
                                  ? parseFloat(row.average_days_late).toFixed(1) 
                                  : 'N/A'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                                {row.submission_rate !== null && row.submission_rate !== undefined 
                                  ? `${(parseFloat(row.submission_rate) * 100).toFixed(1)}%` 
                                  : 'N/A'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${clusterStyle.className}`}>
                                  {clusterStyle.text}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>

            {/* Right Sidebar - Statistics and Charts */}
            <div className="w-80 space-y-4 overflow-y-auto max-h-[calc(100vh-100px)]">
              {/* Statistics Cards */}
              {stats && (
                <div className="space-y-3">
                  <div className="bg-gradient-to-br from-gray-50 to-white rounded-lg shadow-sm border border-gray-200 p-4">
                    <p className="text-xs text-gray-500 mb-1">Total Students</p>
                    <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
                  </div>
                  <div className="bg-gradient-to-br from-blue-50 to-white rounded-lg shadow-sm border border-blue-200 p-4">
                    <p className="text-xs text-blue-600 mb-1">Avg Attendance</p>
                    <p className="text-3xl font-bold text-blue-600">{stats.avgAttendance}%</p>
                  </div>
                  <div className="bg-gradient-to-br from-emerald-50 to-white rounded-lg shadow-sm border border-emerald-200 p-4">
                    <p className="text-xs text-emerald-600 mb-1">Avg Score</p>
                    <p className="text-3xl font-bold text-emerald-600">{stats.avgScore}</p>
                  </div>
                  <div className="bg-gradient-to-br from-orange-50 to-white rounded-lg shadow-sm border border-orange-200 p-4">
                    <p className="text-xs text-orange-600 mb-1">Avg Days Late</p>
                    <p className="text-3xl font-bold text-orange-600">{stats.avgDaysLate}</p>
                  </div>
                  <div className="bg-gradient-to-br from-purple-50 to-white rounded-lg shadow-sm border border-purple-200 p-4">
                    <p className="text-xs text-purple-600 mb-1">Avg Submission Rate</p>
                    <p className="text-3xl font-bold text-purple-600">{stats.avgSubmissionRate}%</p>
                  </div>
                </div>
              )}

              {/* Charts Section */}
              {chartData && (
                <div className="space-y-4">
                  {/* Cluster Distribution Pie Chart */}
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                    <h3 className="text-sm font-semibold text-gray-900 mb-3">Cluster Distribution</h3>
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie
                          data={chartData.clusterData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          outerRadius={70}
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
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                    <h3 className="text-sm font-semibold text-gray-900 mb-3">Attendance Distribution</h3>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={chartData.attendanceData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" angle={-45} textAnchor="end" height={60} tick={{ fontSize: 9 }} />
                        <YAxis tick={{ fontSize: 9 }} />
                        <Tooltip />
                        <Bar dataKey="students" fill={COLORS.bar} name="Students" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Score Distribution Bar Chart */}
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                    <h3 className="text-sm font-semibold text-gray-900 mb-3">Average Score Distribution</h3>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={chartData.scoreData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" angle={-45} textAnchor="end" height={60} tick={{ fontSize: 9 }} />
                        <YAxis tick={{ fontSize: 9 }} />
                        <Tooltip />
                        <Bar dataKey="students" fill={COLORS.barSecondary} name="Students" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Submission Rate Distribution Bar Chart */}
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                    <h3 className="text-sm font-semibold text-gray-900 mb-3">Submission Rate Distribution</h3>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={chartData.submissionData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" angle={-45} textAnchor="end" height={60} tick={{ fontSize: 9 }} />
                        <YAxis tick={{ fontSize: 9 }} />
                        <Tooltip />
                        <Bar dataKey="students" fill="#8b5cf6" name="Students" />
                      </BarChart>
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setIsModalOpen(false)}>
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
              <h2 className="text-xl font-bold text-gray-900">Student Details</h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              {/* Student Header Info */}
              <div className="flex items-start gap-6 mb-6 pb-6 border-b border-gray-200">
                {/* Student Image */}
                <div className="flex-shrink-0">
                  {selectedStudent.student_photo ? (
                    <img
                      src={selectedStudent.student_photo}
                      alt={selectedStudent.full_name}
                      className="w-24 h-24 rounded-full object-cover border-4 border-gray-200"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'block';
                      }}
                    />
                  ) : null}
                  <UserCircleIcon className={`w-24 h-24 text-gray-300 ${selectedStudent.student_photo ? 'hidden' : ''}`} />
                </div>

                {/* Student Basic Info */}
                <div className="flex-1">
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">{selectedStudent.full_name}</h3>
                  <div className="space-y-1">
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Student Number:</span>{' '}
                      <span className="text-gray-900">{selectedStudent.student_number || 'N/A'}</span>
                    </p>
                    {selectedStudent.contact_email && (
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">Email:</span>{' '}
                        <span className="text-gray-900">{selectedStudent.contact_email}</span>
                      </p>
                    )}
                    <div className="mt-2">
                      <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${getClusterStyle(selectedStudent.cluster_label).className}`}>
                        {getClusterStyle(selectedStudent.cluster_label).text}
                      </span>
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
                      {selectedStudent.attendance_percentage !== null && selectedStudent.attendance_percentage !== undefined
                        ? `${parseFloat(selectedStudent.attendance_percentage).toFixed(1)}%`
                        : 'N/A'}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                    <div
                      className={`h-3 rounded-full transition-all duration-500 ${
                        (parseFloat(selectedStudent.attendance_percentage) || 0) >= 80
                          ? 'bg-emerald-500'
                          : (parseFloat(selectedStudent.attendance_percentage) || 0) >= 60
                          ? 'bg-blue-500'
                          : (parseFloat(selectedStudent.attendance_percentage) || 0) >= 40
                          ? 'bg-yellow-500'
                          : 'bg-red-500'
                      }`}
                      style={{ width: `${Math.min(parseFloat(selectedStudent.attendance_percentage) || 0, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Average Score */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Average Score</span>
                    <span className="text-sm font-semibold text-gray-900">
                      {selectedStudent.average_score !== null && selectedStudent.average_score !== undefined
                        ? parseFloat(selectedStudent.average_score).toFixed(1)
                        : 'N/A'}
                      {selectedStudent.average_score !== null && selectedStudent.average_score !== undefined && (
                        <span className="text-gray-500 ml-1">/ 100</span>
                      )}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                    <div
                      className={`h-3 rounded-full transition-all duration-500 ${
                        (parseFloat(selectedStudent.average_score) || 0) >= 80
                          ? 'bg-emerald-500'
                          : (parseFloat(selectedStudent.average_score) || 0) >= 60
                          ? 'bg-blue-500'
                          : (parseFloat(selectedStudent.average_score) || 0) >= 40
                          ? 'bg-yellow-500'
                          : 'bg-red-500'
                      }`}
                      style={{ width: `${Math.min(parseFloat(selectedStudent.average_score) || 0, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Submission Rate */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Submission Rate</span>
                    <span className="text-sm font-semibold text-gray-900">
                      {selectedStudent.submission_rate !== null && selectedStudent.submission_rate !== undefined
                        ? `${(parseFloat(selectedStudent.submission_rate) * 100).toFixed(1)}%`
                        : 'N/A'}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                    <div
                      className={`h-3 rounded-full transition-all duration-500 ${
                        (parseFloat(selectedStudent.submission_rate) || 0) * 100 >= 80
                          ? 'bg-emerald-500'
                          : (parseFloat(selectedStudent.submission_rate) || 0) * 100 >= 60
                          ? 'bg-blue-500'
                          : (parseFloat(selectedStudent.submission_rate) || 0) * 100 >= 40
                          ? 'bg-yellow-500'
                          : 'bg-red-500'
                      }`}
                      style={{ width: `${Math.min((parseFloat(selectedStudent.submission_rate) || 0) * 100, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Average Days Late */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Average Days Late</span>
                    <span className="text-sm font-semibold text-gray-900">
                      {selectedStudent.average_days_late !== null && selectedStudent.average_days_late !== undefined
                        ? `${parseFloat(selectedStudent.average_days_late).toFixed(1)} days`
                        : 'N/A'}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                    {/* Days late progress bar (inverse - lower is better) */}
                    <div
                      className={`h-3 rounded-full transition-all duration-500 ${
                        (parseFloat(selectedStudent.average_days_late) || 0) <= 2
                          ? 'bg-emerald-500'
                          : (parseFloat(selectedStudent.average_days_late) || 0) <= 5
                          ? 'bg-yellow-500'
                          : 'bg-red-500'
                      }`}
                      style={{
                        width: `${Math.min(
                          ((parseFloat(selectedStudent.average_days_late) || 0) / 10) * 100,
                          100
                        )}%`
                      }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {(parseFloat(selectedStudent.average_days_late) || 0) <= 2
                      ? 'Excellent timeliness'
                      : (parseFloat(selectedStudent.average_days_late) || 0) <= 5
                      ? 'Moderate delays'
                      : 'Needs improvement in timeliness'}
                  </p>
                </div>
              </div>

              {/* Additional Info Section */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h4 className="text-lg font-semibold text-gray-900 mb-4">Additional Information</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-1">Student ID</p>
                    <p className="text-sm font-medium text-gray-900">{selectedStudent.student_id}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-1">Cluster Label</p>
                    <p className="text-sm font-medium text-gray-900">
                      {getClusterStyle(selectedStudent.cluster_label).text}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-end">
              <button
                onClick={() => setIsModalOpen(false)}
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
