import type { SettingsState, StatsState } from './types';

export const WORD_LENGTH = 5;
export const MAX_GUESSES = 6;
export const STORAGE_KEY = 'daily-lexicon-state';
export const STORAGE_VERSION = 1;
export const REVEAL_MS = 320;

export const DEFAULT_SETTINGS: SettingsState = {
  darkMode: false,
  highContrast: false,
  hardMode: false,
  reduceMotion: false,
};

export const DEFAULT_STATS: StatsState = {
  gamesPlayed: 0,
  wins: 0,
  currentStreak: 0,
  maxStreak: 0,
  guessDistribution: {
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0,
    6: 0,
  },
  lastCompletedPuzzleId: null,
};
