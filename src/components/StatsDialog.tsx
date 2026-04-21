import { getWinPercentage } from '../game/stats';
import type { StatsState } from '../game/types';
import { Modal } from './Modal';

interface StatsDialogProps {
  stats: StatsState;
  canShare: boolean;
  onShare: () => void;
  onClose: () => void;
}

export function StatsDialog({ stats, canShare, onShare, onClose }: StatsDialogProps) {
  return (
    <Modal title="Statistics" onClose={onClose}>
      <div className="stats-grid">
        <div><strong>{stats.gamesPlayed}</strong><span>Played</span></div>
        <div><strong>{getWinPercentage(stats)}</strong><span>Win %</span></div>
        <div><strong>{stats.currentStreak}</strong><span>Current streak</span></div>
        <div><strong>{stats.maxStreak}</strong><span>Max streak</span></div>
      </div>
      <div className="distribution">
        {[1, 2, 3, 4, 5, 6].map((attempt) => (
          <div key={attempt} className="distribution-row">
            <span>{attempt}</span>
            <div className="distribution-bar" style={{ width: `${Math.max(stats.guessDistribution[attempt as 1 | 2 | 3 | 4 | 5 | 6] * 14, 12)}px` }}>
              {stats.guessDistribution[attempt as 1 | 2 | 3 | 4 | 5 | 6]}
            </div>
          </div>
        ))}
      </div>
      {canShare ? (
        <button type="button" className="primary-button" onClick={onShare}>
          Share result
        </button>
      ) : null}
    </Modal>
  );
}
