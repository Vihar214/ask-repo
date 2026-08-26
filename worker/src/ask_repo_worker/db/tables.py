from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    MetaData,
    String,
    Table,
)

metadata = MetaData()

schema_migrations = Table(
    "schema_migrations",
    metadata,
    Column("version", String, primary_key=True),
    Column("name", String, nullable=False),
    Column("applied_at", DateTime),
)

repositories = Table(
    "repositories",
    metadata,
    Column("id", String, primary_key=True),
    Column("session_id", String),
    Column("user_id", String),
    Column("url", String, nullable=False),
    Column("github_owner", String, nullable=False),
    Column("github_repo", String, nullable=False),
    Column("is_private", Boolean, nullable=False),
    Column("active_repository", Boolean, nullable=False),
    Column("status", String, nullable=False),
    Column("created_at", DateTime),
    Column("updated_at", DateTime),
)

repository_jobs = Table(
    "repository_jobs",
    metadata,
    Column("id", String, primary_key=True),
    Column("repository_id", String, ForeignKey("repositories.id"), nullable=False),
    Column("replaces_repository_id", String, ForeignKey("repositories.id")),
    Column("status", String, nullable=False),
    Column("file_count", Integer),
    Column("file_limit", Integer),
    Column("failure_code", String),
    Column("failure_message", String),
    Column("failure_detail", String),
    Column("temp_clone_path", String),
    Column("previous_repository_status", String),
    Column("started_at", DateTime),
    Column("ready_for_indexing_at", DateTime),
    Column("finished_at", DateTime),
    Column("created_at", DateTime),
    Column("updated_at", DateTime),
)
