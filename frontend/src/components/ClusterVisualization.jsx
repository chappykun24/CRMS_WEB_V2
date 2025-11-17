import React, { useMemo } from 'react';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { getClusterStyle, getClusterColor } from '../utils/clusterUtils';

/**
 * Cluster Visualization Component
 * Displays 2D scatter plot of clusters using PCA or feature pairs
 */
const ClusterVisualization = ({ data, height = 320 }) => {
  const toNumber = (value, defaultValue = 0) => {
    if (value === null || value === undefined || value === '') return defaultValue;
    const num = parseFloat(value);
    return Number.isFinite(num) ? num : defaultValue;
  };

  const featurePoints = useMemo(() => {
    if (!data || data.length === 0) return [];
    return data
      .filter(student => !!student.cluster_label)
      .map(student => {
        const score = toNumber(student.final_score ?? student.average_score ?? student.ilo_based_score);
        const attendance = toNumber(student.attendance_percentage);
        return {
          id: student.student_id,
          name: student.full_name || `Student ${student.student_id}`,
          cluster: student.cluster_label,
          x: score,
          y: attendance
        };
      });
  }, [data]);

  const pcaPoints = useMemo(() => {
    if (!data || data.length === 0) return [];
    return data
      .filter(student => 
        student.cluster_label &&
        student.pca_x !== null && student.pca_x !== undefined &&
        student.pca_y !== null && student.pca_y !== undefined &&
        Number.isFinite(Number(student.pca_x)) &&
        Number.isFinite(Number(student.pca_y))
      )
      .map(student => ({
        id: student.student_id,
        name: student.full_name || `Student ${student.student_id}`,
        cluster: student.cluster_label,
        x: Number(student.pca_x),
        y: Number(student.pca_y)
      }));
  }, [data]);

  const pcaVariance = useMemo(() => {
    if (!data) return null;
    const row = data.find(student =>
      student.pca_component_1_variance !== null &&
      student.pca_component_1_variance !== undefined &&
      student.pca_component_2_variance !== null &&
      student.pca_component_2_variance !== undefined
    );
    if (!row) return null;
    return [
      Number(row.pca_component_1_variance) || 0,
      Number(row.pca_component_2_variance) || 0
    ];
  }, [data]);

  const buildCharts = useMemo(() => {
    const configs = [];

    if (featurePoints.length > 0) {
      const scores = featurePoints.map(p => p.x);
      const attendanceValues = featurePoints.map(p => p.y);
      const scoreDomain = scores.length ? [Math.min(...scores) - 1, Math.max(...scores) + 1] : [0, 100];
      const attendanceDomain = attendanceValues.length ? [Math.min(...attendanceValues) - 2, Math.max(...attendanceValues) + 2] : [0, 100];

      configs.push({
        key: 'feature',
        title: 'Score vs Attendance (Feature Pair)',
        subtitle: 'Final Score vs Attendance Percentage',
        points: featurePoints,
        xLabel: 'Final Score',
        yLabel: 'Attendance Percentage',
        xDomain: [Math.max(0, scoreDomain[0]), Math.min(100, scoreDomain[1])],
        yDomain: [Math.max(0, attendanceDomain[0]), Math.min(100, attendanceDomain[1])]
      });
    }

    if (pcaPoints.length > 0) {
      const pcaX = pcaPoints.map(p => p.x);
      const pcaY = pcaPoints.map(p => p.y);
      const varianceText = pcaVariance
        ? ` (Explained Variance: ${(pcaVariance[0] * 100).toFixed(2)}%, ${(pcaVariance[1] * 100).toFixed(2)}%)`
        : '';

      configs.push({
        key: 'pca',
        title: 'K-Means Clustering Visualization (PCA 2D)',
        subtitle: `First vs Second Principal Component${varianceText}`,
        points: pcaPoints,
        xLabel: 'First Principal Component',
        yLabel: 'Second Principal Component',
        xDomain: [Math.min(...pcaX) - 0.5, Math.max(...pcaX) + 0.5],
        yDomain: [Math.min(...pcaY) - 0.5, Math.max(...pcaY) + 0.5]
      });
    }

    return configs;
  }, [featurePoints, pcaPoints, pcaVariance]);

  const renderScatterChart = (config) => {
    const clusters = Array.from(new Set(config.points.map(p => p.cluster)));
    if (config.points.length === 0) return null;

    return (
      <div key={config.key} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <h3 className="text-sm font-semibold text-gray-900">
          {config.title}
        </h3>
        {config.subtitle && (
          <p className="text-xs text-gray-500 mb-3">{config.subtitle}</p>
        )}
        <ResponsiveContainer width="100%" height={height}>
          <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              type="number"
              dataKey="x"
              name={config.xLabel}
              label={{ value: config.xLabel, position: 'insideBottom', offset: -5 }}
              domain={config.xDomain}
              tick={{ fontSize: 10 }}
            />
            <YAxis
              type="number"
              dataKey="y"
              name={config.yLabel}
              label={{ value: config.yLabel, angle: -90, position: 'insideLeft' }}
              domain={config.yDomain}
              tick={{ fontSize: 10 }}
            />
            <Tooltip
              cursor={{ strokeDasharray: '3 3' }}
              content={({ active, payload }) => {
                if (active && payload && payload[0]) {
                  const point = payload[0].payload;
                  const clusterStyle = getClusterStyle(point.cluster);
                  return (
                    <div className="bg-white p-2 border border-gray-200 rounded shadow-lg min-w-[160px]">
                      <p className="font-semibold text-xs">{point.name}</p>
                      <p className="text-xs text-gray-600">
                        Cluster:{' '}
                        <span className={clusterStyle ? clusterStyle.className : ''}>
                          {point.cluster}
                        </span>
                      </p>
                      <p className="text-xs text-gray-600">
                        {config.key === 'feature' ? 'Score' : 'PC1'}:{' '}
                        {Number.isFinite(point.x) ? point.x.toFixed(2) : 'N/A'}
                      </p>
                      <p className="text-xs text-gray-600">
                        {config.key === 'feature' ? 'Attendance' : 'PC2'}:{' '}
                        {Number.isFinite(point.y) ? point.y.toFixed(2) : 'N/A'}
                      </p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} iconType="circle" />
            {clusters.map(clusterLabel => {
              const clusterData = config.points.filter(point => point.cluster === clusterLabel);
              return (
                <Scatter
                  key={`${config.key}-${clusterLabel}`}
                  name={clusterLabel}
                  data={clusterData}
                  fill={getClusterColor(clusterLabel)}
                  opacity={0.75}
                  shape="circle"
                />
              );
            })}
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    );
  };

  if (buildCharts.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <p className="text-sm text-gray-500 text-center">
          No cluster data available for visualization
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className={`grid gap-4 ${buildCharts.length > 1 ? 'md:grid-cols-2' : ''}`}>
        {buildCharts.map(renderScatterChart)}
      </div>
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-xs text-gray-600">
        <p className="font-semibold text-gray-800 mb-1">How to read these charts:</p>
        <ul className="list-disc list-inside space-y-1">
          <li>Each dot represents a student, colored by their assigned cluster.</li>
          <li>PCA view spreads students across two principal components to highlight separation.</li>
          <li>Score vs Attendance shows the actual metrics used for performance analysis.</li>
        </ul>
      </div>
    </div>
  );
};

export default ClusterVisualization;

