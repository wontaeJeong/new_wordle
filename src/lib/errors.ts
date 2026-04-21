import { errorReporting } from './errorReporting';
import { logger } from './logger';

export function setupGlobalErrorHandlers(): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.addEventListener('error', (event) => {
    logger.error('Unhandled window error', event.error ?? event.message);
    errorReporting.capture(event.error ?? event.message, { type: 'window-error' });
  });

  window.addEventListener('unhandledrejection', (event) => {
    logger.error('Unhandled promise rejection', event.reason);
    errorReporting.capture(event.reason, { type: 'unhandled-rejection' });
  });
}
