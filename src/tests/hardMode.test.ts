import { describe, expect, it } from 'vitest';
import { buildHardModeConstraints, validateHardModeGuess } from '../game/hardMode';

const evaluations = [
  { guess: 'CIGAR', statuses: ['absent', 'present', 'absent', 'correct', 'absent'] as const },
  { guess: 'RIDER', statuses: ['absent', 'correct', 'absent', 'correct', 'absent'] as const },
];

describe('hard mode validation', () => {
  it('builds green and minimum letter constraints', () => {
    const constraints = buildHardModeConstraints(evaluations.map((item) => ({ ...item, statuses: [...item.statuses] })));
    expect(constraints.greens[1]).toBe('I');
    expect(constraints.greens[3]).toBe('E');
    expect(constraints.minimumLetterCounts.get('I')).toBe(1);
  });

  it('rejects guesses that move a known green letter', () => {
    expect(validateHardModeGuess('CRANE', evaluations.map((item) => ({ ...item, statuses: [...item.statuses] })))).toEqual({
      valid: false,
      reason: '2nd letter must be I',
    });
  });

  it('rejects guesses that omit a known present letter', () => {
    const prior = [{ guess: 'CIGAR', statuses: ['absent', 'present', 'absent', 'absent', 'absent'] as const }];
    expect(validateHardModeGuess('STONE', prior.map((item) => ({ ...item, statuses: [...item.statuses] })))).toEqual({
      valid: false,
      reason: 'Guess must contain I',
    });
  });
});
