import React, { useMemo } from 'react';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell
} from 'recharts';

/**
 * Cluster Visualization Component
 * Displays 2D scatter plot of clusters using PCA or feature pairs
 */
const ClusterVisualization = ({ data, height = 300 }) => {
  // Prepare data for visualization
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];

    // Group by cluster
    const clusterGroups = {};
    
    const toNumber = (value, defaultValue = 0) => {
      if (value === null || value === undefined || value === '') return defaultValue;
      const num = parseFloat(value);
      return Number.isFinite(num) ? num : defaultValue;
    };
    
    data.forEach((student) => {
      if (!student.cluster_label) return;
      
      const clusterLabel = student.cluster_label;
      if (!clusterGroups[clusterLabel]) {
        clusterGroups[clusterLabel] = [];
      }
      
      const score = toNumber(student.final_score ?? student.average_score ?? student.ilo_based_score);
      const attendance = toNumber(student.attendance_percentage);
      const submissionRate = toNumber(student.submission_ontime_priority_score);
      
      clusterGroups[clusterLabel].push({
        x: score,
        y: attendance,
        name: student.full_name || `Student ${student.student_id}`,
        cluster: clusterLabel,
        score,
        attendance,
        submissionRate
      });
    });

    // Flatten for scatter chart
    const flattened = [];
    Object.keys(clusterGroups).forEach((label) => {
      clusterGroups[label].forEach((point) => {
        flattened.push(point);
      });
    });

    return flattened;
  }, [data]);

  // Color mapping for clusters
  const getClusterColor = (clusterLabel) => {
    const colors = {
      'Excellent Performance': '#10b981', // green
      'Good Performance': '#3b82f6',      // blue
      'Average Performance': '#f59e0b',   // amber
      'Needs Improvement': '#f97316',     // orange
      'At Risk': '#ef4444'                // red
    };
    return colors[clusterLabel] || '#6b7280'; // gray default
  };

  // Get unique clusters for legend
  const uniqueClusters = useMemo(() => {
    const clusters = new Set();
    chartData.forEach((point) => {
      if (point.cluster) clusters.add(point.cluster);
    });
    return Array.from(clusters);
  }, [chartData]);

  if (chartData.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <p className="text-sm text-gray-500 text-center">
          No cluster data available for visualization
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <h3 className="text-sm font-semibold text-gray-900 mb-4">
        Cluster Visualization (Score vs Attendance)
      </h3>
      
      <ResponsiveContainer width="100%" height={height}>
        <ScatterChart
          margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            type="number"
            dataKey="x"
            name="Score"
            label={{ value: 'Final Score', position: 'insideBottom', offset: -5 }}
            domain={[0, 100]}
            tick={{ fontSize: 10 }}
          />
          <YAxis
            type="number"
            dataKey="y"
            name="Attendance"
            label={{ value: 'Attendance %', angle: -90, position: 'insideLeft' }}
            domain={[0, 100]}
            tick={{ fontSize: 10 }}
          />
          <Tooltip
            cursor={{ strokeDasharray: '3 3' }}
            content={({ active, payload }) => {
              if (active && payload && payload[0]) {
                const data = payload[0].payload;
                return (
                  <div className="bg-white p-2 border border-gray-200 rounded shadow-lg">
                    <p className="font-semibold text-xs">{data.name}</p>
                    <p className="text-xs text-gray-600">
                      Cluster: <span className="font-medium">{data.cluster}</span>
                    </p>
                    <p className="text-xs text-gray-600">
                      Score: {Number.isFinite(data.score) ? data.score.toFixed(1) : 'N/A'}%
                    </p>
                    <p className="text-xs text-gray-600">
                      Attendance: {Number.isFinite(data.attendance) ? data.attendance.toFixed(1) : 'N/A'}%
                    </p>
                  </div>
                );
              }
              return null;
            }}
          />
          <Legend
            wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }}
            iconType="circle"
          />
          
          {/* Render each cluster as a separate Scatter series */}
          {uniqueClusters.map((clusterLabel) => {
            const clusterData = chartData.filter((d) => d.cluster === clusterLabel);
            return (
              <Scatter
                key={clusterLabel}
                name={clusterLabel}
                data={clusterData}
                fill={getClusterColor(clusterLabel)}
                opacity={0.7}
              />
            );
          })}
        </ScatterChart>
      </ResponsiveContainer>

      <div className="mt-4 pt-4 border-t border-gray-200">
        <p className="text-xs text-gray-500">
          This visualization shows student clusters based on Final Score (X-axis) and Attendance Percentage (Y-axis).
          Each point represents a student, colored by their assigned cluster.
        </p>
      </div>
    </div>
  );
};

export default ClusterVisualization;

