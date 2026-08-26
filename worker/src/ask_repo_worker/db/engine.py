from sqlalchemy import create_engine

from ask_repo_worker.config import get_settings


def get_engine(database_url: str | None = None):
    url = database_url or get_settings().database_url
    return create_engine(normalize_sqlalchemy_database_url(url))


def normalize_sqlalchemy_database_url(database_url: str):
    if database_url.startswith("postgres://"):
        return database_url.replace("postgres://", "postgresql+psycopg2://", 1)
    return database_url
