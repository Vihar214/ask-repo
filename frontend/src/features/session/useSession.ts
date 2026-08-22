import { useCallback, useEffect, useState } from 'react';

import {
  fetchSession,
  sendSessionAction,
  type SessionAction,
  type SessionFetcher,
} from './api';
import type { SessionState } from '../../types';

type SessionStatus = 'loading' | 'ready' | 'error';

export function useSession(
  getSession: SessionFetcher = fetchSession,
  mutateSession: SessionAction = sendSessionAction,
) {
  const [state, setState] = useState<SessionState | null>(null);
  const [status, setStatus] = useState<SessionStatus>('loading');

  const reload = useCallback(async () => {
    const nextState = await getSession();
    setState(nextState);
    setStatus('ready');
    return nextState;
  }, [getSession]);

  useEffect(() => {
    void reload().catch(() => {
      setState(null);
      setStatus('error');
    });
  }, [reload]);

  const runAction = useCallback(
    async (url: string, method: 'POST' | 'DELETE') => {
      if (!state) return;
      await mutateSession(url, method, state.session.csrfToken);
      await reload();
    },
    [mutateSession, reload, state],
  );

  return { state, status, runAction };
}
