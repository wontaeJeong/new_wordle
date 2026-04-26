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
});
