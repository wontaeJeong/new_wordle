import { expect, test } from '@playwright/test';
import { ALLOWED_GUESSES } from '../src/data/allowedGuesses';
import { ANSWERS } from '../src/data/answers';
import { evaluateGuess } from '../src/game/evaluateGuess';
import { validateHardModeGuess } from '../src/game/hardMode';

function getDefaultPuzzle(date: Date) {
  const epoch = new Date(2024, 0, 1);
  const toDayNumber = (value: Date) => Math.floor(Date.UTC(value.getFullYear(), value.getMonth(), value.getDate()) / 86_400_000);
  const puzzleNumber = toDayNumber(date) - toDayNumber(epoch);
  const index = ((puzzleNumber % ANSWERS.length) + ANSWERS.length) % ANSWERS.length;

  return {
    id: `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, '0')}-${`${date.getDate()}`.padStart(2, '0')}`,
    answer: ANSWERS[index].toUpperCase(),
  };
}

function findHardModeScenario(answer: string) {
  const seedGuess = ALLOWED_GUESSES.map((word) => word.toUpperCase()).find((guess) => {
    if (guess === answer) {
      return false;
    }

    return evaluateGuess(guess, answer).statuses.some((status) => status === 'correct' || status === 'present');
  });

  if (!seedGuess) {
    throw new Error('No hard mode seed guess found.');
  }

  const priorEvaluations = [evaluateGuess(seedGuess, answer)];
  const violatingGuess = ALLOWED_GUESSES.map((word) => word.toUpperCase()).find((guess) => {
    if (guess === seedGuess || guess === answer) {
      return false;
    }

    return !validateHardModeGuess(guess, priorEvaluations).valid;
  });

  if (!violatingGuess) {
    throw new Error('No violating hard mode guess found.');
  }

  return {
    seedGuess,
    violatingGuess,
    violationReason: validateHardModeGuess(violatingGuess, priorEvaluations).reason ?? 'Hard mode violation',
  };
}

