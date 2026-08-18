import type { ReactNode } from 'react';

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="app-shell" data-testid="app-shell">
      <header className="app-header">
        <div className="app-logo">Ask Repo</div>
      </header>
      <main className="app-main">{children}</main>
    </div>
  );
}
