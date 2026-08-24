import { useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { SessionStateSchema } from '../models';
import {
  fetchSession,
  sendSessionAction,
  type SessionAction,
  type SessionFetcher,
} from '../api';

type SessionStatus = 'loading' | 'ready' | 'error';

const sessionQueryKey = ['session'] as const;

export function useSession(
  getSession: SessionFetcher = fetchSession,
  mutateSession: SessionAction = sendSessionAction,
) {
  const queryClient = useQueryClient();

  const sessionQuery = useQuery({
    queryKey: sessionQueryKey,
    queryFn: async () => SessionStateSchema.parse(await getSession()),
    retry: false,
  });

  const sessionActionMutation = useMutation({
    mutationKey: ['session-action'],
    mutationFn: async ({
      url,
      method,
      csrfToken,
    }: {
      url: string;
      method: 'POST' | 'DELETE';
      csrfToken: string;
    }) => mutateSession(url, method, csrfToken),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: sessionQueryKey });
    },
  });

  const runAction = useCallback(
    async (url: string, method: 'POST' | 'DELETE') => {
      if (!sessionQuery.data) return;

      await sessionActionMutation.mutateAsync({
        url,
        method,
        csrfToken: sessionQuery.data.session.csrfToken,
      });
    },
    [sessionActionMutation, sessionQuery.data],
  );

  const status: SessionStatus = sessionQuery.isPending
    ? 'loading'
    : sessionQuery.isError
      ? 'error'
      : 'ready';

  return { state: sessionQuery.data ?? null, status, runAction };
}
