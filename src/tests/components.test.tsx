import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Header } from '../components/Header';
import { Keyboard } from '../components/Keyboard';
import { Modal } from '../components/Modal';
import { Toast } from '../components/Toast';

describe('Header', () => {
  it('wires all dialog buttons to their callbacks', () => {
    const onOpenHelp = vi.fn();
    const onOpenStats = vi.fn();
    const onOpenSettings = vi.fn();

    render(
        <Header
          title="Daily Lexicon"
          username="player@example.com"
          isLogoutPending={false}
          onOpenHelp={onOpenHelp}
          onOpenStats={onOpenStats}
          onOpenSettings={onOpenSettings}
          onLogout={vi.fn()}
        />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Open help dialog' }));
    fireEvent.click(screen.getByRole('button', { name: 'Open statistics dialog' }));
    fireEvent.click(screen.getByRole('button', { name: 'Open settings dialog' }));

    expect(onOpenHelp).toHaveBeenCalledOnce();
    expect(onOpenStats).toHaveBeenCalledOnce();
    expect(onOpenSettings).toHaveBeenCalledOnce();
  });
});

describe('Keyboard', () => {
  it('applies statuses and emits key presses', () => {
    const onKeyPress = vi.fn();

    render(
      <Keyboard
        letterStates={{ C: 'correct', A: 'present', Z: 'absent' }}
        onKeyPress={onKeyPress}
        disabled={false}
      />,
    );

    const cKey = screen.getByRole('button', { name: 'C' });
    const enterKey = screen.getByRole('button', { name: 'Enter' });

    expect(cKey.className).toContain('key--correct');
    fireEvent.click(cKey);
    fireEvent.click(enterKey);

    expect(onKeyPress).toHaveBeenNthCalledWith(1, 'C');
    expect(onKeyPress).toHaveBeenNthCalledWith(2, 'ENTER');
  });

  it('disables all keys when input is blocked', () => {
    render(<Keyboard letterStates={{}} onKeyPress={vi.fn()} disabled={true} />);
    expect(screen.getByRole('button', { name: 'Q' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Delete' })).toBeDisabled();
  });
});

describe('Modal', () => {
  it('closes on Escape and focuses the first action', () => {
    const onClose = vi.fn();

    render(
      <Modal title="Example" onClose={onClose}>
        <button type="button">Inside</button>
      </Modal>,
    );

    expect(screen.getByRole('button', { name: 'Close Example' })).toHaveFocus();
    fireEvent.keyDown(document, { key: 'Escape' });

    expect(onClose).toHaveBeenCalledOnce();
  });
});

describe('Toast', () => {
  it('renders the current message inside a polite live region', () => {
    render(<Toast message="Copied" />);

    expect(screen.getByText('Copied')).toBeInTheDocument();
    expect(screen.getByText('Copied').closest('.toast-region')).toHaveAttribute('aria-live', 'polite');
  });
});
