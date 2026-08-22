export type SessionKind = 'guest' | 'logged_in';

export interface SessionState {
  session: {
    kind: SessionKind;
    expiresAt: string;
    csrfToken: string;
    recovered: boolean;
  };
  user: {
    githubUsername: string;
    avatarUrl: string | null;
    email: string | null;
  } | null;
}
