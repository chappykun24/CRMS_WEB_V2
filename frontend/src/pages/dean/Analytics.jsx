import React, { useState } from 'react';

const Analytics = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasFetched, setHasFetched] = useState(false);

  const handleFetch = () => {
    setLoading(true);
    setError(null);
    fetch('/api/assessments/dean-analytics/sample')
      .then((res) => res.json())
      .then((json) => {
        if (json.success) {
          setData(json.data);
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
          <div className="max-h-96 overflow-y-auto border border-gray-200 rounded-lg shadow-sm">
            <table className="min-w-full bg-white text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-2 text-left font-semibold text-gray-700">Student Name</th>
                  <th className="px-4 py-2 text-left font-semibold text-gray-700">Attendance %</th>
                  <th className="px-4 py-2 text-left font-semibold text-gray-700">Average Score</th>
                  <th className="px-4 py-2 text-left font-semibold text-gray-700">Avg Days Late</th>
                </tr>
              </thead>
              <tbody>
                {data.map((row) => (
                  <tr key={row.student_id} className="border-b last:border-b-0">
                    <td className="px-4 py-2 whitespace-nowrap">{row.full_name}</td>
                    <td className="px-4 py-2 whitespace-nowrap">{row.attendance_percentage ?? 'N/A'}</td>
                    <td className="px-4 py-2 whitespace-nowrap">{row.average_score ?? 'N/A'}</td>
                    <td className="px-4 py-2 whitespace-nowrap">{row.average_days_late ?? 'N/A'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default Analytics;