test.describe('Daily Lexicon smoke', () => {
  async function mockAuthenticatedSession(page: import('@playwright/test').Page) {
    const sessionBody = () => JSON.stringify({
      user: { username: 'player@example.com' },
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
    });

    await page.route('**/api/auth/session', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: sessionBody() });
    });
    await page.route('**/api/auth/login', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: sessionBody() });
    });
    await page.route('**/api/auth/logout', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) });
    });
  }

  test.beforeEach(async ({ page }) => {
    await mockAuthenticatedSession(page);
  });

  async function seedCompletedState(page: import('@playwright/test').Page, status: 'won' | 'lost') {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: undefined,
      });

      Object.defineProperty(document, 'execCommand', {
        configurable: true,
        value: () => {
          const textarea = document.querySelector('textarea');
          (window as typeof window & { __copiedShareText?: string }).__copiedShareText = textarea?.value ?? '';
          return true;
        },
      });
    });

    await page.goto('./');
    await expect(page.getByRole('heading', { name: 'Daily Lexicon' })).toBeVisible();

    await page.evaluate((completedStatus) => {
      const raw = window.localStorage.getItem('daily-lexicon-state');
      if (!raw) {
        throw new Error('Expected initial game state to be persisted.');
      }

      const persisted = JSON.parse(raw) as {
        version: number;
        answerSetVersion: string;
        puzzleId: string;
        settings: {
          darkMode: boolean;
          highContrast: boolean;
          hardMode: boolean;
          reduceMotion: boolean;
        };
        stats: {
          gamesPlayed: number;
          wins: number;
          currentStreak: number;
          maxStreak: number;
          guessDistribution: Record<1 | 2 | 3 | 4 | 5 | 6, number>;
          lastCompletedPuzzleId: string | null;
        };
      };

      const guesses = completedStatus === 'won' ? ['CIGAR'] : ['REBUT', 'SISSY', 'HUMPH', 'AWAKE', 'BLUSH', 'FOCAL'];

      window.localStorage.setItem(
        'daily-lexicon-state',
        JSON.stringify({
          version: persisted.version,
          answerSetVersion: persisted.answerSetVersion,
          puzzleId: persisted.puzzleId,
          guesses,
          currentGuess: '',
          status: completedStatus,
          settings: persisted.settings,
          stats: {
            ...persisted.stats,
            gamesPlayed: Math.max(persisted.stats.gamesPlayed, 1),
            wins: completedStatus === 'won' ? Math.max(persisted.stats.wins, 1) : persisted.stats.wins,
            currentStreak: completedStatus === 'won' ? Math.max(persisted.stats.currentStreak, 1) : 0,
            maxStreak: completedStatus === 'won' ? Math.max(persisted.stats.maxStreak, 1) : persisted.stats.maxStreak,
            guessDistribution:
              completedStatus === 'won'
                ? {
                    ...persisted.stats.guessDistribution,
                    1: Math.max(persisted.stats.guessDistribution[1], 1),
                  }
                : persisted.stats.guessDistribution,
            lastCompletedPuzzleId: persisted.puzzleId,
          },
        }),
      );

    }, status);

    await page.reload();
  }

  test('requires sign in before loading the game', async ({ page }) => {
    let signedIn = false;

    await page.unroute('**/api/auth/session');
    await page.unroute('**/api/auth/login');
    await page.route('**/api/auth/session', async (route) => {
      await route.fulfill({
        status: signedIn ? 200 : 401,
        contentType: 'application/json',
        body: signedIn
          ? JSON.stringify({ user: { username: 'player@example.com' }, expiresAt: new Date(Date.now() + 60_000).toISOString() })
          : JSON.stringify({ message: 'Authentication required.' }),
      });
    });
    await page.route('**/api/auth/login', async (route) => {
      const body = route.request().postDataJSON() as { username?: string; password?: string };
      signedIn = body.username === 'player@example.com' && body.password === 'correct horse battery staple';
      await route.fulfill({
        status: signedIn ? 200 : 401,
        contentType: 'application/json',
        body: signedIn
          ? JSON.stringify({ user: { username: 'player@example.com' }, expiresAt: new Date(Date.now() + 60_000).toISOString() })
          : JSON.stringify({ message: 'Invalid username or password.' }),
      });
    });

    await page.goto('./');
    await expect(page.getByRole('heading', { name: 'Sign in to Daily Lexicon' })).toBeVisible();
    await page.getByLabel('Username').fill('player@example.com');
    await page.getByLabel('Password').fill('correct horse battery staple');
    await page.getByRole('button', { name: 'Sign in' }).click();

    await expect(page.getByRole('heading', { name: 'Daily Lexicon' })).toBeVisible();
  });

  test('loads the app with production metadata and no console errors', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') {
        consoleErrors.push(message.text());
      }
    });

    await page.goto('./');

    const heading = page.getByRole('heading', { level: 1 });
    await expect(heading).toBeVisible();
    const headingText = await heading.textContent();
    expect(headingText).toBeTruthy();
    await expect(page).toHaveTitle(headingText ?? '');
    await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', '#111827');
    await expect(page.locator('meta[name="color-scheme"]')).toHaveAttribute('content', 'light dark');
    await expect(page.locator('link[rel="icon"]')).toHaveAttribute('href', /\/favicon\.svg$/);
    expect(consoleErrors).toEqual([]);
  });

  test('supports help dialog and on-screen keyboard input', async ({ page }) => {
    await page.goto('./');

    await page.getByRole('button', { name: 'Open help dialog' }).click();
    await expect(page.getByRole('dialog', { name: 'How to play' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog', { name: 'How to play' })).toHaveCount(0);

    for (const letter of ['Z', 'Z', 'Z', 'Z', 'Z']) {
      await page.getByRole('button', { name: letter }).click();
    }
    await page.getByRole('button', { name: 'Enter' }).click();

    await expect(page.getByRole('status')).toContainText('Not in word list');
  });

  test('restores partially typed physical keyboard input after reload', async ({ page }) => {
    await page.goto('./');
    await expect(page.getByRole('heading', { name: 'Daily Lexicon' })).toBeVisible();

    await page.evaluate(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'C', bubbles: true }));
    });
    await expect(page.getByText('Turn 1 of 6. 1 of 5 letters entered.')).toBeVisible();
    await page.evaluate(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'I', bubbles: true }));
    });
    await expect(page.getByText('Turn 1 of 6. 2 of 5 letters entered.')).toBeVisible();
    await expect.poll(async () => page.evaluate(() => window.localStorage.getItem('daily-lexicon-state'))).toContain('"currentGuess":"CI"');

    await page.reload();

    await expect(page.getByText('Turn 1 of 6. 2 of 5 letters entered.')).toBeVisible();
  });

  test('keeps stats sharing hidden during reveal and restores theme settings after reload', async ({ page }) => {
    await page.goto('./');

    await page.getByRole('button', { name: 'Open settings dialog' }).click();
    await page.getByRole('checkbox', { name: 'Dark mode' }).check();
    await page.getByRole('button', { name: 'Close Settings' }).click();
    await expect.poll(async () => page.evaluate(() => document.documentElement.dataset.theme)).toBe('dark');

    await page.evaluate(() => {
      const raw = window.localStorage.getItem('daily-lexicon-state');
      if (!raw) {
        throw new Error('Expected initial game state to be persisted.');
      }

      const persisted = JSON.parse(raw) as {
        version: number;
        answerSetVersion: string;
        puzzleId: string;
        settings: {
          darkMode: boolean;
          highContrast: boolean;
          hardMode: boolean;
          reduceMotion: boolean;
        };
        stats: {
          gamesPlayed: number;
          wins: number;
          currentStreak: number;
          maxStreak: number;
          guessDistribution: Record<1 | 2 | 3 | 4 | 5 | 6, number>;
          lastCompletedPuzzleId: string | null;
        };
      };

      window.localStorage.setItem(
        'daily-lexicon-state',
        JSON.stringify({
          version: persisted.version,
          answerSetVersion: persisted.answerSetVersion,
          puzzleId: persisted.puzzleId,
          guesses: ['CIGAR'],
          currentGuess: '',
          status: 'won',
          settings: persisted.settings,
          stats: {
            ...persisted.stats,
            gamesPlayed: Math.max(persisted.stats.gamesPlayed, 1),
            wins: Math.max(persisted.stats.wins, 1),
            currentStreak: Math.max(persisted.stats.currentStreak, 1),
            maxStreak: Math.max(persisted.stats.maxStreak, 1),
            guessDistribution: {
              ...persisted.stats.guessDistribution,
              1: Math.max(persisted.stats.guessDistribution[1], 1),
            },
            lastCompletedPuzzleId: persisted.puzzleId,
          },
        }),
      );
    });

    await page.reload();
    await expect(page.getByRole('heading', { name: 'Puzzle solved' })).toBeVisible();

    await page.getByRole('button', { name: 'Open statistics dialog' }).click();
    const statsDialog = page.getByRole('dialog', { name: 'Statistics' });
    await expect(statsDialog.getByRole('button', { name: 'Share result' })).toBeVisible();

    await page.reload();
    await expect.poll(async () => page.evaluate(() => document.documentElement.dataset.theme)).toBe('dark');
  });

  test('shows a completed win state and copies share text', async ({ page }) => {
    await seedCompletedState(page, 'won');

    await expect(page.getByRole('heading', { name: 'Puzzle solved' })).toBeVisible();
    await page.getByRole('button', { name: 'Share result' }).click();
    await expect(page.getByRole('status')).toContainText('Results copied');
    await expect.poll(async () => page.evaluate(() => (window as typeof window & { __copiedShareText?: string }).__copiedShareText ?? '')).toContain('Daily Lexicon');
  });

  test('shows a completed loss state with the answer revealed', async ({ page }) => {
    await seedCompletedState(page, 'lost');

    await expect(page.locator('p').filter({ hasText: /^The answer was [A-Z]{5}\.$/ })).toBeVisible();
  });

  test('supports high contrast and reduce motion settings persistence', async ({ page }) => {
    await page.goto('./');

    await page.getByRole('button', { name: 'Open settings dialog' }).click();
    await page.getByRole('checkbox', { name: 'High contrast mode' }).check();
    await page.getByRole('checkbox', { name: 'Reduce motion' }).check();
    await page.getByRole('button', { name: 'Close Settings' }).click();

    await expect.poll(async () => page.evaluate(() => document.documentElement.dataset.contrast)).toBe('more');
    await expect.poll(async () => page.evaluate(() => document.documentElement.dataset.motion)).toBe('reduced');

    await page.reload();

    await expect.poll(async () => page.evaluate(() => document.documentElement.dataset.contrast)).toBe('more');
    await expect.poll(async () => page.evaluate(() => document.documentElement.dataset.motion)).toBe('reduced');
  });

  test('enforces hard mode in the browser without consuming a turn', async ({ page }) => {
    const puzzle = getDefaultPuzzle(new Date());
    const scenario = findHardModeScenario(puzzle.answer);

    await page.goto('./');
    await expect(page.getByRole('heading', { name: 'Daily Lexicon' })).toBeVisible();
    await page.evaluate(({ seedGuess }) => {
      const raw = window.localStorage.getItem('daily-lexicon-state');
      if (!raw) {
        throw new Error('Expected initial game state to be persisted.');
      }

      const persisted = JSON.parse(raw) as {
        version: number;
        answerSetVersion: string;
        puzzleId: string;
        settings: {
          darkMode: boolean;
          highContrast: boolean;
          hardMode: boolean;
          reduceMotion: boolean;
        };
        stats: {
          gamesPlayed: number;
          wins: number;
          currentStreak: number;
          maxStreak: number;
          guessDistribution: Record<1 | 2 | 3 | 4 | 5 | 6, number>;
          lastCompletedPuzzleId: string | null;
        };
      };

      window.localStorage.setItem(
        'daily-lexicon-state',
        JSON.stringify({
          version: persisted.version,
          answerSetVersion: persisted.answerSetVersion,
          puzzleId: persisted.puzzleId,
          guesses: [seedGuess],
          currentGuess: '',
          status: 'in_progress',
          settings: {
            ...persisted.settings,
            hardMode: true,
          },
          stats: persisted.stats,
        }),
      );
    }, { seedGuess: scenario.seedGuess });

    await page.reload();
    await expect(page.getByText(`Row 1: ${scenario.seedGuess}.`)).toBeVisible();

    await page.keyboard.type(scenario.violatingGuess);
    await page.keyboard.press('Enter');

    await expect(page.getByText(`Active row 2: ${scenario.violatingGuess}.`)).toBeVisible();
    await expect(page.getByText(`Row 1: ${scenario.seedGuess}.`)).toBeVisible();
  });

  test('rolls over to a fresh puzzle when the page regains focus on a new local day', async ({ page }) => {
    await page.addInitScript(() => {
      const RealDate = Date;
      let now = new RealDate(2026, 3, 20, 23, 59, 58, 500).getTime();

      class MockDate extends RealDate {
        constructor();
        constructor(value: string | number | Date);
        constructor(year: number, monthIndex: number, date?: number, hours?: number, minutes?: number, seconds?: number, ms?: number);
        constructor(...args: [] | [string | number | Date] | [number, number, number?, number?, number?, number?, number?]) {
          if (args.length === 0) {
            super(now);
            return;
          }

          switch (args.length) {
            case 1:
              super(args[0]);
              return;
            case 2:
              super(args[0], args[1]);
              return;
            case 3:
              super(args[0], args[1], args[2]);
              return;
            case 4:
              super(args[0], args[1], args[2], args[3]);
              return;
            case 5:
              super(args[0], args[1], args[2], args[3], args[4]);
              return;
            case 6:
              super(args[0], args[1], args[2], args[3], args[4], args[5]);
              return;
            default:
              super(args[0], args[1], args[2], args[3], args[4], args[5], args[6]);
          }
        }

        static now() {
          return now;
        }
      }

      Object.defineProperty(window, '__setMockTime', {
        configurable: true,
        value: (value: number) => {
          now = value;
        },
      });

      Object.defineProperty(window, 'Date', {
        configurable: true,
        value: MockDate,
      });
    });

    await page.goto('./');
    await page.locator('main').click();
    await page.keyboard.press('C');
    await page.keyboard.press('I');
    await expect(page.getByText('Turn 1 of 6. 2 of 5 letters entered.')).toBeVisible();

    await page.evaluate(() => {
      (window as typeof window & { __setMockTime: (value: number) => void }).__setMockTime(new Date(2026, 3, 21, 12, 0, 0, 0).getTime());
      window.dispatchEvent(new Event('focus'));
    });

    await expect(page.getByText('Turn 1 of 6. 0 of 5 letters entered.')).toBeVisible();
    await expect.poll(async () => page.evaluate(() => window.localStorage.getItem('daily-lexicon-state'))).toContain('"puzzleId":"2026-04-21"');
    await expect.poll(async () => page.evaluate(() => window.localStorage.getItem('daily-lexicon-state'))).toContain('"currentGuess":""');
  });
});
