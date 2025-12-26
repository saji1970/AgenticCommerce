/**
 * Global Error Handler for React Native
 * Suppresses known non-critical errors that don't affect app functionality
 */

import { ErrorUtils } from 'react-native';

// Store original error handler (will be set when setupGlobalErrorHandler is called)
let originalHandler: ((error: Error, isFatal?: boolean) => void) | null = null;

/**
 * Check if an error is a known non-critical callback error
 */
function isNonCriticalCallbackError(error: any): boolean {
  if (!error || typeof error !== 'object') return false;

  const errorMessage = error.message || error.toString() || '';

  // Check for React Native bridge callback errors and warnings
  const callbackErrorPatterns = [
    /No callback found with cbID \d+ and callID \d+ for module/i,
    /Invariant Violation: No callback found/i,
    /No callback found with cbID 0 and callID 0/i,
    /Excessive number of pending callbacks/i,
    /Some pending callbacks that might have leaked/i,
  ];

  return callbackErrorPatterns.some(pattern => pattern.test(errorMessage));
}

/**
 * Global error handler that filters out non-critical errors
 */
function globalErrorHandler(error: Error, isFatal: boolean = false) {
  // Suppress known non-critical callback errors
  if (isNonCriticalCallbackError(error)) {
    // Log to console in dev mode for debugging, but don't show error screen
    if (__DEV__) {
      console.warn('[Suppressed] Non-critical callback error:', error.message);
    }
    return;
  }

  // For all other errors, use the original handler
  if (originalHandler) {
    originalHandler(error, isFatal);
  } else {
    // Fallback: log to console
    console.error('Unhandled error:', error);
  }
}

/**
 * Initialize the global error handler
 */
export function setupGlobalErrorHandler() {
  // Capture the original handler when this function is called (after React Native initializes)
  originalHandler = ErrorUtils.getGlobalHandler();
  ErrorUtils.setGlobalHandler(globalErrorHandler);
}

/**
 * Restore the original error handler
 */
export function restoreOriginalErrorHandler() {
  if (originalHandler) {
    ErrorUtils.setGlobalHandler(originalHandler);
  }
}

