import type { EvaluatedGuess, HardModeConstraint, ValidationResult } from './types';
import { WORD_LENGTH } from './constants';

export function buildHardModeConstraints(evaluations: EvaluatedGuess[]): HardModeConstraint {
  const greens: Array<string | null> = Array.from({ length: WORD_LENGTH }, () => null);
  const minimumLetterCounts = new Map<string, number>();

  for (const evaluation of evaluations) {
    const countsForGuess = new Map<string, number>();

    evaluation.guess.split('').forEach((letter, index) => {
      const status = evaluation.statuses[index];

      if (status === 'correct') {
        greens[index] = letter;
      }

      if (status === 'correct' || status === 'present') {
        countsForGuess.set(letter, (countsForGuess.get(letter) ?? 0) + 1);
      }
    });

    countsForGuess.forEach((count, letter) => {
      minimumLetterCounts.set(letter, Math.max(minimumLetterCounts.get(letter) ?? 0, count));
    });
  }

  return { greens, minimumLetterCounts };
}

function formatOrdinal(position: number): string {
  const ordinals = ['1st', '2nd', '3rd', '4th', '5th'];
  return ordinals[position] ?? `${position + 1}th`;
}

export function validateHardModeGuess(guess: string, evaluations: EvaluatedGuess[]): ValidationResult {
  const constraints = buildHardModeConstraints(evaluations);

  for (let index = 0; index < constraints.greens.length; index += 1) {
    const required = constraints.greens[index];
    if (required && guess[index] !== required) {
      return {
        valid: false,
        reason: `${formatOrdinal(index)} letter must be ${required}`,
      };
    }
  }

  const guessCounts = new Map<string, number>();
  guess.split('').forEach((letter) => {
    guessCounts.set(letter, (guessCounts.get(letter) ?? 0) + 1);
  });

  for (const [letter, requiredCount] of constraints.minimumLetterCounts.entries()) {
    if ((guessCounts.get(letter) ?? 0) < requiredCount) {
      return {
        valid: false,
        reason: requiredCount > 1 ? `Guess must contain ${requiredCount} ${letter}s` : `Guess must contain ${letter}`,
      };
    }
  }

  return { valid: true };
}
