// Performance testing utilities
export class PerformanceTester {
  constructor() {
    this.tests = [];
    this.results = [];
  }

  // Test API response times
  async testApiPerformance(apiFunction, testName, iterations = 5) {
    console.log(`🧪 Testing ${testName}...`);
    const times = [];

    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      try {
        await apiFunction();
        const end = performance.now();
        times.push(end - start);
      } catch (error) {
        console.error(`❌ ${testName} failed on iteration ${i + 1}:`, error);
        times.push(Infinity);
      }
    }

    const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);

    const result = {
      testName,
      avgTime: Math.round(avgTime),
      minTime: Math.round(minTime),
      maxTime: Math.round(maxTime),
      iterations,
      success: times.every(t => t !== Infinity)
    };

    this.results.push(result);
    console.log(`✅ ${testName}: avg ${result.avgTime}ms (min: ${result.minTime}ms, max: ${result.maxTime}ms)`);
    
    return result;
  }

  // Test component render performance
  testRenderPerformance(componentName, renderFunction, iterations = 10) {
    console.log(`🧪 Testing ${componentName} render performance...`);
    const times = [];

    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      renderFunction();
      const end = performance.now();
      times.push(end - start);
    }

    const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);

    const result = {
      testName: `${componentName} Render`,
      avgTime: Math.round(avgTime),
      minTime: Math.round(minTime),
      maxTime: Math.round(maxTime),
      iterations,
      success: true
    };

    this.results.push(result);
    console.log(`✅ ${componentName} render: avg ${result.avgTime}ms (min: ${result.minTime}ms, max: ${result.maxTime}ms)`);
    
    return result;
  }

  // Test memory usage
  testMemoryUsage(testName) {
    if (!performance.memory) {
      console.warn('⚠️ Memory API not available');
      return null;
    }

    const memory = performance.memory;
    const usedMB = Math.round(memory.usedJSHeapSize / 1048576);
    const totalMB = Math.round(memory.totalJSHeapSize / 1048576);
    const limitMB = Math.round(memory.jsHeapSizeLimit / 1048576);

    const result = {
      testName: `${testName} Memory`,
      usedMB,
      totalMB,
      limitMB,
      usagePercent: Math.round((usedMB / limitMB) * 100),
      success: true
    };

    this.results.push(result);
    console.log(`🧠 ${testName} memory: ${usedMB}MB / ${limitMB}MB (${result.usagePercent}%)`);
    
    return result;
  }

  // Test network performance
  async testNetworkPerformance(url, iterations = 3) {
    console.log(`🌐 Testing network performance for ${url}...`);
    const times = [];

    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        await response.text();
        const end = performance.now();
        times.push(end - start);
      } catch (error) {
        console.error(`❌ Network test failed on iteration ${i + 1}:`, error);
        times.push(Infinity);
      }
    }

    const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);

    const result = {
      testName: `Network ${url}`,
      avgTime: Math.round(avgTime),
      minTime: Math.round(minTime),
      maxTime: Math.round(maxTime),
      iterations,
      success: times.every(t => t !== Infinity)
    };

    this.results.push(result);
    console.log(`✅ Network ${url}: avg ${result.avgTime}ms (min: ${result.minTime}ms, max: ${result.maxTime}ms)`);
    
    return result;
  }

  // Generate performance report
  generateReport() {
    console.log('\n📊 Performance Test Report');
    console.log('========================');
    
    const successfulTests = this.results.filter(r => r.success);
    const failedTests = this.results.filter(r => !r.success);
    
    console.log(`✅ Successful tests: ${successfulTests.length}`);
    console.log(`❌ Failed tests: ${failedTests.length}`);
    
    if (successfulTests.length > 0) {
      console.log('\n📈 Performance Summary:');
      successfulTests.forEach(result => {
        if (result.avgTime) {
          const status = result.avgTime < 100 ? '🟢' : result.avgTime < 500 ? '🟡' : '🔴';
          console.log(`${status} ${result.testName}: ${result.avgTime}ms avg`);
        } else if (result.usedMB) {
          const status = result.usagePercent < 50 ? '🟢' : result.usagePercent < 80 ? '🟡' : '🔴';
          console.log(`${status} ${result.testName}: ${result.usedMB}MB (${result.usagePercent}%)`);
        }
      });
    }
    
    if (failedTests.length > 0) {
      console.log('\n❌ Failed Tests:');
      failedTests.forEach(result => {
        console.log(`- ${result.testName}`);
      });
    }
    
    return {
      total: this.results.length,
      successful: successfulTests.length,
      failed: failedTests.length,
      results: this.results
    };
  }

  // Clear results
  clear() {
    this.results = [];
  }
}

// Quick performance test functions
export const quickApiTest = async (apiFunction, testName) => {
  const tester = new PerformanceTester();
  return await tester.testApiPerformance(apiFunction, testName, 3);
};

export const quickRenderTest = (componentName, renderFunction) => {
  const tester = new PerformanceTester();
  return tester.testRenderPerformance(componentName, renderFunction, 5);
};

export const quickMemoryTest = (testName) => {
  const tester = new PerformanceTester();
  return tester.testMemoryUsage(testName);
};

export default PerformanceTester;
