CREATE TABLE repositories (
    id UUID PRIMARY KEY,
    session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    github_owner TEXT NOT NULL,
    github_repo TEXT NOT NULL,
    is_private BOOLEAN NOT NULL,
    active_repository BOOLEAN NOT NULL DEFAULT TRUE,
    status TEXT NOT NULL CHECK (status IN ('queued', 'processing', 'ready_for_indexing', 'rejected_file_limit', 'failed')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CHECK ((user_id IS NULL) <> (session_id IS NULL))
);

CREATE UNIQUE INDEX repositories_guest_active_session_unique_idx ON repositories(session_id) WHERE user_id IS NULL AND active_repository = TRUE;
CREATE UNIQUE INDEX repositories_logged_in_user_url_unique_idx ON repositories(user_id, url) WHERE user_id IS NOT NULL;

CREATE TABLE repository_jobs (
    id UUID PRIMARY KEY,
    repository_id UUID NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    replaces_repository_id UUID REFERENCES repositories(id) ON DELETE SET NULL,
    status TEXT NOT NULL CHECK (status IN ('queued', 'cloning', 'counting_files', 'ready_for_indexing', 'rejected_file_limit', 'failed')),
    file_count INTEGER,
    file_limit INTEGER,
    failure_code TEXT,
    failure_message TEXT,
    failure_detail TEXT,
    temp_clone_path TEXT,
    previous_repository_status TEXT CHECK (previous_repository_status IN ('queued', 'processing', 'ready_for_indexing', 'rejected_file_limit', 'failed')),
    started_at TIMESTAMP WITH TIME ZONE,
    ready_for_indexing_at TIMESTAMP WITH TIME ZONE,
    finished_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);
