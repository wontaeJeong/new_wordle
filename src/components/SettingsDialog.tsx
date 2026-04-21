import type { SettingsState } from '../game/types';
import { Modal } from './Modal';

interface SettingsDialogProps {
  settings: SettingsState;
  onChange: (key: keyof SettingsState, value: boolean) => void;
  onClose: () => void;
  versionLabel: string;
}

export function SettingsDialog({ settings, onChange, onClose, versionLabel }: SettingsDialogProps) {
  return (
    <Modal title="Settings" onClose={onClose}>
      <label className="setting-row">
        <span>Dark mode</span>
        <input type="checkbox" checked={settings.darkMode} onChange={(event) => onChange('darkMode', event.target.checked)} />
      </label>
      <label className="setting-row">
        <span>High contrast mode</span>
        <input
          type="checkbox"
          checked={settings.highContrast}
          onChange={(event) => onChange('highContrast', event.target.checked)}
        />
      </label>
      <label className="setting-row">
        <span>Hard mode</span>
        <input type="checkbox" checked={settings.hardMode} onChange={(event) => onChange('hardMode', event.target.checked)} />
      </label>
      <label className="setting-row">
        <span>Reduce motion</span>
        <input
          type="checkbox"
          checked={settings.reduceMotion}
          onChange={(event) => onChange('reduceMotion', event.target.checked)}
        />
      </label>
      <p className="build-meta">Build {versionLabel}</p>
    </Modal>
  );
}
