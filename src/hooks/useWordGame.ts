import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ALLOWED_GUESS_SET } from '../data/allowedGuesses';
import { analytics } from '../lib/analytics';
import { copyText } from '../lib/clipboard';
import { logger } from '../lib/logger';
import { MAX_GUESSES, REVEAL_MS, WORD_LENGTH } from '../game/constants';
import { evaluateGuess } from '../game/evaluateGuess';
import { validateHardModeGuess } from '../game/hardMode';
import { buildKeyboardState } from '../game/keyboard';
import { buildShareText } from '../game/share';
import { getDailyPuzzle } from '../game/puzzle';
import { persistState, readStoredState } from '../game/storage';
import { completePuzzleStats } from '../game/stats';
import type { DialogType, EvaluatedGuess, GameStatus, SettingsState } from '../game/types';

interface ToastState {
  id: number;
  message: string;
}

interface WordGameModel {
  puzzle: ReturnType<typeof getDailyPuzzle>;
  guesses: string[];
  currentGuess: string;
  evaluations: EvaluatedGuess[];
  keyboardState: Record<string, 'unused' | 'absent' | 'present' | 'correct'>;
  status: GameStatus;
  settings: SettingsState;
  stats: ReturnType<typeof readStoredState>['stats'];
  liveSummary: string;
  toast: ToastState | null;
  shakingRow: number | null;
  revealingRow: number | null;
  dialog: DialogType;
  openDialog: (dialog: Exclude<DialogType, null>) => void;
  closeDialog: () => void;
  addLetter: (letter: string) => void;
  removeLetter: () => void;
  submitGuess: () => void;
  updateSetting: (key: keyof SettingsState, value: boolean) => void;
  shareResults: () => Promise<void>;
}

