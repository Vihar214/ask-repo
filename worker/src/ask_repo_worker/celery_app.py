from celery import Celery

from ask_repo_worker.config import get_settings

settings = get_settings()

celery_app = Celery(
    "ask_repo_worker",
    broker=settings.redis_url,
    backend=settings.redis_url,
    include=["ask_repo_worker.queues.tasks"],
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
)
