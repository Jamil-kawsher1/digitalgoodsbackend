/**
 * Simple logging utility that respects LOGGING_ENABLED environment variable
 */

const isLoggingEnabled = process.env.LOGGING_ENABLED !== 'false';

const logger = {
  info: (message, ...args) => {
    if (isLoggingEnabled) {
      console.log(`[INFO] ${new Date().toISOString()} - ${message}`, ...args);
    }
  },
  
  error: (message, ...args) => {
    if (isLoggingEnabled) {
      console.error(`[ERROR] ${new Date().toISOString()} - ${message}`, ...args);
    }
  },
  
  warn: (message, ...args) => {
    if (isLoggingEnabled) {
      console.warn(`[WARN] ${new Date().toISOString()} - ${message}`, ...args);
    }
  },
  
  debug: (message, ...args) => {
    if (isLoggingEnabled && process.env.NODE_ENV === 'development') {
      console.log(`[DEBUG] ${new Date().toISOString()} - ${message}`, ...args);
    }
  },
  
  log: (message, ...args) => {
    if (isLoggingEnabled) {
      console.log(`[LOG] ${new Date().toISOString()} - ${message}`, ...args);
    }
  }
};

module.exports = logger;
