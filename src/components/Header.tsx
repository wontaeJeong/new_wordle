interface HeaderProps {
  title: string;
  onOpenHelp: () => void;
  onOpenStats: () => void;
  onOpenSettings: () => void;
}

export function Header({ title, onOpenHelp, onOpenStats, onOpenSettings }: HeaderProps) {
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
      </div>
    </header>
  );
}
