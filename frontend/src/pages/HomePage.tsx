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
    <div className="hero-card">
      <h1 className="hero-title">Ask Repo</h1>
      <p className="hero-subtitle">
        Chat with your GitHub repository codebases with AST-aware indexing, LSP
        symbol reference resolution, and precise file citations.
      </p>
      <SessionPanel state={state} status={status} runAction={runAction} />
      {status === 'ready' && !loggedIn && (
        <p className="guest-warning" role="alert">
          Guest-created repository data is temporary and will be lost if you log
          in.
        </p>
      )}
      <RepositoryUrlField />
    </div>
  );
}
