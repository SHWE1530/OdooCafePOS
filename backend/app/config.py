import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "Odoo Cafe POS"
    API_V1_STR: str = "/api"
    SECRET_KEY: str = os.getenv("SECRET_KEY", "supersecretkeyforodoocafeposapp123456!!!")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days for session persistence in hackathon
    DATABASE_URL: str = "sqlite:///./cafe_pos.db"

    class Config:
        case_sensitive = True

settings = Settings()
