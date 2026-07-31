import os
import sys

# Try to use python-dotenv
try:
    from dotenv import load_dotenv
    load_dotenv()
    print("Loaded .env with dotenv")
except ImportError:
    print("dotenv not found, loading manually")
    with open('.env') as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#'):
                try:
                    key, value = line.split('=', 1)
                    os.environ[key] = value
                except ValueError:
                    pass

# Env vars fallback/defaults for script execution
os.environ.setdefault("DATABASE_URL", "sqlite:///./test_tours.db")
os.environ.setdefault("REDIS_URL", "redis://localhost:6379")
# Ensure we have the key from .env if it wasn't set by above (if .env was empty/missing?)
# We trust the loader above.

sys.path.append(os.getcwd())

from backend.app.database import SessionLocal
from backend.app.models.patient import Patient
from backend.app.core.security_encryption import decrypt_value

def main():
    db = SessionLocal()
    patients = db.query(Patient).filter(Patient.is_active == True).all()
    
    keep_names = [f"Patient {i}" for i in range(1, 8)]
    print(f"Target Keep List: {keep_names}")
    
    processed = 0
    deleted = 0
    kept = 0
    
    for p in patients:
        try:
            name = decrypt_value(p.nom)
            if not name or name == "<Encrypted>":
                print(f"Warning: Could not decrypt ID {p.id}. Soft deleting to be safe.")
                p.is_active = False
                deleted += 1
                processed += 1
                continue
                
            # Logic: Keep if in list
            if name in keep_names:
                print(f"Keeping: {name} (ID: {p.id})")
                kept += 1
            else:
                print(f"Soft Deleting: {name} (ID: {p.id})")
                p.is_active = False
                deleted += 1
                
            processed += 1
            
        except Exception as e:
            print(f"Error processing ID {p.id}: {e}")
            
    if deleted > 0:
        print(f"Committing changes... (Deleted {deleted}, Kept {kept})")
        db.commit()
    else:
        print("No changes needed.")

if __name__ == "__main__":
    main()
