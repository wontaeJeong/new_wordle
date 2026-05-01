import { appConfig } from '../config/appConfig';
import { logger } from './logger';

export interface ErrorReportingAdapter {
  capture: (error: unknown, context?: Record<string, unknown>) => void;
}

interface ErrorReportPayload {
  message: string;
  name: string;
  stack: string | null;
  context: Record<string, unknown>;
  appVersion: string;
  buildId: string;
  path: string;
  occurredAt: string;
}

type SerializedUnknown = string | number | boolean | null | Record<string, string | null>;

function serializeUnknown(value: unknown): SerializedUnknown {
  if (value === null) {
    return null;
  }

  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }

  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: value.stack ?? null,
    };
  }

  try {
    return JSON.stringify(value) ?? String(value);
  } catch {
    return String(value);
  }
}

function normalizeContext(context: Record<string, unknown>): Record<string, SerializedUnknown> {
  return Object.fromEntries(Object.entries(context).map(([key, value]) => [key, serializeUnknown(value)]));
}

function normalizeError(error: unknown): Pick<ErrorReportPayload, 'message' | 'name' | 'stack'> {
  if (error instanceof Error) {
    return {
      message: error.message,
      name: error.name,
      stack: error.stack ?? null,
    };
  }

  return {
    message: typeof error === 'string' ? error : String(serializeUnknown(error)),
    name: 'NonError',
    stack: null,
  };
}

function deliver(endpoint: string, body: ErrorReportPayload): void {
  const serialized = JSON.stringify(body);

  if (new URL(endpoint, window.location.origin).origin === window.location.origin && navigator.sendBeacon) {
    const sent = navigator.sendBeacon(endpoint, new Blob([serialized], { type: 'application/json' }));
    if (sent) {
      return;
    }
  }

  void fetch(endpoint, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: serialized,
    keepalive: true,
    credentials: 'omit',
  }).catch((error: unknown) => {
    logger.warn('Error report delivery failed', error);
  });
}

class HttpErrorReporting implements ErrorReportingAdapter {
  capture(error: unknown, context: Record<string, unknown> = {}): void {
    if (!appConfig.telemetry.errorReportingEnabled || appConfig.telemetry.errorReportingEndpoint === null) {
      return;
    }

    deliver(appConfig.telemetry.errorReportingEndpoint, {
      ...normalizeError(error),
      context: normalizeContext(context),
      appVersion: appConfig.version,
      buildId: appConfig.buildId,
      path: window.location.pathname,
      occurredAt: new Date().toISOString(),
    });
  }
}

export const errorReporting: ErrorReportingAdapter = new HttpErrorReporting();
