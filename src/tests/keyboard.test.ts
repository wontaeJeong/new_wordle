import { describe, expect, it } from 'vitest';
import { buildKeyboardState, mergeKeyboardStatus } from '../game/keyboard';

describe('keyboard status merging', () => {
  it('never downgrades a correct key', () => {
    expect(mergeKeyboardStatus('correct', 'present')).toBe('correct');
    expect(mergeKeyboardStatus('correct', 'absent')).toBe('correct');
  });

  it('never downgrades a present key to absent', () => {
    expect(mergeKeyboardStatus('present', 'absent')).toBe('present');
  });

  it('builds keyboard state across guesses with priority', () => {
    const state = buildKeyboardState([
      { guess: 'CIGAR', statuses: ['absent', 'present', 'absent', 'absent', 'absent'] },
      { guess: 'RACER', statuses: ['correct', 'absent', 'correct', 'absent', 'absent'] },
    ]);

    expect(state.R).toBe('correct');
    expect(state.I).toBe('present');
    expect(state.C).toBe('correct');
  });
});
