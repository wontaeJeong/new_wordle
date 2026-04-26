import { useCallback, useEffect } from 'react';
import { appConfig } from './config/appConfig';
import { ErrorBoundary } from './ErrorBoundary';
import { Header } from './components/Header';
import { Board } from './components/Board';
import { EndgamePanel } from './components/EndgamePanel';
import { HelpDialog } from './components/HelpDialog';
import { Keyboard } from './components/Keyboard';
import { SettingsDialog } from './components/SettingsDialog';
import { StatsDialog } from './components/StatsDialog';
import { Toast } from './components/Toast';
import { useWordGame } from './hooks/useWordGame';
import './App.css';

function AppShell() {
  const game = useWordGame();
  const {
    addLetter,
    closeDialog,
    currentGuess,
    dialog,
    evaluations,
    guesses,
    keyboardState,
    liveSummary,
    openDialog,
    puzzle,
    removeLetter,
    revealingRow,
    settings,
    shakingRow,
    shareResults,
    stats,
    status,
    submitGuess,
    toast,
    updateSetting,
  } = game;

  const isDialogOpen = dialog !== null;
  const isKeyboardDisabled = status !== 'in_progress' || revealingRow !== null || isDialogOpen;

  const handleKeyboardPress = useCallback((key: string) => {
    if (key === 'ENTER') {
      submitGuess();
      return;
    }

    if (key === 'BACKSPACE') {
      removeLetter();
      return;
    }

    addLetter(key);
  }, [addLetter, removeLetter, submitGuess]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isDialogOpen) {
        return;
      }

      if (event.isComposing || event.key === 'Process') {
        return;
      }

      const target = event.target as HTMLElement | null;
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) {
        return;
      }

      if (/^[a-zA-Z]$/.test(event.key)) {
        event.preventDefault();
        addLetter(event.key.toUpperCase());
        return;
      }

      if (event.key === 'Backspace') {
        event.preventDefault();
        removeLetter();
        return;
      }

      if (event.key === 'Enter') {
        event.preventDefault();
        submitGuess();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [addLetter, isDialogOpen, removeLetter, submitGuess]);

  const versionLabel = `${appConfig.version} (${appConfig.buildId})`;

  return (
    <main className="app-shell">
      <Toast message={toast?.message ?? null} />
      <div className="game-card">
        <Header
          title={appConfig.appTitle}
          onOpenHelp={() => openDialog('help')}
          onOpenStats={() => openDialog('stats')}
          onOpenSettings={() => openDialog('settings')}
        />
        <Board
          guesses={guesses}
          currentGuess={currentGuess}
          evaluations={evaluations}
          revealingRow={revealingRow}
          shakingRow={shakingRow}
          status={status}
          reduceMotion={settings.reduceMotion}
          liveSummary={liveSummary}
        />
        <Keyboard
          letterStates={keyboardState}
          onKeyPress={handleKeyboardPress}
          disabled={isKeyboardDisabled}
        />
        <EndgamePanel
          status={status}
          answer={puzzle.answer}
          onShare={() => void shareResults()}
          isRevealing={revealingRow !== null}
        />
      </div>

      {dialog === 'help' ? <HelpDialog onClose={closeDialog} /> : null}
      {dialog === 'settings' ? (
        <SettingsDialog
          settings={settings}
          onChange={updateSetting}
          onClose={closeDialog}
          versionLabel={versionLabel}
        />
      ) : null}
      {dialog === 'stats' ? (
        <StatsDialog
          stats={stats}
          canShare={status !== 'in_progress' && revealingRow === null}
          onShare={() => void shareResults()}
          onClose={closeDialog}
        />
      ) : null}
    </main>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppShell />
    </ErrorBoundary>
  );
}
