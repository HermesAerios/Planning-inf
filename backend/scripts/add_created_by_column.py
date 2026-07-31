from sqlalchemy import text
from app.database import engine

def migrate():
    with engine.connect() as conn:
        try:
            conn.execute(text("ALTER TABLE tournees ADD COLUMN created_by_id INTEGER REFERENCES users(id);"))
            conn.commit()
            print("Migration successful: Added created_by_id column.")
        except Exception as e:
            print(f"Migration failed (maybe column exists?): {e}")

if __name__ == "__main__":
    migrate()
