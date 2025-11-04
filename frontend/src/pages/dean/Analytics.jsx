import React, { useState, useEffect, useMemo } from 'react';
import { ChartBarIcon, FunnelIcon, MagnifyingGlassIcon } from '@heroicons/react/24/solid';
import { TableSkeleton } from '../../components/skeletons';
import { trackEvent } from '../../utils/analytics';

const Analytics = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const [hasFetched, setHasFetched] = useState(false);
  const [clusterMeta, setClusterMeta] = useState({ enabled: false });
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCluster, setSelectedCluster] = useState('all');

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
      .then((res) => {
        console.log('📡 [Analytics] Response status:', res.status);
        setProgress(95);
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
        setError('Unable to fetch analytics');
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
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Analytics</h1>
          {!hasFetched && (
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
          )}
        </div>

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
          <div className="space-y-6">
            {/* Clustering Status */}
            {!clusterMeta.enabled && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-yellow-800 text-sm">
                  <span className="font-semibold">⚠️ Warning:</span> Clustering service not configured. 
                  Students will show "Not Clustered" until the clustering API is properly configured.
                </p>
                <p className="text-yellow-700 text-xs mt-2">
                  To enable clustering, set <code className="bg-yellow-100 px-1 rounded">VITE_CLUSTER_API_URL</code> or 
                  <code className="bg-yellow-100 px-1 rounded">CLUSTER_SERVICE_URL</code> environment variable in your backend.
                </p>
              </div>
            )}
            {clusterMeta.enabled && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-green-800 text-sm">
                  <span className="font-semibold">✅ Clustering Active:</span> Student behavior analysis is enabled.
                  {clusterMeta.apiPlatform && (
                    <span className="ml-2 text-xs">(API hosted on {clusterMeta.apiPlatform})</span>
                  )}
                </p>
              </div>
            )}

            {/* Statistics Cards */}
            {stats && (
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                  <p className="text-sm text-gray-600 mb-1">Total Students</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                </div>
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                  <p className="text-sm text-gray-600 mb-1">Avg Attendance</p>
                  <p className="text-2xl font-bold text-blue-600">{stats.avgAttendance}%</p>
                </div>
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                  <p className="text-sm text-gray-600 mb-1">Avg Score</p>
                  <p className="text-2xl font-bold text-emerald-600">{stats.avgScore}</p>
                </div>
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                  <p className="text-sm text-gray-600 mb-1">Avg Days Late</p>
                  <p className="text-2xl font-bold text-orange-600">{stats.avgDaysLate}</p>
                </div>
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                  <p className="text-sm text-gray-600 mb-1">Avg Submission Rate</p>
                  <p className="text-2xl font-bold text-purple-600">{stats.avgSubmissionRate}%</p>
                </div>
              </div>
            )}

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
              <div className="max-h-96 overflow-y-auto">
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
                    <thead className="bg-gray-50 sticky top-0">
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
                          <tr key={row.student_id} className="hover:bg-gray-50 transition-colors">
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
        )}
      </div>
    </>
  );
};

export default Analytics;
