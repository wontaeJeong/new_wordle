import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ErrorBoundary } from '../ErrorBoundary';

const { capture, loggerError } = vi.hoisted(() => ({
  capture: vi.fn(),
  loggerError: vi.fn(),
}));

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

function ThrowingChild(): never {
  throw new Error('render failed');
}

describe('ErrorBoundary', () => {
  afterEach(() => {
    capture.mockReset();
    loggerError.mockReset();
  });

  it('shows a recovery screen and reports the crash', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    render(
      <ErrorBoundary>
        <ThrowingChild />
      </ErrorBoundary>,
    );

    expect(screen.getByRole('alert')).toHaveTextContent('Something went wrong.');
    expect(screen.getByRole('button', { name: 'Reload app' })).toBeInTheDocument();

    await waitFor(() => {
      expect(loggerError).toHaveBeenCalledWith('Application crashed', {
        error: expect.any(Error),
        errorInfo: expect.objectContaining({ componentStack: expect.any(String) }),
      });
      expect(capture).toHaveBeenCalledWith(expect.any(Error), {
        componentStack: expect.any(String),
      });
    });

    consoleError.mockRestore();
  });
});
