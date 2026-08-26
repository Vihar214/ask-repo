import os
import re
import shutil
import subprocess
from datetime import UTC, datetime
from pathlib import Path

from pydantic import BaseModel
from sqlalchemy import delete, select, update

from ask_repo_worker.db.engine import get_engine
from ask_repo_worker.db.tables import repositories, repository_jobs

PROJECT_ROOT = Path(__file__).resolve().parents[3]
TEMP_CLONE_ROOT = PROJECT_ROOT / "tmp" / "ask-repo-clones"
TEMP_CLONE_PATH_PATTERN = re.compile(
    r"(/tmp|[^\s'\"`]+/ask-repo/tmp)/ask-repo-clones/[^\s'\"`]+"
)
GUEST_FILE_LIMIT = 500
LOGGED_IN_FILE_LIMIT = 10000


class CloneAndCountRepositoryPayload(BaseModel):
    repositoryJobId: str
    repositoryId: str
    url: str
    isPrivate: bool
    privateRepositoryToken: str | None
    replaceRepositoryId: str | None = None


class RepositoryJobStore:
    def __init__(self, database_url: str | None = None):
        self.engine = get_engine(database_url)

    def get_repository_owner_kind(self, repository_id):
        with self.engine.connect() as connection:
            row = connection.execute(
                select(repositories.c.user_id).where(repositories.c.id == repository_id)
            ).first()
        return "logged_in" if row and row.user_id else "guest"

    def mark_cloning(self, repository_job_id, repository_id):
        now = _now()
        with self.engine.begin() as connection:
            connection.execute(
                update(repositories)
                .where(repositories.c.id == repository_id)
                .values(status="processing", updated_at=now)
            )
            connection.execute(
                update(repository_jobs)
                .where(repository_jobs.c.id == repository_job_id)
                .values(status="cloning", started_at=now, updated_at=now)
            )

    def mark_counting_files(self, repository_job_id):
        now = _now()
        with self.engine.begin() as connection:
            connection.execute(
                update(repository_jobs)
                .where(repository_jobs.c.id == repository_job_id)
                .values(status="counting_files", updated_at=now)
            )

    def mark_ready_for_indexing(
        self,
        repository_job_id,
        repository_id,
        file_count,
        file_limit,
        temp_clone_path,
        replace_repository_id=None,
    ):
        now = _now()
        with self.engine.begin() as connection:
            if replace_repository_id:
                connection.execute(
                    delete(repositories).where(repositories.c.id == replace_repository_id)
                )
            connection.execute(
                update(repositories)
                .where(repositories.c.id == repository_id)
                .values(
                    status="ready_for_indexing",
                    active_repository=True,
                    updated_at=now,
                )
            )
            connection.execute(
                update(repository_jobs)
                .where(repository_jobs.c.id == repository_job_id)
                .values(
                    status="ready_for_indexing",
                    file_count=file_count,
                    file_limit=file_limit,
                    temp_clone_path=temp_clone_path,
                    ready_for_indexing_at=now,
                    finished_at=now,
                    updated_at=now,
                )
            )

    def mark_rejected_file_limit(
        self,
        repository_job_id,
        repository_id,
        file_count,
        file_limit,
        failure_message,
    ):
        now = _now()
        with self.engine.begin() as connection:
            repository_status = self._repository_status_after_unsuccessful_job(
                connection, repository_job_id, "rejected_file_limit"
            )
            connection.execute(
                update(repositories)
                .where(repositories.c.id == repository_id)
                .values(status=repository_status, updated_at=now)
            )
            connection.execute(
                update(repository_jobs)
                .where(repository_jobs.c.id == repository_job_id)
                .values(
                    status="rejected_file_limit",
                    file_count=file_count,
                    file_limit=file_limit,
                    failure_code="file_limit_exceeded",
                    failure_message=failure_message,
                    finished_at=now,
                    updated_at=now,
                )
            )

    def mark_failed(
        self,
        repository_job_id,
        repository_id,
        failure_code,
        failure_message,
        failure_detail,
    ):
        now = _now()
        with self.engine.begin() as connection:
            repository_status = self._repository_status_after_unsuccessful_job(
                connection, repository_job_id, "failed"
            )
            connection.execute(
                update(repositories)
                .where(repositories.c.id == repository_id)
                .values(status=repository_status, updated_at=now)
            )
            connection.execute(
                update(repository_jobs)
                .where(repository_jobs.c.id == repository_job_id)
                .values(
                    status="failed",
                    failure_code=failure_code,
                    failure_message=failure_message,
                    failure_detail=failure_detail,
                    finished_at=now,
                    updated_at=now,
                )
            )

    def _repository_status_after_unsuccessful_job(
        self, connection, repository_job_id, unsuccessful_status
    ):
        job = connection.execute(
            select(repository_jobs.c.previous_repository_status).where(
                repository_jobs.c.id == repository_job_id
            )
        ).first()
        if job and job.previous_repository_status:
            return job.previous_repository_status
        return unsuccessful_status


