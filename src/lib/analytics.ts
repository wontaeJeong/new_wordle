import { appConfig } from '../config/appConfig';
import { logger } from './logger';

export type AnalyticsEventName =
  | 'game_started'
  | 'guess_submitted'
  | 'game_won'
  | 'game_lost'
  | 'shared_result'
  | 'settings_changed';

export interface AnalyticsAdapter {
  track: (eventName: AnalyticsEventName, payload?: Record<string, string | number | boolean>) => void;
}

interface AnalyticsEventPayload {
  eventName: AnalyticsEventName;
  payload: Record<string, string | number | boolean>;
  appVersion: string;
  buildId: string;
  path: string;
  occurredAt: string;
}

function deliver(endpoint: string, body: AnalyticsEventPayload): void {
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
    logger.warn('Analytics delivery failed', error);
  });
}

class HttpAnalytics implements AnalyticsAdapter {
  track(eventName: AnalyticsEventName, payload: Record<string, string | number | boolean> = {}): void {
    if (!appConfig.telemetry.analyticsEnabled || appConfig.telemetry.analyticsEndpoint === null) {
      return;
    }

    deliver(appConfig.telemetry.analyticsEndpoint, {
      eventName,
      payload,
      appVersion: appConfig.version,
      buildId: appConfig.buildId,
      path: window.location.pathname,
      occurredAt: new Date().toISOString(),
    });
  }
}

export const analytics: AnalyticsAdapter = new HttpAnalytics();
