import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '..', '.env'))

# Ensure celery uses the correct config
os.environ.setdefault("USE_CELERY", "True")

from app.core.celery_app import celery_app

# Import all tasks so celery can discover them
import app.tasks.optimisation_tasks

if __name__ == "__main__":
    celery_app.start()
