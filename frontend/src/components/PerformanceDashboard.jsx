import React, { useState, useEffect, useCallback } from 'react';
import { 
  ChartBarIcon, 
  ClockIcon, 
  CpuChipIcon, 
  ExclamationTriangleIcon,
  CheckCircleIcon
} from '@heroicons/react/24/solid';
import PerformanceTester from '../utils/performanceTest';

const PerformanceDashboard = ({ isOpen, onClose }) => {
  const [metrics, setMetrics] = useState({
    apiResponseTime: 0,
    renderTime: 0,
    memoryUsage: 0,
    cacheHitRate: 0,
    errorRate: 0
  });
  const [isRunning, setIsRunning] = useState(false);
  const [testResults, setTestResults] = useState([]);

  const performanceTester = new PerformanceTester();

  // Monitor performance metrics
  const updateMetrics = useCallback(() => {
    if (performance.memory) {
      const memory = performance.memory;
      const usedMB = Math.round(memory.usedJSHeapSize / 1048576);
      const totalMB = Math.round(memory.totalJSHeapSize / 1048576);
      
      setMetrics(prev => ({
        ...prev,
        memoryUsage: Math.round((usedMB / totalMB) * 100)
      }));
    }
  }, []);

  // Run performance tests
  const runPerformanceTests = async () => {
    setIsRunning(true);
    setTestResults([]);
    performanceTester.clear();

    try {
      // Test API performance
      await performanceTester.testApiPerformance(
        () => fetch('/api/departments').then(r => r.json()),
        'Departments API',
        3
      );

      await performanceTester.testApiPerformance(
        () => fetch('/api/users').then(r => r.json()),
        'Users API',
        3
      );

      // Test memory usage
      performanceTester.testMemoryUsage('Current Session');

      // Test network performance
      await performanceTester.testNetworkPerformance('/api/health', 2);

      const report = performanceTester.generateReport();
      setTestResults(report.results);

    } catch (error) {
      console.error('Performance test failed:', error);
    } finally {
      setIsRunning(false);
    }
  };

  // Update metrics periodically
  useEffect(() => {
    if (!isOpen) return;

    updateMetrics();
    const interval = setInterval(updateMetrics, 2000);
    return () => clearInterval(interval);
  }, [isOpen, updateMetrics]);

  if (!isOpen) return null;

  const getStatusColor = (value, thresholds) => {
    if (value < thresholds.good) return 'text-green-600';
    if (value < thresholds.warning) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getStatusIcon = (value, thresholds) => {
    if (value < thresholds.good) return <CheckCircleIcon className="h-5 w-5 text-green-600" />;
    if (value < thresholds.warning) return <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600" />;
    return <ExclamationTriangleIcon className="h-5 w-5 text-red-600" />;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <ChartBarIcon className="h-6 w-6 text-blue-600" />
            Performance Dashboard
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Current Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Memory Usage</p>
                <p className={`text-2xl font-bold ${getStatusColor(metrics.memoryUsage, { good: 50, warning: 80 })}`}>
                  {metrics.memoryUsage}%
                </p>
              </div>
              {getStatusIcon(metrics.memoryUsage, { good: 50, warning: 80 })}
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">API Response Time</p>
                <p className={`text-2xl font-bold ${getStatusColor(metrics.apiResponseTime, { good: 200, warning: 500 })}`}>
                  {metrics.apiResponseTime}ms
                </p>
              </div>
              <ClockIcon className="h-5 w-5 text-blue-600" />
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Cache Hit Rate</p>
                <p className={`text-2xl font-bold ${getStatusColor(100 - metrics.cacheHitRate, { good: 20, warning: 50 })}`}>
                  {metrics.cacheHitRate}%
                </p>
              </div>
              <CpuChipIcon className="h-5 w-5 text-green-600" />
            </div>
          </div>
        </div>

        {/* Performance Tests */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-md font-semibold text-gray-900">Performance Tests</h4>
            <button
              onClick={runPerformanceTests}
              disabled={isRunning}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isRunning ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Running...
                </>
              ) : (
                <>
                  <ChartBarIcon className="h-4 w-4" />
                  Run Tests
                </>
              )}
            </button>
          </div>

          {testResults.length > 0 && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h5 className="text-sm font-medium text-gray-700 mb-3">Test Results</h5>
              <div className="space-y-2">
                {testResults.map((result, index) => (
                  <div key={index} className="flex items-center justify-between py-2 px-3 bg-white rounded border">
                    <span className="text-sm font-medium text-gray-900">{result.testName}</span>
                    <div className="flex items-center gap-4">
                      {result.avgTime && (
                        <span className={`text-sm ${getStatusColor(result.avgTime, { good: 200, warning: 500 })}`}>
                          {result.avgTime}ms avg
                        </span>
                      )}
                      {result.usedMB && (
                        <span className={`text-sm ${getStatusColor(result.usagePercent, { good: 50, warning: 80 })}`}>
                          {result.usedMB}MB ({result.usagePercent}%)
                        </span>
                      )}
                      {result.success ? (
                        <CheckCircleIcon className="h-4 w-4 text-green-600" />
                      ) : (
                        <ExclamationTriangleIcon className="h-4 w-4 text-red-600" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Performance Tips */}
        <div className="bg-blue-50 rounded-lg p-4">
          <h5 className="text-sm font-medium text-blue-900 mb-2">Performance Tips</h5>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Keep memory usage below 80% for optimal performance</li>
            <li>• API responses should be under 500ms for good user experience</li>
            <li>• Higher cache hit rates improve performance</li>
            <li>• Run performance tests regularly to monitor degradation</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default PerformanceDashboard;
