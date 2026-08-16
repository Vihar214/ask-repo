from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

class WorkerSettings(BaseSettings):
    database_url: str = Field(alias="DATABASE_URL")
    redis_url: str = Field(alias="REDIS_URL")
    ollama_base_url: str = Field(alias="OLLAMA_BASE_URL")
    embedding_model: str = Field(alias="EMBEDDING_MODEL")

    model_config = SettingsConfigDict(env_file="../.env", extra="ignore")

def get_settings() -> WorkerSettings:
    return WorkerSettings()
