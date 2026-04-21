import { DEFAULT_STATS } from './constants';
import type { GameStatus, StatsState } from './types';

export function getWinPercentage(stats: StatsState): number {
  if (stats.gamesPlayed === 0) {
    return 0;
  }

  return Math.round((stats.wins / stats.gamesPlayed) * 100);
}

export function completePuzzleStats(
  stats: StatsState,
  puzzleId: string,
  status: GameStatus,
  attemptsUsed: number,
): StatsState {
  if (stats.lastCompletedPuzzleId === puzzleId) {
    return stats;
  }

  const nextStats: StatsState = structuredClone(stats ?? DEFAULT_STATS);
  nextStats.gamesPlayed += 1;
  nextStats.lastCompletedPuzzleId = puzzleId;

  if (status === 'won') {
    nextStats.wins += 1;
    nextStats.currentStreak += 1;
    nextStats.maxStreak = Math.max(nextStats.maxStreak, nextStats.currentStreak);
    if (attemptsUsed >= 1 && attemptsUsed <= 6) {
      nextStats.guessDistribution[attemptsUsed as 1 | 2 | 3 | 4 | 5 | 6] += 1;
    }
  } else {
    nextStats.currentStreak = 0;
  }

  return nextStats;
}
