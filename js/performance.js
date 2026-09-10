/**
 * Performance Monitoring
 * Tracks page load times, API latency, and resource usage
 */

const PerformanceMonitor = (() => {
  const metrics = {};
  
  // Measure time from start to DOMContentLoaded
  const onDOMReady = () => {
    if (window.performance && window.performance.timing) {
      const timing = window.performance.timing;
      const domReady = timing.domContentLoadedEventEnd - timing.navigationStart;
      metrics.domReady = domReady;
      Logger.info('DOM ready', { time: domReady });
      Analytics.trackTiming('dom_ready', domReady);
    }
  };
  
  // Measure time from start to page fully loaded
  const onPageLoad = () => {
    if (window.performance && window.performance.timing) {
      const timing = window.performance.timing;
      const pageLoad = timing.loadEventEnd - timing.navigationStart;
      metrics.pageLoad = pageLoad;
      Logger.info('Page loaded', { time: pageLoad });
      Analytics.trackTiming('page_load', pageLoad);
    }
  };
  
  // Measure API call latency
  const measureAPICall = async (name, fn) => {
    const start = performance.now();
    try {
      const result = await fn();
      const duration = performance.now() - start;
      Logger.debug(`API: ${name}`, { duration });
      Analytics.trackTiming(`api_${name}`, duration);
      return result;
    } catch (err) {
      const duration = performance.now() - start;
      Logger.error(`API failed: ${name}`, { duration, error: err.message });
      Analytics.trackError(`api_${name}`, err.message);
      throw err;
    }
  };
  
  // Measure Largest Contentful Paint (LCP)
  const measureLCP = () => {
    if ('PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          Logger.debug('Largest Contentful Paint', { time: lastEntry.renderTime });
          Analytics.trackTiming('lcp', lastEntry.renderTime);
        });
        observer.observe({ entryTypes: ['largest-contentful-paint'] });
      } catch (err) {
        Logger.debug('LCP observation failed', err);
      }
    }
  };
  
  // Measure Cumulative Layout Shift (CLS)
  const measureCLS = () => {
    if ('PerformanceObserver' in window) {
      try {
        let cls = 0;
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (!entry.hadRecentInput) {
              cls += entry.value;
            }
          }
          Logger.debug('Cumulative Layout Shift', { score: cls });
        });
        observer.observe({ entryTypes: ['layout-shift'] });
      } catch (err) {
        Logger.debug('CLS observation failed', err);
      }
    }
  };
  
  // Initialize all monitoring
  const init = () => {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', onDOMReady);
    } else {
      onDOMReady();
    }
    
    window.addEventListener('load', onPageLoad);
    measureLCP();
    measureCLS();
  };
  
  // Delay init until after critical scripts load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    setTimeout(init, 0);
  }
  
  return {
    measureAPICall,
    getMetrics: () => metrics
  };
})();
