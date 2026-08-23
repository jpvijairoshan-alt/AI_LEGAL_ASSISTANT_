from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql://postgres:password@localhost:5432/legal_case_db"
    OPENAI_API_KEY: str = ""
    CHROMA_PERSIST_DIR: str = "./chroma_db"
    BACKEND_PORT: int = 8000
    FRONTEND_URL: str = "http://localhost:3000"
    JWT_SECRET: str = "fallback-secret-key"
    LEGAL_DATA_URL: str = ""

    class Config:
        env_file = ".env"
        extra = "allow"


@lru_cache
def get_settings() -> Settings:
    return Settings()
