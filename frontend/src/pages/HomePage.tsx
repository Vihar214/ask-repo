import {
  SessionPanel,
  useSession,
  type SessionAction,
  type SessionFetcher,
} from '../features/session';
import { RepositoryUrlField } from '../components';

export function HomePage({
  getSession,
  mutateSession,
}: {
  getSession?: SessionFetcher;
  mutateSession?: SessionAction;
}) {
  const { state, status, runAction } = useSession(getSession, mutateSession);
  const loggedIn = status === 'ready' && state?.session.kind === 'logged_in';

  return (
    <div className="space-y-8">
      <section className="max-w-3xl space-y-5">
        <p className="w-fit border border-pixel-border bg-pixel-surface-cream px-3 py-2 text-xs uppercase tracking-[0.24em] text-pixel-muted">
          Repo intelligence, cited
        </p>
        <h1 className="font-pixel text-3xl leading-tight tracking-[-0.04em] sm:text-5xl">
          Ask Repo
        </h1>
        <p className="max-w-2xl text-base leading-7 text-pixel-muted sm:text-lg">
          Chat with your GitHub repository codebases with AST-aware indexing,
          LSP symbol reference resolution, and precise file citations.
        </p>
      </section>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="border border-pixel-border bg-pixel-surface-light p-5 sm:p-7">
          <SessionPanel state={state} status={status} runAction={runAction} />
          {status === 'ready' && !loggedIn && (
            <p
              className="mt-5 border border-pixel-border bg-pixel-surface-cream px-4 py-3 text-sm leading-6 text-pixel-text"
              role="alert"
            >
              <span className="font-semibold uppercase tracking-[0.16em]">
                Warning:
              </span>{' '}
              Guest-created repository data is temporary and will be lost if you
              log in.
            </p>
          )}
          <div className="mt-6">
            <RepositoryUrlField />
          </div>
        </div>

        <aside className="border border-pixel-border bg-pixel-surface-dark p-5 text-pixel-surface-light">
          <div className="pixel-corner mb-5 h-14 w-14 border border-pixel-border bg-[#ff7b42]" />
          <h2 className="text-sm font-semibold uppercase tracking-[0.2em]">
            v0 scope
          </h2>
          <dl className="mt-5 space-y-4 text-sm leading-6">
            <div>
              <dt className="text-pixel-muted">Guest limit</dt>
              <dd>500 files</dd>
            </div>
            <div>
              <dt className="text-pixel-muted">Logged-in limit</dt>
              <dd>10,000 files</dd>
            </div>
            <div>
              <dt className="text-pixel-muted">Private access</dt>
              <dd>One-use pasted token, never stored</dd>
            </div>
          </dl>
        </aside>
      </section>
    </div>
  );
}
