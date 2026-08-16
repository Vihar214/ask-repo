from sqlalchemy import create_engine

from ask_repo_worker.config import get_settings


def get_engine(database_url: str | None = None):
    url = database_url or get_settings().database_url
    return create_engine(url)
