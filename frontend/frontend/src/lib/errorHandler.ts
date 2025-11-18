// Centralized error handling utility

export interface AppError {
  message: string;
  code?: string;
  status?: number;
  userMessage: string;
}

// Map error codes to user-friendly messages
const errorMessages: Record<string, string> = {
  '23505': 'This record already exists. Please check for duplicates.',
  '23503': 'Invalid reference data. Please check your input.',
  '22P02': 'Invalid data format. Please check your field values.',
  '42501': 'Permission denied. Please check your database access.',
  'PGRST116': 'Database table does not exist. Please run the setup script.',
  'NETWORK_ERROR': 'Network error. Please check your internet connection.',
  'AUTH_ERROR': 'Authentication failed. Please login again.',
  'VALIDATION_ERROR': 'Invalid input. Please check your data.',
  'NOT_FOUND': 'The requested item was not found.',
  'INSUFFICIENT_STOCK': 'Insufficient stock available.',
};

// Extract user-friendly error message
export const getErrorMessage = (error: any): string => {
  // If it's already a user-friendly message, return it
  if (typeof error === 'string') {
    return error;
  }

  // Check for error code
  if (error?.code && errorMessages[error.code]) {
    return errorMessages[error.code];
  }

  // Check for specific error messages
  const errorMessage = error?.message || error?.error || String(error);

  // Map common error patterns
  if (errorMessage.includes('permission') || errorMessage.includes('denied')) {
    return 'Permission denied. Please check your access rights.';
  }
  if (errorMessage.includes('network') || errorMessage.includes('fetch') || errorMessage.includes('timeout')) {
    return 'Network error. Please check your internet connection and try again.';
  }
  if (errorMessage.includes('duplicate') || errorMessage.includes('already exists')) {
    return 'This record already exists. Please check for duplicates.';
  }
  if (errorMessage.includes('not found') || errorMessage.includes('does not exist')) {
    return 'The requested item was not found. It may have been deleted.';
  }
  if (errorMessage.includes('validation') || errorMessage.includes('invalid')) {
    return 'Invalid input. Please check your data and try again.';
  }
  if (errorMessage.includes('stock') || errorMessage.includes('quantity')) {
    return errorMessage; // Keep stock-related messages as they're usually specific
  }

  // Default fallback
  return errorMessage || 'An unexpected error occurred. Please try again.';
};

// Safe error handler that never crashes the app
export const safeErrorHandler = (error: any, context: string = 'Operation'): AppError => {
  console.error(`[${context}] Error:`, error);

  return {
    message: error?.message || String(error),
    code: error?.code,
    status: error?.status || error?.response?.status,
    userMessage: getErrorMessage(error),
  };
};

// Wrapper for async functions with error handling
export const withErrorHandling = async <T>(
  fn: () => Promise<T>,
  context: string = 'Operation'
): Promise<{ data?: T; error?: AppError }> => {
  try {
    const data = await fn();
    return { data };
  } catch (error: any) {
    const appError = safeErrorHandler(error, context);
    return { error: appError };
  }
};

// Retry helper with exponential backoff
export const retryWithBackoff = async <T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 1000
): Promise<T> => {
  let lastError: any;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;

      // Don't retry on certain errors
      if (error?.code === '23505' || error?.code === '42501') {
        throw error;
      }

      if (attempt < maxRetries) {
        const delay = initialDelay * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
};

