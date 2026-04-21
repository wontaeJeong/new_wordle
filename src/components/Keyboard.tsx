import type { KeyboardStatus } from '../game/types';

const KEYBOARD_LAYOUT = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
  ['ENTER', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', 'BACKSPACE'],
] as const;

interface KeyboardProps {
  letterStates: Record<string, KeyboardStatus>;
  onKeyPress: (key: string) => void;
  disabled: boolean;
}

export function Keyboard({ letterStates, onKeyPress, disabled }: KeyboardProps) {
  return (
    <section className="keyboard" aria-label="On-screen keyboard">
      {KEYBOARD_LAYOUT.map((row) => (
        <div key={row.join('-')} className="keyboard-row">
          {row.map((keyValue) => {
            const status = keyValue.length === 1 ? letterStates[keyValue] ?? 'unused' : 'unused';
            const label = keyValue === 'BACKSPACE' ? 'Delete' : keyValue === 'ENTER' ? 'Enter' : keyValue;

            return (
              <button
                key={keyValue}
                type="button"
                className={`key key--${status} ${keyValue.length > 1 ? 'key--wide' : ''}`}
                onClick={() => onKeyPress(keyValue)}
                aria-label={label}
                disabled={disabled}
              >
                {keyValue === 'BACKSPACE' ? '⌫' : keyValue}
              </button>
            );
          })}
        </div>
      ))}
    </section>
  );
}
