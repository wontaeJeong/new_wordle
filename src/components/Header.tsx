interface HeaderProps {
  title: string;
  username: string;
  isLogoutPending: boolean;
  onOpenHelp: () => void;
  onOpenStats: () => void;
  onOpenSettings: () => void;
  onLogout: () => void;
}

export function Header({ title, username, isLogoutPending, onOpenHelp, onOpenStats, onOpenSettings, onLogout }: HeaderProps) {
  return (
    <header className="app-header">
      <button type="button" className="icon-button" onClick={onOpenHelp} aria-label="Open help dialog">
        ?
      </button>
      <h1>{title}</h1>
      <div className="header-actions">
        <button type="button" className="icon-button" onClick={onOpenStats} aria-label="Open statistics dialog">
          ⊞
        </button>
        <button type="button" className="icon-button" onClick={onOpenSettings} aria-label="Open settings dialog">
          ⚙
        </button>
        <span className="account-chip" aria-label={`Signed in as ${username}`}>{username}</span>
        <button type="button" className="secondary-button" onClick={onLogout} disabled={isLogoutPending}>
          {isLogoutPending ? 'Signing out' : 'Sign out'}
        </button>
      </div>
    </header>
  );
}
