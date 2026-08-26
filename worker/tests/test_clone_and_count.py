import os
import shutil
import subprocess
from pathlib import Path

import pytest

os.environ.setdefault("DATABASE_URL", "postgres://postgres:postgres@localhost:5432/askrepo")
os.environ.setdefault("REDIS_URL", "redis://localhost:6379/0")
os.environ.setdefault("OLLAMA_BASE_URL", "http://localhost:11434")
os.environ.setdefault("EMBEDDING_MODEL", "qwen3-embedding:0.6b")

from ask_repo_worker.repository_jobs import (
    CloneAndCountRepositoryPayload,
    _sanitize_failure_detail,
    clone_and_count_repository,
)

PROJECT_ROOT = Path(__file__).resolve().parents[2]
TEMP_CLONE_ROOT = PROJECT_ROOT / "tmp" / "ask-repo-clones"


@pytest.fixture(autouse=True)
def cleanup_test_temp_clones():
    yield
    for job_id in (
        "job-under-limit",
        "job-over-limit-guest",
        "job-over-limit-logged-in",
        "job-collision",
        "job-clone-failure",
    ):
        shutil.rmtree(TEMP_CLONE_ROOT / job_id, ignore_errors=True)


class RecordingRepositoryJobStore:
    def __init__(self, session_kind="guest"):
        self.session_kind = session_kind
        self.events = []

    def get_repository_owner_kind(self, repository_id):
        self.events.append(("owner_kind", repository_id))
        return self.session_kind

    def mark_cloning(self, repository_job_id, repository_id):
        self.events.append(("status", repository_job_id, repository_id, "cloning"))

    def mark_counting_files(self, repository_job_id):
        self.events.append(("status", repository_job_id, "counting_files"))

    def mark_ready_for_indexing(
        self,
        repository_job_id,
        repository_id,
        file_count,
        file_limit,
        temp_clone_path,
        replace_repository_id=None,
    ):
        self.events.append(
            (
                "ready_for_indexing",
                repository_job_id,
                repository_id,
                file_count,
                file_limit,
                temp_clone_path,
                replace_repository_id,
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
        self.events.append(
            (
                "rejected_file_limit",
                repository_job_id,
                repository_id,
                file_count,
                file_limit,
                failure_message,
            )
        )

    def mark_failed(self, repository_job_id, repository_id, failure_code, failure_message, failure_detail):
        self.events.append(
            (
                "failed",
                repository_job_id,
                repository_id,
                failure_code,
                failure_message,
                failure_detail,
            )
        )


def create_git_repo(path: Path, file_count: int):
    path.mkdir(parents=True)
    subprocess.run(["git", "init"], cwd=path, check=True, stdout=subprocess.DEVNULL)
    subprocess.run(
        ["git", "config", "user.email", "test@example.com"],
        cwd=path,
        check=True,
    )
    subprocess.run(["git", "config", "user.name", "Test"], cwd=path, check=True)
    for index in range(file_count):
        (path / f"file_{index}.txt").write_text(f"hello {index}\n")
    subprocess.run(["git", "add", "."], cwd=path, check=True)
    subprocess.run(["git", "commit", "-m", "init"], cwd=path, check=True, stdout=subprocess.DEVNULL)


def payload_for(url: str, job_id: str, token=None):
    return CloneAndCountRepositoryPayload(
        repositoryJobId=job_id,
        repositoryId="repo-1",
        url=url,
        isPrivate=token is not None,
        privateRepositoryToken=token,
        replaceRepositoryId=None,
    )


def test_clone_and_count_marks_under_limit_repository_ready_for_indexing(tmp_path):
    source = tmp_path / "source"
    create_git_repo(source, 3)
    store = RecordingRepositoryJobStore(session_kind="guest")

    clone_and_count_repository(
        payload_for(source.as_uri(), "job-under-limit"),
        store=store,
    )

    assert ("status", "job-under-limit", "repo-1", "cloning") in store.events
    assert ("status", "job-under-limit", "counting_files") in store.events
    ready = next(event for event in store.events if event[0] == "ready_for_indexing")
    assert ready[1:5] == ("job-under-limit", "repo-1", 3, 500)
    assert ready[5] == str(TEMP_CLONE_ROOT / "job-under-limit")
    assert ready[6] is None
    assert Path(ready[5]).exists()


def test_clone_and_count_rejects_over_limit_guest_repository_and_deletes_clone(tmp_path):
    source = tmp_path / "source"
    create_git_repo(source, 501)
    store = RecordingRepositoryJobStore(session_kind="guest")

    clone_and_count_repository(
        payload_for(source.as_uri(), "job-over-limit-guest"),
        store=store,
    )

    rejected = next(event for event in store.events if event[0] == "rejected_file_limit")
    assert rejected == (
        "rejected_file_limit",
        "job-over-limit-guest",
        "repo-1",
        501,
        500,
        "Guest repositories are limited to 500 files for now. This repository has 501 files.",
    )
    assert not (TEMP_CLONE_ROOT / "job-over-limit-guest").exists()


def test_clone_and_count_rejects_over_limit_logged_in_repository_with_logged_in_limit(tmp_path):
    source = tmp_path / "source"
    create_git_repo(source, 10001)
    store = RecordingRepositoryJobStore(session_kind="logged_in")

    clone_and_count_repository(
        payload_for(source.as_uri(), "job-over-limit-logged-in"),
        store=store,
    )

    rejected = next(event for event in store.events if event[0] == "rejected_file_limit")
    assert rejected == (
        "rejected_file_limit",
        "job-over-limit-logged-in",
        "repo-1",
        10001,
        10000,
        "Logged-in repositories are limited to 10,000 files for now. This repository has 10001 files.",
    )


def test_clone_and_count_fails_on_temp_clone_path_collision(tmp_path):
    source = tmp_path / "source"
    create_git_repo(source, 1)
    clone_path = TEMP_CLONE_ROOT / "job-collision"
    clone_path.mkdir(parents=True, exist_ok=True)
    store = RecordingRepositoryJobStore()

    clone_and_count_repository(
        payload_for(source.as_uri(), "job-collision"),
        store=store,
    )

    failed = next(event for event in store.events if event[0] == "failed")
    assert failed[3] == "worker_failed"


def test_clone_and_count_sanitizes_clone_failures_and_removes_partial_clone(tmp_path):
    store = RecordingRepositoryJobStore()

    clone_and_count_repository(
        payload_for(
            "https://github.com/openai/missing-private",
            "job-clone-failure",
            token="ghp_secret_token",
        ),
        store=store,
    )

    failed = next(event for event in store.events if event[0] == "failed")
    assert failed[3] in {
        "clone_auth_failed",
        "clone_not_found",
        "clone_rate_limited",
        "clone_failed",
    }
    assert "ghp_secret_token" not in failed[4]
    assert "ghp_secret_token" not in failed[5]
    assert "https://ghp_secret_token@" not in failed[5]
    assert not (TEMP_CLONE_ROOT / "job-clone-failure").exists()


def test_sanitize_failure_detail_removes_tokens_and_temp_clone_paths():
    detail = (
        "fatal: token ghp_secret_token failed in "
        f"{TEMP_CLONE_ROOT}/job-clone-failure/.git"
    )

    sanitized = _sanitize_failure_detail(detail, "ghp_secret_token")

    assert "ghp_secret_token" not in sanitized
    assert str(TEMP_CLONE_ROOT / "job-clone-failure") not in sanitized
    assert "[temp clone path redacted]" in sanitized
