import type { EvaluatedGuess, GameStatus } from './types';

const emojiMap = {
  correct: '🟩',
  present: '🟨',
  absent: '⬛',
} as const;

export function buildShareText(puzzleNumber: number, status: GameStatus, evaluations: EvaluatedGuess[]): string {
  const score = status === 'won' ? `${evaluations.length}/6` : 'X/6';
  const rows = evaluations.map((evaluation) => evaluation.statuses.map((tile) => emojiMap[tile]).join('')).join('\n');
  return `Daily Lexicon ${puzzleNumber} ${score}\n\n${rows}`;
}
