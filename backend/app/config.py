from functools import lru_cache
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parent.parent


def _resolve(path: str) -> Path:
    p = Path(path)
    return p if p.is_absolute() else (BACKEND_DIR / p).resolve()


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=str(BACKEND_DIR / ".env"), extra="ignore")

    OPENAI_API_KEY: str = ""
    # Required, no fallback. Must equal NEXTAUTH_SECRET in frontend/.env.
    JWT_SECRET: str = Field(min_length=16)
    CHROMA_PERSIST_DIR: str = "./chroma_db"
    BACKEND_PORT: int = 8000
    FRONTEND_URL: str = "http://localhost:3000"

    @property
    def chroma_dir(self) -> str:
        return str(_resolve(self.CHROMA_PERSIST_DIR))

    @property
    def data_path(self) -> Path:
        return BACKEND_DIR / "data" / "indian_law.json"


@lru_cache
def get_settings() -> Settings:
    try:
        return Settings()
    except Exception as exc:
        raise RuntimeError(
            "Invalid backend configuration: JWT_SECRET is missing or too short (min 16 chars). "
            "Set JWT_SECRET in backend/.env to the same value as NEXTAUTH_SECRET in frontend/.env."
        ) from exc
