import type { CSSProperties } from 'react';
import { MAX_GUESSES, REVEAL_MS, WORD_LENGTH } from '../game/constants';
import type { EvaluatedGuess, GameStatus } from '../game/types';

const ROW_KEYS = ['row-1', 'row-2', 'row-3', 'row-4', 'row-5', 'row-6'] as const;
const TILE_KEYS = ['tile-1', 'tile-2', 'tile-3', 'tile-4', 'tile-5'] as const;

interface BoardProps {
  guesses: string[];
  currentGuess: string;
  evaluations: EvaluatedGuess[];
  revealingRow: number | null;
  shakingRow: number | null;
  status: GameStatus;
  reduceMotion: boolean;
  liveSummary: string;
}

export function Board({
  guesses,
  currentGuess,
  evaluations,
  revealingRow,
  shakingRow,
  status,
  reduceMotion,
  liveSummary,
}: BoardProps) {
  return (
    <section className="board" aria-label="Game board" aria-describedby="board-live-summary">
      <p id="board-live-summary" className="sr-only" aria-live="polite">
        {liveSummary}
      </p>
      <ol className="sr-only" aria-label="Submitted guess summaries">
        {evaluations.map((evaluation, index) => (
          <li key={`summary-${ROW_KEYS[index]}`}>
            Row {index + 1}: {evaluation.guess}. {evaluation.statuses.join(', ')}.
          </li>
        ))}
        {guesses.length < MAX_GUESSES ? (
          <li key="active-row-summary">
            Active row {guesses.length + 1}: {currentGuess || 'empty'}.
          </li>
        ) : null}
      </ol>
      {ROW_KEYS.slice(0, MAX_GUESSES).map((rowKey, rowIndex) => {
        const submittedGuess = guesses[rowIndex] ?? '';
        const evaluation = evaluations[rowIndex];
        const activeGuess = rowIndex === guesses.length ? currentGuess : '';
        const celebrate = status === 'won' && rowIndex === evaluations.length - 1 && revealingRow === null;

        return (
          <div
            key={rowKey}
            className={`board-row ${shakingRow === rowIndex ? 'is-shaking' : ''}`}
          >
            {TILE_KEYS.slice(0, WORD_LENGTH).map((tileKey, tileIndex) => {
              const letter = submittedGuess[tileIndex] ?? activeGuess[tileIndex] ?? '';
              const statusClass = evaluation ? `tile--${evaluation.statuses[tileIndex]}` : '';
              const isFilled = letter !== '';
              const isRevealing = revealingRow === rowIndex && Boolean(evaluation) && !reduceMotion;
              const style = isRevealing
                ? ({ animationDelay: `${tileIndex * REVEAL_MS / 2}ms` } as CSSProperties)
                : undefined;

              return (
                <div
                  key={`${rowKey}-${tileKey}`}
                  className={[
                    'tile',
                    isFilled ? 'tile--filled' : '',
                    statusClass,
                    isRevealing ? 'tile--reveal' : '',
                    celebrate ? 'tile--celebrate' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  style={style}
                >
                  {letter}
                </div>
              );
            })}
          </div>
        );
      })}
    </section>
  );
}
