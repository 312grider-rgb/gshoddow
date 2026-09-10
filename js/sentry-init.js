/**
 * Sentry Error Tracking Initialization
 * Captures unhandled errors and sends them to Sentry
 * 
 * To enable:
 * 1. Create a Sentry account at sentry.io
 * 2. Create a new project for your app
 * 3. Replace YOUR_SENTRY_DSN below
 * 4. Include this script in your HTML after config.js
 */

if (APP_CONFIG.FEATURES.ERROR_TRACKING_ENABLED && APP_CONFIG.ENVIRONMENT === 'production') {
  // Load Sentry SDK from CDN
  const script = document.createElement('script');
  script.src = 'https://browser.sentry-cdn.com/7.84.0/bundle.min.js';
  script.integrity = 'sha384-/PlzWQaWtLEXvVam2b/IewwqztM9Y75qLE2+XIsvMmc5zbLcWVF7K7o+4jTtNnIc4';
  script.crossOrigin = 'anonymous';
  document.head.appendChild(script);
  
  script.onload = () => {
    Sentry.init({
      // Replace with your actual Sentry DSN
      dsn: 'https://YOUR_SENTRY_KEY@o123456.ingest.sentry.io/123456',
      environment: APP_CONFIG.ENVIRONMENT,
      tracesSampleRate: 0.5,
      debug: APP_CONFIG.FEATURES.DEBUG_MODE,
      // Only capture errors, not breadcrumbs for performance
      integrations: [
        new Sentry.Replay({
          maskAllText: true,
          blockAllMedia: true,
        })
      ],
      replaysSessionSampleRate: 0.1, // 10% of sessions
      replaysOnErrorSampleRate: 1.0  // 100% of sessions with errors
    });
    
    Logger.info('Sentry initialized for error tracking');
  };
}

// Global error handler
window.addEventListener('error', (event) => {
  Logger.error('Unhandled error', {
    message: event.message,
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
    stack: event.error?.stack
  });
});

// Unhandled promise rejection
window.addEventListener('unhandledrejection', (event) => {
  Logger.error('Unhandled promise rejection', {
    reason: event.reason?.message || String(event.reason),
    stack: event.reason?.stack
  });
});
