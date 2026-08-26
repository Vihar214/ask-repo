from ask_repo_worker.celery_app import celery_app
from ask_repo_worker.health import smoke_check_payload
from ask_repo_worker.repository_jobs import (
    CloneAndCountRepositoryPayload,
    clone_and_count_repository,
)


@celery_app.task(name="worker.smoke_check")
def smoke_check():
    return smoke_check_payload()

@celery_app.task(name="worker.clone_and_count")
def clone_and_count_task(payload_dict: dict):
    payload = CloneAndCountRepositoryPayload(**payload_dict)
    return clone_and_count_repository(payload)
