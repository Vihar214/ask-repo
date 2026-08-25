import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import type { SessionAction, SessionFetcher } from './features/session';
import { AppRoutes } from './routes';

export function App({
  getSession,
  mutateSession,
}: {
  getSession?: SessionFetcher;
  mutateSession?: SessionAction;
}) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <AppRoutes getSession={getSession} mutateSession={mutateSession} />
    </QueryClientProvider>
  );
}
