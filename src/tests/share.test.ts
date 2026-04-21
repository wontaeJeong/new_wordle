import { describe, expect, it } from 'vitest';
import { buildShareText } from '../game/share';

describe('share formatting', () => {
  it('creates a spoiler-free emoji grid', () => {
    const text = buildShareText(10, 'won', [
      { guess: 'CIGAR', statuses: ['absent', 'present', 'absent', 'absent', 'correct'] },
      { guess: 'REACT', statuses: ['correct', 'correct', 'correct', 'correct', 'correct'] },
    ]);

    expect(text).toContain('Daily Lexicon 10 2/6');
    expect(text).toContain('⬛🟨⬛⬛🟩');
    expect(text).toContain('🟩🟩🟩🟩🟩');
    expect(text).not.toContain('REACT');
  });
});
