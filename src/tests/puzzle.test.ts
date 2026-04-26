import { describe, expect, it } from 'vitest';
import { appConfig } from '../config/appConfig';
import { formatPuzzleId, getDailyPuzzle, getMillisecondsUntilNextPuzzle, getPuzzleNumber, parseLocalCalendarDate } from '../game/puzzle';

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

  it('advances by one across spring DST-season calendar days', () => {
    const before = getPuzzleNumber(new Date(2024, 2, 10, 12, 0));
    const after = getPuzzleNumber(new Date(2024, 2, 11, 12, 0));
    expect(after - before).toBe(1);
  });

  it('advances by one across fall DST-season calendar days', () => {
    const before = getPuzzleNumber(new Date(2024, 10, 3, 12, 0));
    const after = getPuzzleNumber(new Date(2024, 10, 4, 12, 0));
    expect(after - before).toBe(1);
  });

  it('parses puzzle epoch as a local calendar date instead of UTC text parsing', () => {
    const parsed = parseLocalCalendarDate(appConfig.puzzleEpoch);
    expect(parsed.getFullYear()).toBe(2024);
    expect(parsed.getMonth()).toBe(0);
    expect(parsed.getDate()).toBe(1);
    expect(parsed.getHours()).toBe(0);
  });

  it('calculates the remaining time until the next local puzzle rollover', () => {
    const milliseconds = getMillisecondsUntilNextPuzzle(new Date(2026, 3, 20, 23, 59, 58, 500));
    expect(milliseconds).toBe(1500);
  });
});