def clone_and_count_repository(payload: CloneAndCountRepositoryPayload, store=None):
    store = store or RepositoryJobStore()
    job_id = payload.repositoryJobId
    repo_id = payload.repositoryId
    owner_kind = store.get_repository_owner_kind(repo_id)
    file_limit = GUEST_FILE_LIMIT if owner_kind == "guest" else LOGGED_IN_FILE_LIMIT

    store.mark_cloning(job_id, repo_id)

    clone_path = TEMP_CLONE_ROOT / job_id
    if clone_path.exists():
        store.mark_failed(job_id, repo_id, "worker_failed", "Temp clone path already exists", "worker_failed")
        return

    askpass_path = clone_path.with_suffix(".askpass.sh")
    try:
        env = os.environ.copy()
        env["GIT_TERMINAL_PROMPT"] = "0"
        if payload.isPrivate and payload.privateRepositoryToken:
            env["GIT_PASSWORD"] = payload.privateRepositoryToken
            clone_path.parent.mkdir(parents=True, exist_ok=True)
            with open(askpass_path, "w") as f:
                f.write("#!/bin/sh\n")
                f.write("case \"$1\" in\n")
                f.write("  *Username*) echo \"x-access-token\" ;;\n")
                f.write("  *) printf '%s\\n' \"$GIT_PASSWORD\" ;;\n")
                f.write("esac\n")
            os.chmod(askpass_path, 0o700)
            env["GIT_ASKPASS"] = str(askpass_path)

        subprocess.run(
            ["git", "clone", "--depth=1", payload.url, str(clone_path)],
            env=env,
            check=True,
            capture_output=True,
            text=True,
        )

    except subprocess.CalledProcessError as e:
        if clone_path.exists():
            shutil.rmtree(clone_path, ignore_errors=True)
        code, message = _map_clone_failure(e.stderr or "", payload.isPrivate)
        detail = _sanitize_failure_detail(e.stderr or "", payload.privateRepositoryToken)
        store.mark_failed(job_id, repo_id, code, message, detail)
        return
    finally:
        askpass_path.unlink(missing_ok=True)

    store.mark_counting_files(job_id)

    try:
        # count files
        res = subprocess.run(
            ["git", "ls-files"],
            cwd=str(clone_path),
            check=True,
            capture_output=True,
            text=True,
        )
        files = [f for f in res.stdout.split("\n") if f]
        file_count = len(files)

        if file_count > file_limit:
            if clone_path.exists():
                shutil.rmtree(clone_path, ignore_errors=True)
            msg = _file_limit_message(owner_kind, file_count)
            store.mark_rejected_file_limit(job_id, repo_id, file_count, file_limit, msg)
            return

        store.mark_ready_for_indexing(
            job_id,
            repo_id,
            file_count,
            file_limit,
            str(clone_path),
            payload.replaceRepositoryId,
        )

    except subprocess.CalledProcessError as e:
        if clone_path.exists():
            shutil.rmtree(clone_path, ignore_errors=True)
        store.mark_failed(
            job_id,
            repo_id,
            "worker_failed",
            "Failed to count repository files.",
            _sanitize_failure_detail(e.stderr or "", payload.privateRepositoryToken),
        )


def _now():
    return datetime.now(UTC)


def _file_limit_message(owner_kind: str, file_count: int):
    if owner_kind == "guest":
        return (
            "Guest repositories are limited to 500 files for now. "
            f"This repository has {file_count} files."
        )

    return (
        "Logged-in repositories are limited to 10,000 files for now. "
        f"This repository has {file_count} files."
    )


def _map_clone_failure(stderr: str, is_private: bool):
    lowered = stderr.lower()
    if "rate limit" in lowered or "too many requests" in lowered:
        return "clone_rate_limited", "GitHub rate-limited this clone. Try again later."
    if "authentication failed" in lowered or "could not read username" in lowered:
        if is_private:
            return (
                "clone_auth_failed",
                "Failed to authenticate. The token may lack access to this repository.",
            )
        return (
            "clone_auth_failed",
            "Authentication failed. You may need to retry with a Private Repository Token.",
        )
    if "not found" in lowered or "repository not found" in lowered:
        return "clone_not_found", "Repository not found or not accessible."
    return "clone_failed", "Failed to clone repository."


def _sanitize_failure_detail(detail: str, token: str | None):
    sanitized = detail.replace("\n", " ").strip()
    if token:
        sanitized = sanitized.replace(token, "***")
    sanitized = TEMP_CLONE_PATH_PATTERN.sub("[temp clone path redacted]", sanitized)
    return sanitized[:1000]
