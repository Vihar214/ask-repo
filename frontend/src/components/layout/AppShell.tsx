import type { ReactNode } from 'react';
import { Outlet } from 'react-router-dom';

export function AppShell({ children }: { children?: ReactNode }) {
  return (
    <div
      className="min-h-screen bg-pixel-bg text-pixel-text"
      data-testid="app-shell"
    >
      <main className="mx-auto w-full max-w-5xl px-6 pb-20 pt-8 sm:px-10 sm:pt-14">
        {children ?? <Outlet />}
      </main>
    </div>
  );
}
