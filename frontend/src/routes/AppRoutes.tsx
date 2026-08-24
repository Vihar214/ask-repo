import { useMemo } from 'react';
import { RouterProvider } from 'react-router-dom';

import { createAppRouter, type AppRouterOptions } from './react-router';

export function AppRoutes({ getSession, mutateSession }: AppRouterOptions) {
  const appRouter = useMemo(
    () => createAppRouter({ getSession, mutateSession }),
    [getSession, mutateSession],
  );

  return <RouterProvider router={appRouter} />;
}
