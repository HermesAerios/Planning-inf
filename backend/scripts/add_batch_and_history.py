from sqlalchemy import text
from app.database import engine

def migrate():
    with engine.connect() as conn:
        try:
            # 1. Add batch_id to tournees
            print("Adding batch_id to tournees...")
            try:
                conn.execute(text("ALTER TABLE tournees ADD COLUMN batch_id VARCHAR(50);"))
                print("batch_id added.")
            except Exception as e:
                print(f"batch_id might exist: {e}")

            # 2. Create tournee_history table
            print("Creating tournee_history table...")
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
            print("tournee_history table created.")
            
            conn.commit()
            print("Migration successful.")
        except Exception as e:
            print(f"Migration failed: {e}")

if __name__ == "__main__":
    migrate()
