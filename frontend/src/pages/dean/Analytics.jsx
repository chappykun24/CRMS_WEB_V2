import React, { useState } from 'react';

const Analytics = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasFetched, setHasFetched] = useState(false);
  const [clusterMeta, setClusterMeta] = useState({ enabled: false });

  const handleFetch = () => {
    setLoading(true);
    setError(null);
    fetch('/api/assessments/dean-analytics/sample')
      .then((res) => res.json())
      .then((json) => {
        if (json.success) {
          setData(json.data || []);
          setClusterMeta(json.clustering || { enabled: false });
        } else {
          setError('Failed to load analytics');
        }
        setLoading(false);
        setHasFetched(true);
      })
      .catch(() => {
        setError('Unable to fetch analytics');
        setLoading(false);
        setHasFetched(true);
      });
  };

  const getClusterStyle = (label) => {
    if (!label) {
      return { text: 'Not Clustered', className: 'bg-gray-100 text-gray-600' };
    }

    const normalized = label.toLowerCase();

    if (normalized.includes('guidance') || normalized.includes('risk')) {
      return { text: label, className: 'bg-red-100 text-red-700' };
    }

    if (normalized.includes('excellent') || normalized.includes('high')) {
      return { text: label, className: 'bg-emerald-100 text-emerald-700' };
    }

    return { text: label, className: 'bg-blue-100 text-blue-700' };
  };

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Analytics</h1>
      {!hasFetched && (
        <button
          className="bg-primary-600 hover:bg-primary-700 text-white font-bold py-2 px-4 rounded"
          onClick={handleFetch}
          disabled={loading}
        >
          {loading ? 'Loading...' : 'Show Analytics'}
        </button>
      )}
      {hasFetched && error && <div className="text-red-600 mt-4">{error}</div>}
      {hasFetched && !loading && !error && (
        <div className="mt-6 overflow-x-auto">
          {!clusterMeta.enabled && (
            <div className="mb-4 text-sm text-gray-500">
              Clustering service not configured. Displaying raw analytics only.
            </div>
          )}
          <div className="max-h-96 overflow-y-auto border border-gray-200 rounded-lg shadow-sm">
            <table className="min-w-full bg-white text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-2 text-left font-semibold text-gray-700">Student Name</th>
                  <th className="px-4 py-2 text-left font-semibold text-gray-700">Attendance %</th>
                  <th className="px-4 py-2 text-left font-semibold text-gray-700">Average Score</th>
                  <th className="px-4 py-2 text-left font-semibold text-gray-700">Avg Days Late</th>
                  <th className="px-4 py-2 text-left font-semibold text-gray-700">Cluster</th>
                </tr>
              </thead>
              <tbody>
                {data.map((row) => {
                  const clusterStyle = getClusterStyle(row.cluster_label);

                  return (
                    <tr key={row.student_id} className="border-b last:border-b-0">
                      <td className="px-4 py-2 whitespace-nowrap">{row.full_name}</td>
                      <td className="px-4 py-2 whitespace-nowrap">{row.attendance_percentage ?? 'N/A'}</td>
                      <td className="px-4 py-2 whitespace-nowrap">{row.average_score ?? 'N/A'}</td>
                      <td className="px-4 py-2 whitespace-nowrap">{row.average_days_late ?? 'N/A'}</td>
                      <td className="px-4 py-2 whitespace-nowrap">
                        <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${clusterStyle.className}`}>
                          {clusterStyle.text}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default Analytics;
