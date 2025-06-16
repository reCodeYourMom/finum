from pydantic_settings import BaseSettings
from pydantic import AnyHttpUrl, field_validator, ConfigDict
from typing import List

class Settings(BaseSettings):
    model_config = ConfigDict(
        extra="ignore",      # ignore les vars d’env inconnues
        env_file=".env",
    )

    DATABASE_URL: str
    CORS_ORIGINS: List[AnyHttpUrl] = ["http://localhost:3000"]

    # 👉 les tests s’attendent à trouver les fichiers dans « ./avatars »
    AVATAR_DATA_PATH: str = "./avatars"

    # Permet de fournir CORS_ORIGINS dans .env sous forme "a,b,c"
    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def split_cors(cls, v):
        if isinstance(v, str):
            return [s.strip() for s in v.split(",") if s.strip()]
        return v


settings = Settings()
