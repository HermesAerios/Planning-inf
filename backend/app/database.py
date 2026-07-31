from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from .config import settings

# Using sync engine for simplicity with OR-Tools and standard library usage
# We can switch to async if needed, but for now we'll stick to robust sync SQLAlchemy
SQLALCHEMY_DATABASE_URL = settings.DATABASE_URL.replace("postgres://", "postgresql://")

engine = create_engine(
    SQLALCHEMY_DATABASE_URL
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
