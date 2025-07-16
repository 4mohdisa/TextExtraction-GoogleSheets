// Suppress browser extension errors more aggressively
(function() {
  'use strict';
  
  // Override console methods to filter extension errors
  const originalConsoleError = console.error;
  const originalConsoleWarn = console.warn;
  const originalConsoleLog = console.log;
  
  const shouldSuppressMessage = (message) => {
    if (typeof message !== 'string') return false;
    
    const suppressPatterns = [
      'Sentry',
      'Testsigma',
      'browser extension',
      'extension',
      'chrome-extension',
      'moz-extension',
      'LOCATOR Mutation detected',
      'debug LOCATOR'
    ];
    
    return suppressPatterns.some(pattern => 
      message.toLowerCase().includes(pattern.toLowerCase())
    );
  };
  
  console.error = function(...args) {
    if (args.length > 0 && shouldSuppressMessage(args[0])) {
      return;
    }
    originalConsoleError.apply(console, args);
  };
  
  console.warn = function(...args) {
    if (args.length > 0 && shouldSuppressMessage(args[0])) {
      return;
    }
    originalConsoleWarn.apply(console, args);
  };
  
  console.log = function(...args) {
    if (args.length > 0 && shouldSuppressMessage(args[0])) {
      return;
    }
    originalConsoleLog.apply(console, args);
  };
  
  // Handle unhandled promise rejections
  window.addEventListener('unhandledrejection', function(event) {
    const reason = event.reason;
    if (reason && (
      shouldSuppressMessage(reason.message) ||
      shouldSuppressMessage(reason.toString()) ||
      (reason.stack && shouldSuppressMessage(reason.stack))
    )) {
      event.preventDefault();
    }
  });
  
  // Handle global errors
  window.addEventListener('error', function(event) {
    if (shouldSuppressMessage(event.message) || 
        shouldSuppressMessage(event.filename) ||
        (event.error && shouldSuppressMessage(event.error.message))) {
      event.preventDefault();
    }
  });
  
})();