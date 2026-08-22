export interface DatabaseSchema {
  schema_migrations: {
    version: string;
    name: string;
    applied_at: Date;
  };
  users: {
    id: string;
    github_user_id: string;
    github_username: string;
    avatar_url: string | null;
    email: string | null;
    last_login_at: Date;
    created_at: Date;
    updated_at: Date;
  };
  sessions: {
    id: string;
    kind: 'guest' | 'logged_in';
    user_id: string | null;
    csrf_token: string;
    oauth_state: string | null;
    oauth_state_expires_at: Date | null;
    expires_at: Date;
    last_seen_at: Date;
    created_at: Date;
    updated_at: Date;
  };
}
