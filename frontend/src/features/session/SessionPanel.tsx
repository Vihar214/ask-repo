import type { SessionState } from './models';

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
    <section
      className="flex flex-wrap items-center gap-3 text-sm text-pixel-muted"
      aria-live="polite"
    >
      <p className="mr-auto">
        {status === 'loading' && 'Loading session...'}
        {status === 'error' && 'Unable to load session'}
        {status === 'ready' &&
          (loggedIn
            ? `Logged in as ${state?.user?.githubUsername}`
            : 'Using Ask Repo as a guest')}
      </p>
      {status === 'ready' && state?.session.recovered && (
        <p className="w-full border border-pixel-border bg-pixel-surface-cream px-3 py-2 text-pixel-warning">
          Your previous session expired. A fresh guest session was created.
        </p>
      )}
      {status === 'ready' &&
        (loggedIn ? (
          <>
            <button
              className="min-h-11 border border-pixel-border bg-pixel-surface-light px-4 py-2 text-pixel-text hover:bg-pixel-surface-cream"
              onClick={() => void runAction('/auth/logout', 'POST')}
            >
              Log out
            </button>
            <button
              className="min-h-11 border border-pixel-border bg-pixel-danger px-4 py-2 text-white hover:bg-pixel-surface-dark"
              onClick={() => void runAction('/account', 'DELETE')}
            >
              Delete account
            </button>
          </>
        ) : (
          <a
            className="inline-flex min-h-11 items-center border border-pixel-border bg-pixel-surface-dark px-4 py-2 text-pixel-surface-light no-underline hover:bg-pixel-text"
            href="/auth/github/start"
          >
            Log in with GitHub
          </a>
        ))}
    </section>
  );
}
