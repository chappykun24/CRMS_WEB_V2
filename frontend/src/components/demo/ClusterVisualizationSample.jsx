import React from 'react';
import ClusterVisualization from '../ClusterVisualization';
import sampleClusterVisualizationData from '../../data/sampleClusterVisualizationData';

const ClusterVisualizationSample = () => (
  <div className="p-4 space-y-4">
    <h2 className="text-lg font-semibold text-gray-900">
      Cluster Visualization Demo (Sample Data)
    </h2>
    <p className="text-sm text-gray-600">
      This uses the hard-coded dataset from <code>frontend/src/data/sampleClusterVisualizationData.js</code>.
      Hover on any dot to see the preassigned student name, cluster, and metrics.
    </p>
    <ClusterVisualization data={sampleClusterVisualizationData} height={320} />
  </div>
);

export default ClusterVisualizationSample;

