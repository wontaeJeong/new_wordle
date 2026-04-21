import { WORD_LENGTH } from './constants';
import type { EvaluatedGuess, LetterStatus } from './types';

export function evaluateGuess(guess: string, answer: string): EvaluatedGuess {
  if (guess.length !== WORD_LENGTH || answer.length !== WORD_LENGTH) {
    throw new Error('Guess and answer must both be five letters.');
  }

  const statuses: LetterStatus[] = Array.from({ length: WORD_LENGTH }, () => 'absent');
  const answerChars = answer.toUpperCase().split('');
  const guessChars = guess.toUpperCase().split('');
  const consumed = Array.from({ length: WORD_LENGTH }, () => false);

  for (let index = 0; index < WORD_LENGTH; index += 1) {
    if (guessChars[index] === answerChars[index]) {
      statuses[index] = 'correct';
      consumed[index] = true;
    }
  }

  for (let guessIndex = 0; guessIndex < WORD_LENGTH; guessIndex += 1) {
    if (statuses[guessIndex] === 'correct') {
      continue;
    }

    const matchIndex = answerChars.findIndex(
      (char, answerIndex) => !consumed[answerIndex] && char === guessChars[guessIndex],
    );

    if (matchIndex >= 0) {
      statuses[guessIndex] = 'present';
      consumed[matchIndex] = true;
    }
  }

  return {
    guess: guess.toUpperCase(),
    statuses,
  };
}