function useTimedMessage() {
  const [toast, setToast] = useState<ToastState | null>(null);

  const showToast = useCallback((message: string) => {
    setToast({ id: Date.now(), message });
  }, []);

  useEffect(() => {
    if (!toast) {
      return undefined;
    }

    const timeout = window.setTimeout(() => setToast(null), 2200);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  return { toast, showToast };
}

export function useWordGame(): WordGameModel {
  const initialSnapshot = useMemo(() => readStoredState(), []);
  const [puzzle] = useState(initialSnapshot.puzzle);
  const [guesses, setGuesses] = useState(initialSnapshot.guesses);
  const [currentGuess, setCurrentGuess] = useState(initialSnapshot.currentGuess);
  const [status, setStatus] = useState<GameStatus>(initialSnapshot.status);
  const [settings, setSettings] = useState(initialSnapshot.settings);
  const [stats, setStats] = useState(initialSnapshot.stats);
  const [dialog, setDialog] = useState<DialogType>(null);
  const [shakingRow, setShakingRow] = useState<number | null>(null);
  const [revealingRow, setRevealingRow] = useState<number | null>(null);
  const trackedStartRef = useRef(false);
  const { toast, showToast } = useTimedMessage();

  const evaluations = useMemo(
    () => guesses.map((guess) => evaluateGuess(guess, puzzle.answer)),
    [guesses, puzzle.answer],
  );

  const keyboardState = useMemo(() => buildKeyboardState(evaluations), [evaluations]);

  const liveSummary = useMemo(() => {
    const latestEvaluation = evaluations[evaluations.length - 1];
    const latestSummary = latestEvaluation
      ? ` Latest guess ${latestEvaluation.guess}: ${latestEvaluation.statuses.join(', ')}.`
      : '';

    if (status === 'won') {
      return `Puzzle solved in ${guesses.length} guesses.${latestSummary}`;
    }

    if (status === 'lost') {
      return `Puzzle lost. The answer was ${puzzle.answer}.${latestSummary}`;
    }

    const turn = guesses.length + 1;
    const lettersTyped = currentGuess.length;
    return `Turn ${turn} of ${MAX_GUESSES}. ${lettersTyped} of ${WORD_LENGTH} letters entered.${latestSummary}`;
  }, [currentGuess.length, evaluations, guesses.length, puzzle.answer, status]);

  useEffect(() => {
    persistState({ puzzle, guesses, currentGuess, status, settings, stats });
  }, [currentGuess, guesses, puzzle, settings, stats, status]);

  useEffect(() => {
    document.documentElement.dataset.theme = settings.darkMode ? 'dark' : 'light';
    document.documentElement.dataset.contrast = settings.highContrast ? 'more' : 'normal';
    document.documentElement.dataset.motion = settings.reduceMotion ? 'reduced' : 'full';
  }, [settings.darkMode, settings.highContrast, settings.reduceMotion]);

  useEffect(() => {
    if (trackedStartRef.current) {
      return;
    }

    analytics.track('game_started', { puzzleNumber: puzzle.number });
    trackedStartRef.current = true;
  }, [puzzle.number]);

  const blockInput = status !== 'in_progress' || revealingRow !== null;

  const pulseInvalidRow = useCallback((rowIndex: number) => {
    setShakingRow(rowIndex);
    window.setTimeout(() => setShakingRow(null), 450);
  }, []);

  const addLetter = useCallback(
    (letter: string) => {
      if (blockInput || currentGuess.length >= WORD_LENGTH) {
        return;
      }

      if (!/^[A-Z]$/.test(letter)) {
        return;
      }

      setCurrentGuess((value) => `${value}${letter}`);
    },
    [blockInput, currentGuess.length],
  );

  const removeLetter = useCallback(() => {
    if (blockInput || currentGuess.length === 0) {
      return;
    }

    setCurrentGuess((value) => value.slice(0, -1));
  }, [blockInput, currentGuess.length]);

  const completeRound = useCallback(
    (nextGuesses: string[], outcome: GameStatus) => {
      const nextStats = completePuzzleStats(stats, puzzle.id, outcome, nextGuesses.length);
      setStats(nextStats);
      setStatus(outcome);

      if (outcome === 'won') {
        analytics.track('game_won', { attempts: nextGuesses.length, puzzleNumber: puzzle.number });
        showToast(`Solved in ${nextGuesses.length}`);
        return;
      }

      analytics.track('game_lost', { puzzleNumber: puzzle.number });
      showToast(`Answer: ${puzzle.answer}`);
    },
    [puzzle.answer, puzzle.id, puzzle.number, showToast, stats],
  );

  const submitGuess = useCallback(() => {
    if (blockInput) {
      return;
    }

    const rowIndex = guesses.length;
    if (currentGuess.length < WORD_LENGTH) {
      showToast('Not enough letters');
      pulseInvalidRow(rowIndex);
      return;
    }

    const normalizedGuess = currentGuess.toUpperCase();
    if (!ALLOWED_GUESS_SET.has(normalizedGuess.toLowerCase())) {
      showToast('Not in word list');
      pulseInvalidRow(rowIndex);
      return;
    }

    if (settings.hardMode && evaluations.length > 0) {
      const validation = validateHardModeGuess(normalizedGuess, evaluations);
      if (!validation.valid) {
        showToast(validation.reason ?? 'Hard mode violation');
        pulseInvalidRow(rowIndex);
        return;
      }
    }

    analytics.track('guess_submitted', { turn: rowIndex + 1, puzzleNumber: puzzle.number });
    const nextGuesses = [...guesses, normalizedGuess];
    const evaluation = evaluateGuess(normalizedGuess, puzzle.answer);

    setGuesses(nextGuesses);
    setCurrentGuess('');
    setRevealingRow(rowIndex);

    const finalize = () => {
      setRevealingRow(null);

      if (evaluation.statuses.every((statusItem) => statusItem === 'correct')) {
        completeRound(nextGuesses, 'won');
        return;
      }

      if (nextGuesses.length === MAX_GUESSES) {
        completeRound(nextGuesses, 'lost');
      }
    };

    if (settings.reduceMotion) {
      finalize();
      return;
    }

    window.setTimeout(finalize, REVEAL_MS * WORD_LENGTH);
  }, [
    blockInput,
    completeRound,
    currentGuess,
    evaluations,
    guesses,
    settings.hardMode,
    settings.reduceMotion,
    pulseInvalidRow,
    puzzle.answer,
    puzzle.number,
    showToast,
  ]);

  const updateSetting = useCallback((key: keyof SettingsState, value: boolean) => {
    setSettings((current) => {
      const nextSettings = { ...current, [key]: value };
      analytics.track('settings_changed', { setting: key, value });
      return nextSettings;
    });
  }, []);

  const shareResults = useCallback(async () => {
    if (status === 'in_progress') {
      return;
    }

    try {
      const text = buildShareText(puzzle.number, status, evaluations);
      const copied = await copyText(text);

      if (!copied) {
        showToast('Copy failed');
        return;
      }

      analytics.track('shared_result', { puzzleNumber: puzzle.number, status });
      showToast('Results copied');
    } catch (error) {
      logger.warn('Clipboard share failed', error);
      showToast('Clipboard unavailable');
    }
  }, [evaluations, puzzle.number, showToast, status]);

  const openDialog = useCallback((nextDialog: Exclude<DialogType, null>) => setDialog(nextDialog), []);
  const closeDialog = useCallback(() => setDialog(null), []);

  return {
    puzzle,
    guesses,
    currentGuess,
    evaluations,
    keyboardState,
    status,
    settings,
    stats,
    liveSummary,
    toast,
    shakingRow,
    revealingRow,
    dialog,
    openDialog,
    closeDialog,
    addLetter,
    removeLetter,
    submitGuess,
    updateSetting,
    shareResults,
  };
}
