import { useEffect } from 'react';
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

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (game.dialog !== null) {
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
        game.addLetter(event.key.toUpperCase());
        return;
      }

      if (event.key === 'Backspace') {
        event.preventDefault();
        game.removeLetter();
        return;
      }

      if (event.key === 'Enter') {
        event.preventDefault();
        game.submitGuess();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [game]);

  const handleKeyboardPress = (key: string) => {
    if (key === 'ENTER') {
      game.submitGuess();
      return;
    }

    if (key === 'BACKSPACE') {
      game.removeLetter();
      return;
    }

    game.addLetter(key);
  };

  const versionLabel = `${appConfig.version} (${appConfig.buildId})`;

  return (
    <main className="app-shell">
      <Toast message={game.toast?.message ?? null} />
      <div className="game-card">
        <Header
          title={appConfig.appTitle}
          onOpenHelp={() => game.openDialog('help')}
          onOpenStats={() => game.openDialog('stats')}
          onOpenSettings={() => game.openDialog('settings')}
        />
        <Board
          guesses={game.guesses}
          currentGuess={game.currentGuess}
          evaluations={game.evaluations}
          revealingRow={game.revealingRow}
          shakingRow={game.shakingRow}
          status={game.status}
          reduceMotion={game.settings.reduceMotion}
          liveSummary={game.liveSummary}
        />
        <Keyboard
          letterStates={game.keyboardState}
          onKeyPress={handleKeyboardPress}
          disabled={game.status !== 'in_progress' || game.revealingRow !== null || game.dialog !== null}
        />
        <EndgamePanel status={game.status} answer={game.puzzle.answer} onShare={() => void game.shareResults()} />
      </div>

      {game.dialog === 'help' ? <HelpDialog onClose={game.closeDialog} /> : null}
      {game.dialog === 'settings' ? (
        <SettingsDialog
          settings={game.settings}
          onChange={game.updateSetting}
          onClose={game.closeDialog}
          versionLabel={versionLabel}
        />
      ) : null}
      {game.dialog === 'stats' ? (
        <StatsDialog
          stats={game.stats}
          canShare={game.status !== 'in_progress'}
          onShare={() => void game.shareResults()}
          onClose={game.closeDialog}
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
