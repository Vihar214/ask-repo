import type { SessionState } from '../../types';

type SessionStatus = 'loading' | 'ready' | 'error';

export function SessionPanel({
  state,
  status,
  runAction,
}: {
  state: SessionState | null;
  status: SessionStatus;
  runAction: (url: string, method: 'POST' | 'DELETE') => Promise<void>;
}) {
  const loggedIn = status === 'ready' && state?.session.kind === 'logged_in';

  return (
    <section className="session-panel" aria-live="polite">
      <p>
        {status === 'loading' && 'Loading session...'}
        {status === 'error' && 'Unable to load session'}
        {status === 'ready' &&
          (loggedIn
            ? `Logged in as ${state?.user?.githubUsername}`
            : 'Using Ask Repo as a guest')}
      </p>
      {status === 'ready' && state?.session.recovered && (
        <p className="session-note">
          Your previous session expired. A fresh guest session was created.
        </p>
      )}
      {status === 'ready' &&
        (loggedIn ? (
          <>
            <button onClick={() => void runAction('/auth/logout', 'POST')}>
              Log out
            </button>
            <button
              className="danger-button"
              onClick={() => void runAction('/account', 'DELETE')}
            >
              Delete account
            </button>
          </>
        ) : (
          <a className="login-button" href="/auth/github/start">
            Log in with GitHub
          </a>
        ))}
    </section>
  );
}
