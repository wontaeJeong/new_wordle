export type LetterStatus = 'correct' | 'present' | 'absent';
export type KeyboardStatus = LetterStatus | 'unused';
export type GameStatus = 'in_progress' | 'won' | 'lost';
export type DialogType = 'help' | 'settings' | 'stats' | null;

export interface EvaluatedGuess {
  guess: string;
  statuses: LetterStatus[];
}

export interface Puzzle {
  id: string;
  number: number;
  index: number;
  answer: string;
}

export interface SettingsState {
  darkMode: boolean;
  highContrast: boolean;
  hardMode: boolean;
  reduceMotion: boolean;
}

export interface StatsState {
  gamesPlayed: number;
  wins: number;
  currentStreak: number;
  maxStreak: number;
  guessDistribution: Record<1 | 2 | 3 | 4 | 5 | 6, number>;
  lastCompletedPuzzleId: string | null;
}

export interface PersistedGameState {
  version: number;
  answerSetVersion: string;
  puzzleId: string;
  guesses: string[];
  currentGuess: string;
  status: GameStatus;
  settings: SettingsState;
  stats: StatsState;
}

export interface GameSnapshot {
  puzzle: Puzzle;
  guesses: string[];
  currentGuess: string;
  status: GameStatus;
  settings: SettingsState;
  stats: StatsState;
}

export interface HardModeConstraint {
  greens: Array<string | null>;
  minimumLetterCounts: Map<string, number>;
}

export interface ValidationResult {
  valid: boolean;
  reason?: string;
}
