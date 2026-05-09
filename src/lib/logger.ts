/**
 * Structured logger for AdvoAssist Hub.
 *
 * Rules:
 *  - debug / info  → only emitted in development builds
 *  - warn  / error → always emitted (safe to ship to production)
 *
 * Usage:
 *   import { createLogger } from '@/lib/logger';
 *   const log = createLogger('MyComponent');
 *   log.info('loaded', { count: 3 });
 *   log.error('fetch failed', error);
 *
 * Production upgrade path: replace the error() body with a call to
 * your error-tracking SDK (e.g. Sentry.captureException).
 */

const isDev = import.meta.env.DEV;

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface AppLogger {
  debug: (message: string, ...args: unknown[]) => void;
  info:  (message: string, ...args: unknown[]) => void;
  warn:  (message: string, ...args: unknown[]) => void;
  error: (message: string, ...args: unknown[]) => void;
}

export function createLogger(context: string): AppLogger {
  const prefix = `[${context}]`;

  function emit(level: LogLevel, message: string, args: unknown[]): void {
    const entry = args.length > 0 ? [prefix, message, ...args] : [prefix, message];
    // eslint-disable-next-line no-console
    console[level](...entry);
  }

  return {
    debug: (message, ...args) => { if (isDev) emit('debug', message, args); },
    info:  (message, ...args) => { if (isDev) emit('info',  message, args); },
    warn:  (message, ...args) => { emit('warn',  message, args); },
    error: (message, ...args) => {
      emit('error', message, args);
      // TODO: forward to error-tracking (e.g. Sentry) in production
      // if (!isDev) Sentry.captureException(args[0] ?? new Error(message));
    },
  };
}
