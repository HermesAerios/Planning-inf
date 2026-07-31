from pydantic_settings import BaseSettings
from typing import Optional
from typing import Optional

class Settings(BaseSettings):
    DATABASE_URL: str
    REDIS_URL: str
    PROJECT_NAME: str = "Labo Tournées API"
    FRONTEND_URL: str = "http://localhost:3000" # Default for local dev
    
    # External APIs
    TWILIO_ACCOUNT_SID: str
    TWILIO_AUTH_TOKEN: str
    TWILIO_PHONE_NUMBER: Optional[str] = None
    # Geocoding / Routing Apis
    ORS_API_KEY: Optional[str] = None
    GOOGLE_MAPS_API_KEY: Optional[str] = None
    SENDGRID_API_KEY: Optional[str] = None
    SENDGRID_FROM_EMAIL: Optional[str] = None
    
    # Auth
    JWT_SECRET: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 8 # 8 days
    ALGORITHM: str = "HS256"

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
