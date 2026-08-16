import os

import pytest
from pydantic import ValidationError

os.environ.setdefault("DATABASE_URL", "postgres://postgres:postgres@localhost:5432/askrepo")
os.environ.setdefault("REDIS_URL", "redis://localhost:6379/0")
os.environ.setdefault("OLLAMA_BASE_URL", "http://localhost:11434")
os.environ.setdefault("EMBEDDING_MODEL", "qwen3-embedding:0.6b")

from ask_repo_worker.celery_app import celery_app
from ask_repo_worker.config import WorkerSettings
from ask_repo_worker.queues.tasks import smoke_check


def test_worker_settings():
    settings = WorkerSettings(
        DATABASE_URL="postgres://postgres:postgres@localhost:5432/askrepo",
        REDIS_URL="redis://localhost:6379/0",
        OLLAMA_BASE_URL="http://localhost:11434",
        EMBEDDING_MODEL="qwen3-embedding:0.6b",
    )
    assert settings.database_url == "postgres://postgres:postgres@localhost:5432/askrepo"
    assert settings.redis_url == "redis://localhost:6379/0"


def test_worker_settings_require_foundation_config(monkeypatch):
    for key in ("DATABASE_URL", "REDIS_URL", "OLLAMA_BASE_URL", "EMBEDDING_MODEL"):
        monkeypatch.delenv(key, raising=False)

    with pytest.raises(ValidationError):
        WorkerSettings(_env_file=None)


def test_smoke_check_task_runs_through_celery():
    celery_app.conf.task_always_eager = True
    celery_app.conf.task_store_eager_result = True

    res = smoke_check.delay().get(timeout=5)
    assert res == {
        "status": "ok",
        "task": "worker.smoke_check",
    }
