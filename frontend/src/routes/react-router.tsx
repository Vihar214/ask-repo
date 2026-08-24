import { createBrowserRouter } from 'react-router-dom';

import { AppShell } from '../components';
import type { SessionAction, SessionFetcher } from '../features/session';
import { HomePage } from '../pages';

export type AppRouterOptions = {
  getSession?: SessionFetcher;
  mutateSession?: SessionAction;
};

export const createAppRouter = ({
  getSession,
  mutateSession,
}: AppRouterOptions = {}) =>
  createBrowserRouter([
    {
      path: '/',
      element: <AppShell />,
      children: [
        {
          index: true,
          element: (
            <HomePage getSession={getSession} mutateSession={mutateSession} />
          ),
        },
      ],
    },
  ]);

export const router = createAppRouter();
