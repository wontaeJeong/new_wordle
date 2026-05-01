import { afterEach, describe, expect, it, vi } from 'vitest';

function resetEnv() {
  vi.unstubAllEnvs();
  vi.stubEnv('MODE', 'test');
  vi.stubEnv('DEV', true);
  vi.stubEnv('PROD', false);
}

async function loadAppConfig(overrides: Record<string, string | undefined> = {}) {
  vi.resetModules();
  resetEnv();

  for (const [key, value] of Object.entries(overrides)) {
    vi.stubEnv(key, value);
  }

  return import('../config/appConfig');
}

describe('appConfig', () => {
  afterEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  it('uses safe defaults when optional env vars are absent', async () => {
    const { appConfig } = await loadAppConfig();

    expect(appConfig.mode).toBe('test');
    expect(appConfig.appTitle).toBe('Daily Lexicon');
    expect(appConfig.puzzleEpoch).toBe('2024-01-01');
    expect(appConfig.telemetry.analyticsEnabled).toBe(false);
    expect(appConfig.telemetry.errorReportingEnabled).toBe(false);
    expect(appConfig.telemetry.analyticsProvider).toBe('none');
    expect(appConfig.telemetry.analyticsEndpoint).toBeNull();
    expect(appConfig.telemetry.errorReportingEndpoint).toBeNull();
  });

  it('trims configured text env vars', async () => {
    const { appConfig } = await loadAppConfig({
      VITE_APP_TITLE: '  Nightly Lexicon  ',
      VITE_BUILD_ID: '  build-42  ',
    });

    expect(appConfig.appTitle).toBe('Nightly Lexicon');
    expect(appConfig.buildId).toBe('build-42');
  });

  it('rejects invalid boolean env values', async () => {
    await expect(loadAppConfig({ VITE_ENABLE_ANALYTICS: 'yes' })).rejects.toThrow(
      'Invalid boolean env value: yes',
    );
  });

  it('rejects invalid puzzle epoch formats', async () => {
    await expect(loadAppConfig({ VITE_PUZZLE_EPOCH: '2024/01/01' })).rejects.toThrow(
      'VITE_PUZZLE_EPOCH must use YYYY-MM-DD format.',
    );
  });

  it('requires endpoints when telemetry is enabled', async () => {
    await expect(loadAppConfig({ VITE_ENABLE_ANALYTICS: 'true' })).rejects.toThrow(
      'VITE_ANALYTICS_ENDPOINT is required when VITE_ENABLE_ANALYTICS is true.',
    );
    await expect(loadAppConfig({ VITE_ENABLE_ERROR_REPORTING: 'true' })).rejects.toThrow(
      'VITE_ERROR_REPORTING_ENDPOINT is required when VITE_ENABLE_ERROR_REPORTING is true.',
    );
  });

  it('normalizes configured telemetry endpoints', async () => {
    const { appConfig } = await loadAppConfig({
      VITE_ENABLE_ANALYTICS: 'true',
      VITE_ANALYTICS_ENDPOINT: '/api/analytics',
      VITE_ENABLE_ERROR_REPORTING: 'true',
      VITE_ERROR_REPORTING_ENDPOINT: 'https://telemetry.example.com/errors',
    });

    expect(appConfig.telemetry.analyticsProvider).toBe('http');
    expect(appConfig.telemetry.analyticsEndpoint).toBe('http://localhost:3000/api/analytics');
    expect(appConfig.telemetry.errorReportingEndpoint).toBe('https://telemetry.example.com/errors');
  });

  it('rejects insecure cross-origin telemetry endpoints', async () => {
    await expect(loadAppConfig({ VITE_ANALYTICS_ENDPOINT: 'http://example.com/analytics' })).rejects.toThrow(
      'VITE_ANALYTICS_ENDPOINT must be an HTTPS URL or same-origin path.',
    );
  });
});
