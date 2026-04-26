import { afterEach, describe, expect, it, vi } from 'vitest';

const loggerError = vi.fn();

vi.mock('../lib/logger', () => ({
  logger: {
    error: loggerError,
  },
}));

async function loadErrorReporting(enabled: boolean) {
  vi.resetModules();
  vi.unstubAllEnvs();
  vi.stubEnv('MODE', 'test');
  vi.stubEnv('DEV', true);
  vi.stubEnv('PROD', false);
  vi.stubEnv('VITE_ENABLE_ERROR_REPORTING', enabled ? 'true' : 'false');

  return import('../lib/errorReporting');
}

describe('errorReporting', () => {
  afterEach(() => {
    loggerError.mockReset();
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  it('does nothing when error reporting is disabled', async () => {
    const { errorReporting } = await loadErrorReporting(false);

    errorReporting.capture(new Error('boom'), { source: 'test' });

    expect(loggerError).not.toHaveBeenCalled();
  });

  it('logs a warning path when reporting is enabled without a provider', async () => {
    const { errorReporting } = await loadErrorReporting(true);

    errorReporting.capture('boom', { source: 'test' });

    expect(loggerError).toHaveBeenCalledWith('Error reporting enabled without provider', {
      error: 'boom',
      context: { source: 'test' },
    });
  });
});
