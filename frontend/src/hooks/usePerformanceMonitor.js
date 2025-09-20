import { useEffect, useRef, useCallback } from 'react';

// Performance monitoring hook
export const usePerformanceMonitor = (componentName) => {
  const renderCount = useRef(0);
  const lastRenderTime = useRef(Date.now());
  const mountTime = useRef(Date.now());

  // Track renders
  useEffect(() => {
    renderCount.current += 1;
    const now = Date.now();
    const timeSinceLastRender = now - lastRenderTime.current;
    lastRenderTime.current = now;

    // Log performance warnings
    if (timeSinceLastRender < 100 && renderCount.current > 1) {
      console.warn(`⚡ [PERF] ${componentName} re-rendered too quickly (${timeSinceLastRender}ms)`);
    }

    if (renderCount.current > 10) {
      console.warn(`🔄 [PERF] ${componentName} has re-rendered ${renderCount.current} times`);
    }
  });

  // Track component lifecycle
  useEffect(() => {
    const mountDuration = Date.now() - mountTime.current;
    console.log(`🚀 [PERF] ${componentName} mounted in ${mountDuration}ms`);

    return () => {
      const totalLifetime = Date.now() - mountTime.current;
      console.log(`💀 [PERF] ${componentName} unmounted after ${totalLifetime}ms (${renderCount.current} renders)`);
    };
  }, [componentName]);

  return {
    renderCount: renderCount.current,
    timeSinceMount: Date.now() - mountTime.current
  };
};

// Hook for measuring async operations
export const useAsyncPerformance = (operationName) => {
  const startTime = useRef(null);
  const operationCount = useRef(0);

  const startOperation = useCallback(() => {
    startTime.current = Date.now();
    operationCount.current += 1;
  }, []);

  const endOperation = useCallback(() => {
    if (startTime.current) {
      const duration = Date.now() - startTime.current;
      console.log(`⏱️ [PERF] ${operationName} completed in ${duration}ms (operation #${operationCount.current})`);
      
      if (duration > 2000) {
        console.warn(`🐌 [PERF] ${operationName} is slow: ${duration}ms`);
      }
      
      startTime.current = null;
    }
  }, [operationName]);

  return { startOperation, endOperation };
};

// Hook for memory usage monitoring
export const useMemoryMonitor = (componentName) => {
  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && 'memory' in performance) {
      const checkMemory = () => {
        const memory = performance.memory;
        const usedMB = Math.round(memory.usedJSHeapSize / 1048576);
        const totalMB = Math.round(memory.totalJSHeapSize / 1048576);
        
        if (usedMB > 50) { // Warn if using more than 50MB
          console.warn(`🧠 [MEMORY] ${componentName} using ${usedMB}MB / ${totalMB}MB`);
        }
      };

      const interval = setInterval(checkMemory, 10000); // Check every 10 seconds
      return () => clearInterval(interval);
    }
  }, [componentName]);
};

export default usePerformanceMonitor;
