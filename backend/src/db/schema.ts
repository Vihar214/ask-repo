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
  repositories: {
    id: string;
    session_id: string | null;
    user_id: string | null;
    url: string;
    github_owner: string;
    github_repo: string;
    is_private: boolean;
    active_repository: boolean;
    status:
      | 'queued'
      | 'processing'
      | 'ready_for_indexing'
      | 'rejected_file_limit'
      | 'failed';
    created_at: Date;
    updated_at: Date;
  };
  repository_jobs: {
    id: string;
    repository_id: string;
    replaces_repository_id: string | null;
    status:
      | 'queued'
      | 'cloning'
      | 'counting_files'
      | 'ready_for_indexing'
      | 'rejected_file_limit'
      | 'failed';
    file_count: number | null;
    file_limit: number | null;
    failure_code: string | null;
    failure_message: string | null;
    failure_detail: string | null;
    temp_clone_path: string | null;
    previous_repository_status:
      | 'queued'
      | 'processing'
      | 'ready_for_indexing'
      | 'rejected_file_limit'
      | 'failed'
      | null;
    started_at: Date | null;
    ready_for_indexing_at: Date | null;
    finished_at: Date | null;
    created_at: Date;
    updated_at: Date;
  };
}
