import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const capture = vi.fn();
const loggerError = vi.fn();

vi.mock('../lib/errorReporting', () => ({
  errorReporting: {
    capture,
  },
}));

vi.mock('../lib/logger', () => ({
  logger: {
    error: loggerError,
  },
}));

describe('setupGlobalErrorHandlers', () => {
  beforeEach(() => {
    capture.mockReset();
    loggerError.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it('registers a handler for uncaught window errors', async () => {
    const addEventListener = vi.spyOn(window, 'addEventListener');
    const { setupGlobalErrorHandlers } = await import('../lib/errors');

    setupGlobalErrorHandlers();

    const errorHandler = addEventListener.mock.calls.find(([type]) => type === 'error')?.[1] as
      | ((event: ErrorEvent) => void)
      | undefined;

    expect(errorHandler).toBeTypeOf('function');

    errorHandler?.({ error: new Error('boom'), message: 'fallback' } as ErrorEvent);

    expect(loggerError).toHaveBeenCalledWith('Unhandled window error', expect.any(Error));
    expect(capture).toHaveBeenCalledWith(expect.any(Error), { type: 'window-error' });
  });

  it('registers a handler for unhandled promise rejections', async () => {
    const addEventListener = vi.spyOn(window, 'addEventListener');
    const { setupGlobalErrorHandlers } = await import('../lib/errors');

    setupGlobalErrorHandlers();

    const rejectionHandler = addEventListener.mock.calls.find(([type]) => type === 'unhandledrejection')?.[1] as
      | ((event: PromiseRejectionEvent) => void)
      | undefined;

    expect(rejectionHandler).toBeTypeOf('function');

    rejectionHandler?.({ reason: 'bad promise' } as PromiseRejectionEvent);

    expect(loggerError).toHaveBeenCalledWith('Unhandled promise rejection', 'bad promise');
    expect(capture).toHaveBeenCalledWith('bad promise', { type: 'unhandled-rejection' });
  });
});
