import type { SessionState } from '../../types';

export type SessionFetcher = () => Promise<SessionState>;
export type SessionAction = (
  url: string,
  method: 'POST' | 'DELETE',
  csrfToken: string,
) => Promise<void>;

export const fetchSession: SessionFetcher = async () => {
  const response = await fetch('/session', { credentials: 'include' });
  if (!response.ok) throw new Error('Unable to load session');
  return response.json() as Promise<SessionState>;
};

export const sendSessionAction: SessionAction = async (
  url,
  method,
  csrfToken,
) => {
  await fetch(url, {
    method,
    credentials: 'include',
    headers: { 'x-csrf-token': csrfToken },
  });
};
