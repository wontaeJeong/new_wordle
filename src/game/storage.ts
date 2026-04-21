import { ANSWER_SET_VERSION } from '../data/answers';
import { DEFAULT_SETTINGS, DEFAULT_STATS, MAX_GUESSES, STORAGE_KEY, STORAGE_VERSION, WORD_LENGTH } from './constants';
import { getDailyPuzzle } from './puzzle';
import { logger } from '../lib/logger';
import type { GameSnapshot, PersistedGameState, SettingsState, StatsState } from './types';

function isGameStatus(value: unknown): value is PersistedGameState['status'] {
  return value === 'in_progress' || value === 'won' || value === 'lost';
}

function isGuessList(value: unknown): value is string[] {
  return (
    Array.isArray(value) &&
    value.length <= MAX_GUESSES &&
    value.every((item) => typeof item === 'string' && item.length === WORD_LENGTH)
  );
}

function isGuessDistribution(value: unknown): value is StatsState['guessDistribution'] {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const distribution = value as Record<string, unknown>;
  return ['1', '2', '3', '4', '5', '6'].every((key) => typeof distribution[key] === 'number');
}

function isStatsState(value: unknown): value is StatsState {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const stats = value as Record<string, unknown>;
  return (
    typeof stats.gamesPlayed === 'number' &&
    typeof stats.wins === 'number' &&
    typeof stats.currentStreak === 'number' &&
    typeof stats.maxStreak === 'number' &&
    isGuessDistribution(stats.guessDistribution) &&
    (typeof stats.lastCompletedPuzzleId === 'string' || stats.lastCompletedPuzzleId === null)
  );
}

function isSettingsState(value: unknown): value is SettingsState {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const settings = value as Record<string, unknown>;
  return (
    typeof settings.darkMode === 'boolean' &&
    typeof settings.highContrast === 'boolean' &&
    typeof settings.hardMode === 'boolean' &&
    typeof settings.reduceMotion === 'boolean'
  );
}

function createEmptySnapshot(puzzle: GameSnapshot['puzzle'], settings: SettingsState, stats: StatsState): GameSnapshot {
  return {
    puzzle,
    guesses: [],
    currentGuess: '',
    status: 'in_progress',
    settings,
    stats,
  };
}

export function readStoredState(date: Date = new Date()): GameSnapshot {
  const puzzle = getDailyPuzzle(date);

  if (typeof window === 'undefined') {
    return createEmptySnapshot(puzzle, DEFAULT_SETTINGS, DEFAULT_STATS);
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return createEmptySnapshot(puzzle, DEFAULT_SETTINGS, DEFAULT_STATS);
    }

    const parsed = JSON.parse(raw) as Partial<PersistedGameState>;
    const settings = isSettingsState(parsed.settings) ? parsed.settings : DEFAULT_SETTINGS;
    const stats = isStatsState(parsed.stats) ? parsed.stats : DEFAULT_STATS;

    const hasValidCore =
      parsed.version === STORAGE_VERSION &&
      parsed.answerSetVersion === ANSWER_SET_VERSION &&
      isGuessList(parsed.guesses) &&
      typeof parsed.currentGuess === 'string' &&
      isGameStatus(parsed.status);

    if (!hasValidCore) {
      return createEmptySnapshot(puzzle, settings, stats);
    }

    if (parsed.puzzleId !== puzzle.id) {
      return createEmptySnapshot(puzzle, settings, stats);
    }

    const guesses = isGuessList(parsed.guesses) ? parsed.guesses : [];
    const currentGuess = typeof parsed.currentGuess === 'string' && parsed.currentGuess.length <= WORD_LENGTH ? parsed.currentGuess : '';
    const status = isGameStatus(parsed.status) ? parsed.status : 'in_progress';

    return {
      puzzle,
      guesses: guesses.map((guess) => guess.toUpperCase()),
      currentGuess: currentGuess.toUpperCase(),
      status,
      settings,
      stats,
    };
  } catch {
    return createEmptySnapshot(puzzle, DEFAULT_SETTINGS, DEFAULT_STATS);
  }
}

export function persistState(snapshot: GameSnapshot): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  const payload: PersistedGameState = {
    version: STORAGE_VERSION,
    answerSetVersion: ANSWER_SET_VERSION,
    puzzleId: snapshot.puzzle.id,
    guesses: snapshot.guesses,
    currentGuess: snapshot.currentGuess,
    status: snapshot.status,
    settings: snapshot.settings,
    stats: snapshot.stats,
  };

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    return true;
  } catch (error) {
    logger.warn('Persisting game state failed', error);
    return false;
  }
}
