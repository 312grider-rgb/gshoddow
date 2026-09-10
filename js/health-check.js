/**
 * Health Check & Monitoring
 * Periodically checks if critical services are available
 */

const HealthCheck = (() => {
  const status = {
    supabase: null,
    api: null,
    lastCheck: null,
    healthy: true
  };
  
  const checkSupabase = async () => {
    try {
      // Simple query to verify auth is working
      const { data, error } = await sb.auth.getSession();
      status.supabase = !error ? 'ok' : 'error';
      return status.supabase === 'ok';
    } catch (err) {
      status.supabase = 'error';
      Logger.warn('Supabase health check failed', { error: err.message });
      return false;
    }
  };
  
  const checkAPI = async () => {
    try {
      const response = await fetch(APP_CONFIG.API_BASE + '/health', {
        method: 'GET',
        timeout: 5000
      });
      status.api = response.ok ? 'ok' : 'error';
      return status.api === 'ok';
    } catch (err) {
      status.api = 'error';
      Logger.warn('API health check failed', { error: err.message });
      return false;
    }
  };
  
  const check = async () => {
    const sbOk = await checkSupabase();
    const apiOk = await checkAPI();
    
    status.lastCheck = new Date().toISOString();
    status.healthy = sbOk && apiOk;
    
    Logger.debug('Health check complete', status);
    
    if (!status.healthy) {
      Analytics.trackEvent('health_check_failed', status);
    }
    
    return status.healthy;
  };
  
  // Run checks on page load and periodically
  if (APP_CONFIG.FEATURES.DEBUG_MODE) {
    check(); // Run once on load
    setInterval(check, 60000); // Run every 60 seconds
  }
  
  // Expose globally for manual checks
  window.checkHealth = check;
  
  return {
    check,
    getStatus: () => ({ ...status })
  };
})();
