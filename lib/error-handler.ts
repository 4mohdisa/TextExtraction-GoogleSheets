// Error handler to suppress browser extension errors
export function suppressBrowserExtensionErrors() {
  if (typeof window !== 'undefined') {
    // Override console.error to filter out Sentry extension errors
    const originalError = console.error;
    console.error = (...args: unknown[]) => {
      const message = args[0];
      
      // Filter out Sentry browser extension errors
      if (
        typeof message === 'string' &&
        (message.includes('[Sentry]') || 
         message.includes('browser extension') ||
         message.includes('Testsigma'))
      ) {
        return; // Suppress these errors
      }
      
      // Call original console.error for other errors
      originalError.apply(console, args);
    };

    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      const error = event.reason;
      
      // Suppress Sentry and extension-related errors
      if (
        error?.message?.includes('Sentry') ||
        error?.message?.includes('extension') ||
        error?.stack?.includes('extension')
      ) {
        event.preventDefault();
        return;
      }
    });

    // Handle global errors
    window.addEventListener('error', (event) => {
      const error = event.error;
      
      // Suppress Sentry and extension-related errors
      if (
        error?.message?.includes('Sentry') ||
        error?.message?.includes('extension') ||
        error?.stack?.includes('extension') ||
        event.filename?.includes('extension')
      ) {
        event.preventDefault();
        return;
      }
    });
  }
}

// Application-specific error handler
export function handleApplicationError(error: Error, context?: string) {
  // Log error for debugging
  console.error(`Application error${context ? ` in ${context}` : ''}:`, error);
  
  // Return user-friendly error message
  if (error.message.includes('timeout')) {
    return 'Request timed out. Please try again.';
  } else if (error.message.includes('504')) {
    return 'Server is temporarily unavailable. Please try again in a moment.';
  } else if (error.message.includes('429')) {
    return 'Too many requests. Please wait a moment before trying again.';
  } else if (error.message.includes('401')) {
    return 'Authentication failed. Please check your configuration.';
  } else if (error.message.includes('403')) {
    return 'Access denied. Please check your permissions.';
  } else if (error.message.includes('network')) {
    return 'Network error. Please check your internet connection.';
  } else if (error.message.includes('parse')) {
    return 'Failed to process the response. Please try again.';
  }
  
  return error.message || 'An unexpected error occurred.';
}