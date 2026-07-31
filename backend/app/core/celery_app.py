import os
from celery import Celery

redis_url = os.environ.get("REDIS_URL", "redis://localhost:6379/0")
use_celery_str = os.environ.get("USE_CELERY", "False")
USE_CELERY = use_celery_str.lower() in ("true", "1", "yes")

celery_app = Celery(
    "worker",
    broker=redis_url,
    backend=redis_url
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="Europe/Paris",
    enable_utc=True,
    task_track_started=True,
)
