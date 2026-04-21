import { appConfig } from '../config/appConfig';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

function shouldLog(level: LogLevel): boolean {
  if (!appConfig.isProduction) {
    return true;
  }

  return level === 'warn' || level === 'error';
}

function write(level: LogLevel, message: string, meta?: unknown): void {
  if (!shouldLog(level)) {
    return;
  }

  const payload = meta ? [message, meta] : [message];
  if (level === 'error') {
    console.error(...payload);
    return;
  }

  if (level === 'warn') {
    console.warn(...payload);
    return;
  }

  console.info(...payload);
}

export const logger = {
  debug: (message: string, meta?: unknown) => write('debug', message, meta),
  info: (message: string, meta?: unknown) => write('info', message, meta),
  warn: (message: string, meta?: unknown) => write('warn', message, meta),
  error: (message: string, meta?: unknown) => write('error', message, meta),
};
