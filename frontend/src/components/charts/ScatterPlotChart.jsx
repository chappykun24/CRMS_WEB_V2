import React from 'react'
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts'

const ScatterPlotChart = ({ data, onNavigate }) => {
  const clusterColors = {
    'Excellent Performance': '#10b981',
    'On Track': '#3b82f6',
    'Performing Well': '#3b82f6',
    'Needs Improvement': '#f59e0b',
    'Needs Guidance': '#f59e0b',
    'At Risk': '#ef4444',
    'Needs Support': '#ef4444'
  }

  return (
    <ResponsiveContainer width="100%" height={240}>
      <ScatterChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis 
          type="number" 
          dataKey="attendance" 
          name="Attendance %" 
          domain={[0, 100]}
          label={{ value: 'Attendance %', position: 'insideBottom', offset: -5 }}
          tick={{ fontSize: 10 }}
          stroke="#6b7280"
        />
        <YAxis 
          type="number" 
          dataKey="score" 
          name="Score" 
          domain={[0, 100]}
          label={{ value: 'Average Score', angle: -90, position: 'insideLeft' }}
          tick={{ fontSize: 10 }}
          stroke="#6b7280"
        />
        <ZAxis 
          type="number" 
          dataKey="submissionRate" 
          range={[50, 400]}
          name="Submission Rate %"
        />
        <Tooltip 
          contentStyle={{ fontSize: '11px', padding: '6px', backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '6px' }}
          content={({ active, payload }) => {
            if (active && payload && payload[0]) {
              const data = payload[0].payload;
              return (
                <div className="bg-white p-1.5 border border-gray-300 rounded shadow-lg">
                  <p className="font-semibold text-xs">{data.name}</p>
                  <p className="text-[10px]">Attendance: {data.attendance.toFixed(1)}%</p>
                  <p className="text-[10px]">Score: {data.score.toFixed(1)}</p>
                  <p className="text-[10px]">Submission Rate: {data.submissionRate.toFixed(1)}%</p>
                  <p className="text-[10px]">Cluster: {data.cluster}</p>
                </div>
              );
            }
            return null;
          }}
        />
        <Scatter 
          name="Students" 
          data={data} 
          fill="#3b82f6"
          shape={(props) => {
            const { cx, cy, payload } = props;
            const color = clusterColors[payload.cluster] || '#9ca3af';
            return <circle cx={cx} cy={cy} r={5} fill={color} stroke="#fff" strokeWidth={1.5} opacity={0.7} />;
          }}
        />
      </ScatterChart>
    </ResponsiveContainer>
  )
}

export default ScatterPlotChart

