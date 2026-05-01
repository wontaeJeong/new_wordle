import { afterEach, describe, expect, it, vi } from 'vitest';

const loggerWarn = vi.fn();

vi.mock('../lib/logger', () => ({
  logger: {
    warn: loggerWarn,
  },
}));

async function loadAnalytics(enabled: boolean, endpoint = '/api/analytics') {
  vi.resetModules();
  vi.unstubAllEnvs();
  vi.stubEnv('MODE', 'test');
  vi.stubEnv('DEV', true);
  vi.stubEnv('PROD', false);
  vi.stubEnv('VITE_ENABLE_ANALYTICS', enabled ? 'true' : 'false');
  if (enabled) {
    vi.stubEnv('VITE_ANALYTICS_ENDPOINT', endpoint);
  }

  return import('../lib/analytics');
}

describe('analytics', () => {
  afterEach(() => {
    loggerWarn.mockReset();
    vi.resetModules();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('does nothing when analytics is disabled', async () => {
    const fetchSpy = vi.spyOn(window, 'fetch');
    const { analytics } = await loadAnalytics(false);

    analytics.track('game_started', { puzzleNumber: 1 });

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('posts analytics events when configured', async () => {
    const fetchSpy = vi.spyOn(window, 'fetch').mockResolvedValue(new Response(null, { status: 204 }));
    Object.defineProperty(window.navigator, 'sendBeacon', {
      configurable: true,
      value: undefined,
    });
    const { analytics } = await loadAnalytics(true);

    analytics.track('guess_submitted', { puzzleNumber: 10, turn: 2 });

    expect(fetchSpy).toHaveBeenCalledWith(
      'http://localhost:3000/api/analytics',
      expect.objectContaining({
        method: 'POST',
        keepalive: true,
        credentials: 'omit',
      }),
    );
    expect(JSON.parse(fetchSpy.mock.calls[0][1]?.body as string)).toEqual(
      expect.objectContaining({
        eventName: 'guess_submitted',
        payload: { puzzleNumber: 10, turn: 2 },
        path: '/',
      }),
    );
  });

  it('uses fetch for cross-origin analytics to omit credentials', async () => {
    const fetchSpy = vi.spyOn(window, 'fetch').mockResolvedValue(new Response(null, { status: 204 }));
    const sendBeacon = vi.fn(() => true);
    Object.defineProperty(window.navigator, 'sendBeacon', {
      configurable: true,
      value: sendBeacon,
    });
    const { analytics } = await loadAnalytics(true, 'https://telemetry.example.com/analytics');

    analytics.track('game_started');

    expect(sendBeacon).not.toHaveBeenCalled();
    expect(fetchSpy).toHaveBeenCalledWith(
      'https://telemetry.example.com/analytics',
      expect.objectContaining({
        credentials: 'omit',
        keepalive: true,
        method: 'POST',
      }),
    );
  });
});
