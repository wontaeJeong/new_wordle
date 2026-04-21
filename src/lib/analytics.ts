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

class NoopAnalytics implements AnalyticsAdapter {
  track(): void {
    // intentionally noop
  }
}

export const analytics: AnalyticsAdapter = new NoopAnalytics();
