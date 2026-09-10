/**
 * Global Configuration
 * Centralized Supabase and app settings
 * Import this in every HTML page before other scripts
 */

const APP_CONFIG = {
  // Supabase
  SUPABASE_URL: 'https://vauudtedojtcveiqajlr.supabase.co',
  SUPABASE_ANON_KEY: 'sb_publishable_mKrbrP7s7BLQgb6u0IQ8xg_wn--izVE',
  
  // API
  API_BASE: typeof window !== 'undefined' && window.location.hostname === 'localhost' 
    ? 'http://localhost:8000' 
    : 'https://your-api-domain.com',
  
  // Feature flags
  FEATURES: {
    AI_ENABLED: true,
    VOICE_ENABLED: true,
    ANALYTICS_ENABLED: true,
    ERROR_TRACKING_ENABLED: true,
    DEBUG_MODE: false // Set to true for development
  },
  
  // UI
  THEME: {
    PRIMARY: '#141F38',      // ink
    ACCENT: '#C9A24E',       // gold
    BACKGROUND: '#FBF7EF',   // cream
    TEXT: '#2B2B2B',         // charcoal
    BORDER: '#E9E2D2'        // line
  },
  
  // Timeouts & limits
  TIMEOUTS: {
    AUTH_CHECK: 10000,       // 10 seconds
    API_CALL: 30000,         // 30 seconds
    WEBSOCKET: 5000          // 5 seconds
  },
  
  // Environment
  ENVIRONMENT: typeof window !== 'undefined' && window.location.hostname === 'localhost' 
    ? 'development' 
    : 'production',
  
  // Logging
  LOG_LEVEL: typeof window !== 'undefined' && window.location.hostname === 'localhost' 
    ? 'debug' 
    : 'info',
  
  // Get a config value safely
  get(path) {
    const keys = path.split('.');
    let value = this;
    for (const key of keys) {
      value = value[key];
      if (value === undefined) return undefined;
    }
    return value;
  }
};

// Export for both browser and Node.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = APP_CONFIG;
}
