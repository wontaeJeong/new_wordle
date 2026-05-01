import { afterEach, describe, expect, it, vi } from 'vitest';
import { copyText } from '../lib/clipboard';

describe('copyText', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = '';
    Object.defineProperty(window.navigator, 'clipboard', {
      configurable: true,
      value: undefined,
    });
  });

  it('returns false and cleans up fallback textarea when legacy copy throws', async () => {
    Object.defineProperty(window.navigator, 'clipboard', {
      configurable: true,
      value: undefined,
    });
    Object.defineProperty(document, 'execCommand', {
      configurable: true,
      value: vi.fn(() => {
        throw new Error('copy unavailable');
      }),
    });

    await expect(copyText('Daily Lexicon')).resolves.toBe(false);
    expect(document.querySelector('textarea')).toBeNull();
  });
});
