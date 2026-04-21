import { describe, expect, it } from 'vitest';
import { evaluateGuess } from '../game/evaluateGuess';

describe('evaluateGuess', () => {
  it('marks an exact match as all correct', () => {
    expect(evaluateGuess('CIGAR', 'CIGAR').statuses).toEqual([
      'correct',
      'correct',
      'correct',
      'correct',
      'correct',
    ]);
  });

  it('handles present and absent letters with duplicate rules', () => {
    expect(evaluateGuess('ANNAL', 'BANAL').statuses).toEqual([
      'present',
      'absent',
      'correct',
      'correct',
      'correct',
    ]);
  });

  it('does not over-allocate duplicate present letters after greens', () => {
    expect(evaluateGuess('LEECH', 'CLOSE').statuses).toEqual([
      'present',
      'present',
      'absent',
      'present',
      'absent',
    ]);
  });

  it('limits repeated guesses to available answer letters', () => {
    expect(evaluateGuess('OOOOO', 'ROBOT').statuses).toEqual([
      'absent',
      'correct',
      'absent',
      'correct',
      'absent',
    ]);
  });

  it('handles answer with one instance and guess with two', () => {
    expect(evaluateGuess('EERIE', 'CIDER').statuses).toEqual([
      'present',
      'absent',
      'present',
      'present',
      'absent',
    ]);
  });
});
