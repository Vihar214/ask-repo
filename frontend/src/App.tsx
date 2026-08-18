import { BrowserRouter, Route, Routes } from 'react-router-dom';

import { AppShell } from './components';
import type { SessionAction, SessionFetcher } from './features/session';
import { HomePage } from './pages';

export function App({
  getSession,
  mutateSession,
}: {
  getSession?: SessionFetcher;
  mutateSession?: SessionAction;
}) {
  return (
    <BrowserRouter>
      <AppShell>
        <Routes>
          <Route
            path="/"
            element={
              <HomePage getSession={getSession} mutateSession={mutateSession} />
            }
          />
        </Routes>
      </AppShell>
    </BrowserRouter>
  );
}
