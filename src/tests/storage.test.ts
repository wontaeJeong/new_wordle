import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ANSWER_SET_VERSION } from '../data/answers';
import { STORAGE_KEY, STORAGE_VERSION } from '../game/constants';
import { getDailyPuzzle } from '../game/puzzle';
import { persistState, readStoredState } from '../game/storage';

describe('storage restore and reset', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('restores saved state for the current puzzle', () => {
    const date = new Date(2026, 3, 20, 12, 0);
    const puzzle = getDailyPuzzle(date);
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: STORAGE_VERSION,
        answerSetVersion: ANSWER_SET_VERSION,
        puzzleId: puzzle.id,
        guesses: ['cigar'],
        currentGuess: 'ab',
        status: 'in_progress',
        settings: { darkMode: true, highContrast: false, hardMode: true, reduceMotion: true },
        stats: {
          gamesPlayed: 2,
          wins: 1,
          currentStreak: 1,
          maxStreak: 1,
          guessDistribution: { 1: 0, 2: 1, 3: 0, 4: 0, 5: 0, 6: 0 },
          lastCompletedPuzzleId: '2026-04-19',
        },
      }),
    );

    const state = readStoredState(date);
    expect(state.guesses).toEqual(['CIGAR']);
    expect(state.currentGuess).toBe('AB');
    expect(state.settings.darkMode).toBe(true);
    expect(state.stats.gamesPlayed).toBe(2);
  });

  it('resets safely on corrupt JSON', () => {
    const date = new Date(2026, 3, 20, 12, 0);
    window.localStorage.setItem(STORAGE_KEY, '{bad json');

    const state = readStoredState(date);
    expect(state.guesses).toEqual([]);
    expect(state.currentGuess).toBe('');
    expect(state.status).toBe('in_progress');
  });

  it('resets the round for a new puzzle day while preserving stats defaults', () => {
    const priorPuzzle = getDailyPuzzle(new Date(2026, 3, 20, 12, 0));
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: STORAGE_VERSION,
        answerSetVersion: ANSWER_SET_VERSION,
        puzzleId: priorPuzzle.id,
        guesses: ['cigar'],
        currentGuess: 'ab',
        status: 'in_progress',
        settings: { darkMode: false, highContrast: false, hardMode: false, reduceMotion: false },
        stats: {
          gamesPlayed: 4,
          wins: 3,
          currentStreak: 2,
          maxStreak: 3,
          guessDistribution: { 1: 1, 2: 1, 3: 1, 4: 0, 5: 0, 6: 0 },
          lastCompletedPuzzleId: '2026-04-19',
        },
      }),
    );

    const nextState = readStoredState(new Date(2026, 3, 21, 12, 0));
    expect(nextState.guesses).toEqual([]);
    expect(nextState.currentGuess).toBe('');
    expect(nextState.stats.gamesPlayed).toBe(4);
  });

  it('persists a snapshot', () => {
    const snapshot = readStoredState(new Date(2026, 3, 20, 12, 0));
    expect(persistState(snapshot)).toBe(true);
    expect(window.localStorage.getItem(STORAGE_KEY)).toContain(`"puzzleId":"${snapshot.puzzle.id}"`);
  });

  it('safely resets parseable malformed storage shapes', () => {
    const date = new Date(2026, 3, 20, 12, 0);
    const puzzle = getDailyPuzzle(date);
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: STORAGE_VERSION,
        answerSetVersion: ANSWER_SET_VERSION,
        puzzleId: puzzle.id,
        guesses: ['abc'],
        currentGuess: 'toolong',
        status: 'in_progress',
        settings: { darkMode: false, highContrast: false, hardMode: false, reduceMotion: false },
        stats: { gamesPlayed: 2, wins: 1 },
      }),
    );

    const state = readStoredState(date);
    expect(state.guesses).toEqual([]);
    expect(state.currentGuess).toBe('');
    expect(state.stats.gamesPlayed).toBe(0);
  });

  it('rejects stored guesses with non-letter characters', () => {
    const date = new Date(2026, 3, 20, 12, 0);
    const puzzle = getDailyPuzzle(date);
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: STORAGE_VERSION,
        answerSetVersion: ANSWER_SET_VERSION,
        puzzleId: puzzle.id,
        guesses: ['abc12'],
        currentGuess: 'a!',
        status: 'in_progress',
        settings: { darkMode: false, highContrast: false, hardMode: false, reduceMotion: false },
        stats: {
          gamesPlayed: 2,
          wins: 1,
          currentStreak: 1,
          maxStreak: 1,
          guessDistribution: { 1: 0, 2: 1, 3: 0, 4: 0, 5: 0, 6: 0 },
          lastCompletedPuzzleId: '2026-04-19',
        },
      }),
    );

    const state = readStoredState(date);
    expect(state.guesses).toEqual([]);
    expect(state.currentGuess).toBe('');
    expect(state.stats.gamesPlayed).toBe(2);
  });

  it('survives storage write failures', () => {
    const snapshot = readStoredState(new Date(2026, 3, 20, 12, 0));
    const setItem = vi.spyOn(window.localStorage, 'setItem').mockImplementation(() => {
      throw new Error('quota exceeded');
    });

    expect(persistState(snapshot)).toBe(false);
    setItem.mockRestore();
  });
});
