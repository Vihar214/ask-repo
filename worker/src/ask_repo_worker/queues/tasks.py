from ask_repo_worker.celery_app import celery_app
from ask_repo_worker.health.smoke import smoke_check_payload


@celery_app.task(name="worker.smoke_check")
def smoke_check():
    return smoke_check_payload()
