import { Modal } from './Modal';

interface HelpDialogProps {
  onClose: () => void;
}

export function HelpDialog({ onClose }: HelpDialogProps) {
  return (
    <Modal title="How to play" onClose={onClose}>
      <p>Guess the hidden five-letter word in six tries.</p>
      <p>After each guess, tiles show how close you are: green is exact, yellow is present elsewhere, gray is unavailable.</p>
      <p>There is one puzzle each local calendar day. Hard mode requires discovered clues to be reused.</p>
      <div className="example-grid">
        <div className="tile tile--correct tile--filled">S</div>
        <div className="tile tile--filled">T</div>
        <div className="tile tile--filled">E</div>
        <div className="tile tile--filled">A</div>
        <div className="tile tile--filled">M</div>
      </div>
      <p><strong>S</strong> is in the word and in the correct position.</p>
      <div className="example-grid">
        <div className="tile tile--filled">C</div>
        <div className="tile tile--present tile--filled">R</div>
        <div className="tile tile--filled">A</div>
        <div className="tile tile--filled">N</div>
        <div className="tile tile--filled">E</div>
      </div>
      <p><strong>R</strong> is in the word but belongs in a different spot.</p>
    </Modal>
  );
}
