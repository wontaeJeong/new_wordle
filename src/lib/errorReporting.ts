import { appConfig } from '../config/appConfig';
import { logger } from './logger';

export interface ErrorReportingAdapter {
  capture: (error: unknown, context?: Record<string, unknown>) => void;
}

class NoopErrorReporting implements ErrorReportingAdapter {
  capture(error: unknown, context?: Record<string, unknown>): void {
    if (!appConfig.telemetry.errorReportingEnabled) {
      return;
    }

    logger.error('Error reporting enabled without provider', { error, context });
  }
}

export const errorReporting: ErrorReportingAdapter = new NoopErrorReporting();
