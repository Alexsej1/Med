from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="TSAR_", env_file=".env", env_file_encoding="utf-8", extra="ignore")

    database_url: str = "sqlite:///./tsar.db"
    jwt_secret: str = "change-me-in-production-use-long-random-secret"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 60 * 24
    diagnosis_confidence_threshold: float = 0.55
    ml_dir: str = ""  # default: backend/ml_artifacts next to app


settings = Settings()
