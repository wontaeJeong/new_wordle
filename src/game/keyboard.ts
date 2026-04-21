import type { EvaluatedGuess, KeyboardStatus, LetterStatus } from './types';

const priority: Record<KeyboardStatus, number> = {
  unused: 0,
  absent: 1,
  present: 2,
  correct: 3,
};

export function mergeKeyboardStatus(current: KeyboardStatus, incoming: LetterStatus): KeyboardStatus {
  return priority[incoming] > priority[current] ? incoming : current;
}

export function buildKeyboardState(evaluations: EvaluatedGuess[]): Record<string, KeyboardStatus> {
  const state: Record<string, KeyboardStatus> = {};

  for (const evaluation of evaluations) {
    evaluation.guess.split('').forEach((letter, index) => {
      state[letter] = mergeKeyboardStatus(state[letter] ?? 'unused', evaluation.statuses[index]);
    });
  }

  return state;
}
