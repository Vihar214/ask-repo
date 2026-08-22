CREATE TABLE users (
    id UUID PRIMARY KEY,
    github_user_id TEXT NOT NULL UNIQUE,
    github_username TEXT NOT NULL,
    avatar_url TEXT,
    email TEXT,
    last_login_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE sessions (
    id UUID PRIMARY KEY,
    kind TEXT NOT NULL CHECK (kind IN ('guest', 'logged_in')),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    csrf_token TEXT NOT NULL,
    oauth_state TEXT,
    oauth_state_expires_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    last_seen_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CHECK ((kind = 'guest' AND user_id IS NULL) OR (kind = 'logged_in' AND user_id IS NOT NULL))
);

CREATE INDEX sessions_user_id_idx ON sessions(user_id);
CREATE INDEX sessions_expires_at_idx ON sessions(expires_at);
