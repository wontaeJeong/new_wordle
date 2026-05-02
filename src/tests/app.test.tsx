import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../App';
import { ALLOWED_GUESSES } from '../data/allowedGuesses';
import { ANSWER_SET_VERSION } from '../data/answers';
import { REVEAL_MS, STORAGE_KEY, STORAGE_VERSION, WORD_LENGTH } from '../game/constants';
import { evaluateGuess } from '../game/evaluateGuess';
import { getDailyPuzzle } from '../game/puzzle';
import { validateHardModeGuess } from '../game/hardMode';

const REVEAL_DURATION_MS = REVEAL_MS * WORD_LENGTH;
const TEST_USER = 'player@example.com';

function jsonResponse(status: number, body: unknown) {
  return Promise.resolve(new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  }));
}

function getRequestUrl(input: RequestInfo | URL): string {
  if (typeof input === 'string') {
    return input;
  }

  if (input instanceof URL) {
    return input.pathname;
  }

  return input.url;
}

function mockAuthenticatedSession() {
  const fetchMock = vi.fn((input: RequestInfo | URL) => {
    const url = getRequestUrl(input);

    if (url.endsWith('/api/auth/session')) {
      return jsonResponse(200, {
        user: { username: TEST_USER },
        expiresAt: new Date(Date.now() + 60_000).toISOString(),
      });
    }

    if (url.endsWith('/api/auth/logout')) {
      return jsonResponse(200, { ok: true });
    }

    return jsonResponse(404, { message: `Unhandled auth test request: ${url}` });
  });

  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

async function renderAuthenticatedApp() {
  const rendered = render(<App />);
  await flushAuthPromises();
  screen.getByRole('heading', { name: 'Daily Lexicon' });
  return rendered;
}

async function flushAuthPromises() {
  await act(async () => {
    for (let count = 0; count < 5; count += 1) {
      await Promise.resolve();
    }
  });
}

function pressKey(key: string) {
  fireEvent.keyDown(window, { key });
}

function typeWord(word: string) {
  word.split('').forEach((letter) => {
    pressKey(letter);
  });
}

function findHardModeScenario(answer: string) {
  const candidate = ALLOWED_GUESSES.map((word) => word.toUpperCase()).find((guess) => {
    if (guess === answer) {
      return false;
    }

    const evaluation = evaluateGuess(guess, answer);
    const hasConstraint = evaluation.statuses.some((status) => status === 'correct' || status === 'present');
    return hasConstraint;
  });

  if (!candidate) {
    throw new Error('No hard mode seed guess found.');
  }

  const priorEvaluations = [evaluateGuess(candidate, answer)];
  const violatingGuess = ALLOWED_GUESSES.map((word) => word.toUpperCase()).find((guess) => {
    if (guess === candidate || guess === answer) {
      return false;
    }

    return !validateHardModeGuess(guess, priorEvaluations).valid;
  });

  if (!violatingGuess) {
    throw new Error('No violating hard mode guess found.');
  }

  return {
    seedGuess: candidate,
    violatingGuess,
    violationReason: validateHardModeGuess(violatingGuess, priorEvaluations).reason,
  };
}

describe('App integration', () => {
  beforeEach(() => {
    window.localStorage.clear();
    mockAuthenticatedSession();
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 3, 20, 12, 0));
    Object.defineProperty(window.navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('requires login and signs in through the auth API', async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const url = getRequestUrl(input);

      if (url.endsWith('/api/auth/session')) {
        return jsonResponse(401, { message: 'Authentication required.' });
      }

      if (url.endsWith('/api/auth/login')) {
        return jsonResponse(200, {
          user: { username: TEST_USER },
          expiresAt: new Date(Date.now() + 60_000).toISOString(),
        });
      }

      return jsonResponse(404, { message: `Unhandled auth test request: ${url}` });
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<App />);
    await flushAuthPromises();

    expect(screen.getByRole('heading', { name: 'Sign in to Daily Lexicon' })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Username'), { target: { value: TEST_USER } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'correct horse battery staple' } });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
      await Promise.resolve();
    });

    expect(screen.getByRole('heading', { name: 'Daily Lexicon' })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith('/api/auth/login', expect.objectContaining({ credentials: 'include' }));
  });

  it('supports typing letters and deleting them', async () => {
    const { container } = await renderAuthenticatedApp();
    const firstRow = container.querySelectorAll('.board-row')[0];
    const tiles = firstRow?.querySelectorAll('.tile');

    typeWord('CIG');
    expect(tiles?.[0].textContent).toBe('C');
    expect(tiles?.[1].textContent).toBe('I');
    expect(tiles?.[2].textContent).toBe('G');

    pressKey('Backspace');
    expect(tiles?.[2].textContent).toBe('');
  });

  it('submits a valid guess and keeps it on the board', async () => {
    const { container } = await renderAuthenticatedApp();

    typeWord('CIGAR');
    pressKey('Enter');
    act(() => {
      vi.advanceTimersByTime(REVEAL_DURATION_MS);
    });

    const firstRowTiles = container.querySelectorAll('.board-row')[0]?.querySelectorAll('.tile') ?? [];
    expect(Array.from(firstRowTiles).map((tile) => tile.textContent).join('')).toBe('CIGAR');
  });

  it('rejects invalid guesses without consuming a turn', async () => {
    await renderAuthenticatedApp();

    typeWord('ZZZZZ');
    pressKey('Enter');

    expect(screen.getByRole('status')).toHaveTextContent('Not in word list');
    expect(screen.queryByRole('button', { name: 'Share result' })).not.toBeInTheDocument();
  });

  it('completes a win flow and allows sharing', async () => {
    const puzzle = getDailyPuzzle(new Date(2026, 3, 20, 12, 0));
    await renderAuthenticatedApp();

    typeWord(puzzle.answer);
    pressKey('Enter');
    act(() => {
      vi.advanceTimersByTime(REVEAL_DURATION_MS);
    });

    expect(screen.getByRole('heading', { name: 'Puzzle solved' })).toBeInTheDocument();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Share result' }));
      await Promise.resolve();
    });
    expect(navigator.clipboard.writeText).toHaveBeenCalled();
  });

  it('hides stats sharing until the reveal animation finishes', async () => {
    const puzzle = getDailyPuzzle(new Date(2026, 3, 20, 12, 0));
    await renderAuthenticatedApp();

    typeWord(puzzle.answer);
    pressKey('Enter');

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Open statistics dialog' }));
    });

    const statsDialog = screen.getByRole('dialog', { name: 'Statistics' });
    expect(within(statsDialog).queryByRole('button', { name: 'Share result' })).not.toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(REVEAL_DURATION_MS);
    });

    expect(within(statsDialog).getByRole('button', { name: 'Share result' })).toBeInTheDocument();
  });

  it('restores a completed game correctly when reloading during reveal', async () => {
    const puzzle = getDailyPuzzle(new Date(2026, 3, 20, 12, 0));
    const { unmount } = await renderAuthenticatedApp();

    typeWord(puzzle.answer);
    pressKey('Enter');

    expect(screen.queryByRole('heading', { name: 'Puzzle solved' })).not.toBeInTheDocument();
    expect(window.localStorage.getItem(STORAGE_KEY)).toContain('"status":"won"');

    unmount();
    await renderAuthenticatedApp();

    expect(screen.getByRole('heading', { name: 'Puzzle solved' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Share result' })).toBeInTheDocument();
  });

  it('rolls over to a fresh daily puzzle when the date changes in the same session', async () => {
    vi.setSystemTime(new Date(2026, 3, 20, 23, 59, 58, 500));
    const nextPuzzle = getDailyPuzzle(new Date(2026, 3, 21, 0, 0, 0, 0));

    await renderAuthenticatedApp();
    typeWord('CI');
    expect(screen.getByText('Turn 1 of 6. 2 of 5 letters entered.')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(1500);
    });

    expect(screen.getByText('Turn 1 of 6. 0 of 5 letters entered.')).toBeInTheDocument();
    expect(window.localStorage.getItem(STORAGE_KEY)).toContain(`"puzzleId":"${nextPuzzle.id}"`);
    expect(window.localStorage.getItem(STORAGE_KEY)).toContain('"currentGuess":""');
    expect(window.localStorage.getItem(STORAGE_KEY)).toContain('"status":"in_progress"');
  });

  it('rolls over to a fresh daily puzzle when the app regains focus on a new day', async () => {
    vi.setSystemTime(new Date(2026, 3, 20, 12, 0, 0, 0));
    const nextPuzzle = getDailyPuzzle(new Date(2026, 3, 21, 12, 0, 0, 0));

    await renderAuthenticatedApp();
    typeWord('CI');
    expect(screen.getByText('Turn 1 of 6. 2 of 5 letters entered.')).toBeInTheDocument();

    act(() => {
      vi.setSystemTime(new Date(2026, 3, 21, 12, 0, 0, 0));
      window.dispatchEvent(new Event('focus'));
    });

    expect(screen.getByText('Turn 1 of 6. 0 of 5 letters entered.')).toBeInTheDocument();
    expect(window.localStorage.getItem(STORAGE_KEY)).toContain(`"puzzleId":"${nextPuzzle.id}"`);
    expect(window.localStorage.getItem(STORAGE_KEY)).toContain('"currentGuess":""');
  });

  it('rolls over to a fresh daily puzzle when the tab becomes visible on a new day', async () => {
    vi.setSystemTime(new Date(2026, 3, 20, 12, 0, 0, 0));
    const nextPuzzle = getDailyPuzzle(new Date(2026, 3, 21, 12, 0, 0, 0));

    await renderAuthenticatedApp();
    typeWord('CI');
    expect(screen.getByText('Turn 1 of 6. 2 of 5 letters entered.')).toBeInTheDocument();

    const originalVisibilityState = Object.getOwnPropertyDescriptor(document, 'visibilityState');
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      value: 'visible',
    });

    act(() => {
      vi.setSystemTime(new Date(2026, 3, 21, 12, 0, 0, 0));
      document.dispatchEvent(new Event('visibilitychange'));
    });

    expect(screen.getByText('Turn 1 of 6. 0 of 5 letters entered.')).toBeInTheDocument();
    expect(window.localStorage.getItem(STORAGE_KEY)).toContain(`"puzzleId":"${nextPuzzle.id}"`);
    expect(window.localStorage.getItem(STORAGE_KEY)).toContain('"currentGuess":""');

    if (originalVisibilityState) {
      Object.defineProperty(document, 'visibilityState', originalVisibilityState);
    }
  });

  it('completes a lose flow after six wrong guesses', async () => {
    const puzzle = getDailyPuzzle(new Date(2026, 3, 20, 12, 0));
    const wrongGuess = puzzle.answer === 'CIGAR' ? 'REBUT' : 'CIGAR';
    await renderAuthenticatedApp();

    for (let count = 0; count < 6; count += 1) {
      typeWord(wrongGuess);
      pressKey('Enter');
      act(() => {
        vi.advanceTimersByTime(REVEAL_DURATION_MS);
      });
    }

    expect(screen.getByText(`The answer was ${puzzle.answer}.`)).toBeInTheDocument();
  });

  it('restores a saved game from localStorage', async () => {
    const puzzle = getDailyPuzzle(new Date(2026, 3, 20, 12, 0));
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: STORAGE_VERSION,
        answerSetVersion: ANSWER_SET_VERSION,
        puzzleId: puzzle.id,
        guesses: ['cigar'],
        currentGuess: 're',
        status: 'in_progress',
        settings: { darkMode: false, highContrast: false, hardMode: false, reduceMotion: false },
        stats: {
          gamesPlayed: 0,
          wins: 0,
          currentStreak: 0,
          maxStreak: 0,
          guessDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 },
          lastCompletedPuzzleId: null,
        },
      }),
    );

    const { container } = await renderAuthenticatedApp();
    expect(screen.getAllByText('C').length).toBeGreaterThan(0);
    const firstFutureRow = container.querySelectorAll('.board-row')[1];
    expect(within(firstFutureRow as HTMLElement).getAllByText('R').length).toBeGreaterThan(0);
  });

  it('persists settings changes', async () => {
    await renderAuthenticatedApp();

    fireEvent.click(screen.getByRole('button', { name: 'Open settings dialog' }));
    fireEvent.click(screen.getByRole('checkbox', { name: /Dark mode/i }));

    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(window.localStorage.getItem(STORAGE_KEY)).toContain('"darkMode":true');
  });

  it('traps focus inside dialogs for keyboard users', async () => {
    await renderAuthenticatedApp();

    fireEvent.click(screen.getByRole('button', { name: 'Open settings dialog' }));
    const closeButton = screen.getByRole('button', { name: 'Close Settings' });
    expect(closeButton).toHaveFocus();
  });

  it('announces live board progress for assistive technology', async () => {
    await renderAuthenticatedApp();

    expect(screen.getByText('Turn 1 of 6. 0 of 5 letters entered.')).toBeInTheDocument();
    typeWord('CI');
    expect(screen.getByText('Turn 1 of 6. 2 of 5 letters entered.')).toBeInTheDocument();
  });

  it('enforces hard mode in the UI without consuming a turn', async () => {
    const puzzle = getDailyPuzzle(new Date(2026, 3, 20, 12, 0));
    const scenario = findHardModeScenario(puzzle.answer);

    await renderAuthenticatedApp();
    fireEvent.click(screen.getByRole('button', { name: 'Open settings dialog' }));
    fireEvent.click(screen.getByRole('checkbox', { name: /Hard mode/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Close Settings' }));

    typeWord(scenario.seedGuess);
    pressKey('Enter');
    act(() => {
      vi.advanceTimersByTime(REVEAL_DURATION_MS);
    });

    typeWord(scenario.violatingGuess);
    pressKey('Enter');

    expect(screen.getByRole('status')).toHaveTextContent(scenario.violationReason ?? 'Hard mode violation');
    expect(screen.getByText((content) => content.includes(`Row 1: ${scenario.seedGuess}.`))).toBeInTheDocument();
    expect(screen.getByText((content) => content.includes(`Active row 2: ${scenario.violatingGuess}.`))).toBeInTheDocument();
  });

  it('shows a clear message when sharing fails without clipboard support', async () => {
    const puzzle = getDailyPuzzle(new Date(2026, 3, 20, 12, 0));
    Object.defineProperty(window.navigator, 'clipboard', {
      configurable: true,
      value: undefined,
    });
    Object.defineProperty(document, 'execCommand', {
      configurable: true,
      value: vi.fn().mockReturnValue(false),
    });

    await renderAuthenticatedApp();
    typeWord(puzzle.answer);
    pressKey('Enter');
    act(() => {
      vi.advanceTimersByTime(REVEAL_DURATION_MS);
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Share result' }));
      await Promise.resolve();
    });

    expect(screen.getByRole('status')).toHaveTextContent('Copy failed');
  });
});
