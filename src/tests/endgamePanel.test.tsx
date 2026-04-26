import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { EndgamePanel } from '../components/EndgamePanel';

describe('EndgamePanel', () => {
  it('stays hidden while reveal animations are still running', () => {
    render(
      <EndgamePanel
        status="won"
        answer="CIGAR"
        onShare={vi.fn()}
        isRevealing={true}
      />,
    );

    expect(screen.queryByRole('heading', { name: 'Puzzle solved' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Share result' })).not.toBeInTheDocument();
  });

  it('shows the solved state after the reveal finishes', () => {
    render(
      <EndgamePanel
        status="won"
        answer="CIGAR"
        onShare={vi.fn()}
        isRevealing={false}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Puzzle solved' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Share result' })).toBeInTheDocument();
  });
});
