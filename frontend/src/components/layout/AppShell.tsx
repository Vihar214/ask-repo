import type { ReactNode } from 'react';

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div
      className="min-h-screen bg-pixel-bg text-pixel-text"
      data-testid="app-shell"
    >
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-6 sm:px-10">
        <div className="border border-pixel-border bg-pixel-surface-dark px-3 py-2 font-mono text-xs uppercase tracking-[0.28em] text-pixel-surface-light">
          Ask Repo
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl px-6 pb-20 pt-8 sm:px-10 sm:pt-14">
        {children}
      </main>
    </div>
  );
}
