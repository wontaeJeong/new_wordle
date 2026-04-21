import { describe, expect, it } from 'vitest';
import { appConfig } from '../config/appConfig';
import { formatPuzzleId, getDailyPuzzle, getPuzzleNumber, parseLocalCalendarDate } from '../game/puzzle';

describe('daily puzzle mapping', () => {
  it('uses the local calendar date as the puzzle id', () => {
    expect(formatPuzzleId(new Date(2026, 3, 20, 23, 10))).toBe('2026-04-20');
  });

  it('maps the same day to the same puzzle', () => {
    const morning = getDailyPuzzle(new Date(2026, 3, 20, 8, 0));
    const evening = getDailyPuzzle(new Date(2026, 3, 20, 20, 0));
    expect(morning.id).toBe(evening.id);
    expect(morning.answer).toBe(evening.answer);
    expect(morning.number).toBe(evening.number);
  });

  it('increments puzzle number by local day', () => {
    const first = getPuzzleNumber(new Date(2026, 3, 20));
    const second = getPuzzleNumber(new Date(2026, 3, 21));
    expect(second - first).toBe(1);
  });

  it('parses puzzle epoch as a local calendar date instead of UTC text parsing', () => {
    const parsed = parseLocalCalendarDate(appConfig.puzzleEpoch);
    expect(parsed.getFullYear()).toBe(2024);
    expect(parsed.getMonth()).toBe(0);
    expect(parsed.getDate()).toBe(1);
    expect(parsed.getHours()).toBe(0);
  });
});
