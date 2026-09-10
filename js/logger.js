/**
 * Application Logger
 * Structured logging with levels: debug, info, warn, error
 * Routes errors to Sentry in production
 */

const Logger = (() => {
  const levels = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3
  };
  
  const currentLevel = levels[APP_CONFIG.LOG_LEVEL] || levels.info;
  
  const log = (level, message, data) => {
    if (levels[level] < currentLevel) return;
    
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
    
    const logData = {
      timestamp,
      level,
      message,
      data,
      url: window.location.href,
      userAgent: navigator.userAgent
    };
    
    // Console output
    if (level === 'error') {
      console.error(prefix, message, data);
    } else if (level === 'warn') {
      console.warn(prefix, message, data);
    } else if (level === 'debug') {
      console.debug(prefix, message, data);
    } else {
      console.log(prefix, message, data);
    }
    
    // Send to monitoring service in production
    if (APP_CONFIG.FEATURES.ERROR_TRACKING_ENABLED && level === 'error') {
      sendToMonitoring(logData);
    }
    
    // Store in local session log (for debugging)
    if (!window.__sessionLog) window.__sessionLog = [];
    window.__sessionLog.push(logData);
    if (window.__sessionLog.length > 100) window.__sessionLog.shift();
  };
  
  const sendToMonitoring = async (logData) => {
    try {
      // This will be replaced with actual Sentry init below
      if (window.Sentry) {
        window.Sentry.captureException(new Error(logData.message), {
          extra: logData.data
        });
      }
    } catch (err) {
      console.error('Failed to send error to monitoring:', err);
    }
  };
  
  return {
    debug: (msg, data) => log('debug', msg, data),
    info: (msg, data) => log('info', msg, data),
    warn: (msg, data) => log('warn', msg, data),
    error: (msg, data) => log('error', msg, data),
    getSessionLog: () => window.__sessionLog || []
  };
})();
