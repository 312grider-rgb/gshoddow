/**
 * Analytics Tracking
 * Tracks user interactions and page views
 * 
 * To enable:
 * 1. Sign up at vercel.com/analytics
 * 2. Add Web Analytics to your project
 * 3. Include this script in your HTML
 */

const Analytics = (() => {
  const isEnabled = APP_CONFIG.FEATURES.ANALYTICS_ENABLED;
  
  const trackEvent = (name, properties = {}) => {
    if (!isEnabled) return;
    
    const event = {
      name,
      timestamp: new Date().toISOString(),
      page: window.location.pathname,
      ...properties
    };
    
    // Log locally
    Logger.debug('Analytics event', event);
    
    // Send to analytics service
    if (window.va) {
      // Vercel Analytics
      window.va('event', { name, properties });
    }
    
    // Send to Plausible or other service
    if (window.plausible) {
      window.plausible(name, { props: properties });
    }
    
    // Send custom endpoint
    if (APP_CONFIG.get('ANALYTICS_ENDPOINT')) {
      fetch(APP_CONFIG.get('ANALYTICS_ENDPOINT'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(event)
      }).catch(err => Logger.debug('Analytics send failed', err));
    }
  };
  
  const trackPageView = (pageName) => {
    trackEvent('page_view', { page: pageName });
  };
  
  const trackFeatureUsage = (featureName) => {
    trackEvent('feature_used', { feature: featureName });
  };
  
  const trackError = (errorName, errorMessage) => {
    trackEvent('error', { error: errorName, message: errorMessage });
  };
  
  const trackTiming = (name, duration) => {
    trackEvent('timing', { operation: name, duration });
  };
  
  // Track page visibility
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      trackEvent('page_hidden');
    } else {
      trackEvent('page_visible');
    }
  });
  
  return {
    trackEvent,
    trackPageView,
    trackFeatureUsage,
    trackError,
    trackTiming
  };
})();
