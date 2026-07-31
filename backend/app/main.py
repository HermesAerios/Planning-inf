from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .config import settings

import os

try:
    import sentry_sdk
    if os.getenv("SENTRY_DSN"):
        sentry_sdk.init(
            dsn=os.getenv("SENTRY_DSN"),
            traces_sample_rate=1.0,
            profiles_sample_rate=1.0,
        )
except ImportError:
    pass # Sentry SDK not installed

# Rate Limiting
from .limiter import limiter, add_rate_limit_exception_handler

app = FastAPI(title=settings.PROJECT_NAME)
add_rate_limit_exception_handler(app)

origins = [
    settings.FRONTEND_URL,
    "http://localhost:3000", # keep for local dev convenience if needed, or remove
    "http://localhost"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from .middleware.audit import AuditMiddleware
from fastapi.middleware.gzip import GZipMiddleware

app.add_middleware(AuditMiddleware)
app.add_middleware(GZipMiddleware, minimum_size=1000)

from .routers import auth, patients, optimisation, tournees, reports, users, dashboard, geocoding, settings as app_settings_router, skills
app.include_router(auth.router, prefix="/api")
app.include_router(patients.router, prefix="/api")
app.include_router(optimisation.router, prefix="/api")
app.include_router(tournees.router, prefix="/api")
app.include_router(reports.router, prefix="/api")
app.include_router(users.router, prefix="/api")
app.include_router(dashboard.router, prefix="/api")
app.include_router(geocoding.router, prefix="/api")
app.include_router(app_settings_router.router, prefix="/api")
app.include_router(skills.router, prefix="/api")

@app.get("/")
def read_root():
    return {"message": "Welcome to Labo Tournées API"}

@app.on_event("startup")
def startup_event():
    from .database import engine
    from sqlalchemy import text
    with engine.connect() as conn:
        try:
            try:
                conn.execute(text("ALTER TABLE tournees ADD COLUMN batch_id VARCHAR(50);"))
            except Exception:
                pass
                
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS tournee_history (
                    id SERIAL PRIMARY KEY,
                    tournee_id INTEGER REFERENCES tournees(id) ON DELETE CASCADE,
                    user_id INTEGER REFERENCES users(id),
                    action VARCHAR(50) NOT NULL,
                    details TEXT,
                    signature VARCHAR(100),
                    comment TEXT,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                );
            """))
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS app_settings (
                    id SERIAL PRIMARY KEY,
                    depot_name VARCHAR(255) DEFAULT 'Cabinet Principal',
                    depot_address VARCHAR(500) DEFAULT 'Av. de la Roseraie 72, 1205 Genève',
                    depot_lat FLOAT DEFAULT 46.1910685,
                    depot_lon FLOAT DEFAULT 6.1491002,
                    humanity_balance BOOLEAN DEFAULT TRUE
                );
            """))
            conn.commit()
        except Exception:
            pass

@app.get("/health")
def health_check():
    # Could check DB connection here
    return {"status": "ok", "service": "antigravity-backend"}

# We will include routers here later
# from .routers import items
# app.include_router(items.router)
