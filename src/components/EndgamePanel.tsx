import type { GameStatus } from '../game/types';

interface EndgamePanelProps {
  status: GameStatus;
  answer: string;
  onShare: () => void;
  isRevealing: boolean;
}

export function EndgamePanel({ status, answer, onShare, isRevealing }: EndgamePanelProps) {
  if (status === 'in_progress' || isRevealing) {
    return null;
  }

  return (
    <section className="endgame-panel" aria-label="End of game summary">
      <h2>{status === 'won' ? 'Puzzle solved' : 'Puzzle complete'}</h2>
      <p>{status === 'won' ? 'Nice work. The board is ready to share.' : `The answer was ${answer}.`}</p>
      <button type="button" className="primary-button" onClick={onShare}>
        Share result
      </button>
    </section>
  );
}
