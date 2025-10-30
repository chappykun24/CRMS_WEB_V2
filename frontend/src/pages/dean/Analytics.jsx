import React, { useEffect, useState } from 'react';

const Analytics = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    fetch('/api/assessments/dean-analytics/sample')
      .then((res) => res.json())
      .then((json) => {
        if (json.success) {
          setData(json.data);
        } else {
          setError('Failed to load analytics');
        }
        setLoading(false);
      })
      .catch((err) => {
        setError('Unable to fetch analytics');
        setLoading(false);
      });
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Analytics</h1>
      {loading && <div>Loading...</div>}
      {error && <div className="text-red-600">{error}</div>}
      {!loading && !error && (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white rounded-lg shadow text-sm">
            <thead>
              <tr className="bg-gray-100">
                <th className="px-4 py-2">Student Name</th>
                <th className="px-4 py-2">Attendance %</th>
                <th className="px-4 py-2">Average Score</th>
                <th className="px-4 py-2">Avg Days Late</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row) => (
                <tr key={row.student_id} className="border-b">
                  <td className="px-4 py-2">{row.full_name}</td>
                  <td className="px-4 py-2">{row.attendance_percentage ?? 'N/A'}</td>
                  <td className="px-4 py-2">{row.average_score ?? 'N/A'}</td>
                  <td className="px-4 py-2">{row.average_days_late ?? 'N/A'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Analytics;
