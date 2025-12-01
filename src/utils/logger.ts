type LogContext = Record<string, any>;

export const logger = {
  error: (message: string, error?: Error, context?: LogContext) => {
    console.error(`[ERROR] ${message}`, {
      error: error?.message,
      stack: error?.stack,
      ...context
    });
    // В продакшене можно отправлять в Sentry/LogRocket
  },
  
  warn: (message: string, context?: LogContext) => {
    console.warn(`[WARN] ${message}`, context);
  },
  
  info: (message: string, context?: LogContext) => {
    if (import.meta.env.DEV) {
      console.log(`[INFO] ${message}`, context);
    }
  }
};

