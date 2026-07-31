from app.database import SessionLocal
from app.models.patient import Patient
from app.core.security_encryption import decrypt_value

def main():
    db = SessionLocal()
    # Query ALL patients (active and inactive) to fix potential accidental deletes
    patients = db.query(Patient).all()
    
    # Names to keep (exact format "Patient X")
    keep_names = [f"Patient {i}" for i in range(1, 8)]
    print(f"Target Keep List: {keep_names}")
    
    processed = 0
    deleted = 0
    restored = 0
    kept_active = 0
    
    for p in patients:
        try:
            # SQLAlchemy automatically decrypts via the TypeDecorator
            name = p.nom 
            
            if not name:
                 print(f"ID {p.id}: No name found. Ignoring.")
                 continue

            if name in keep_names:
                if not p.is_active:
                    print(f"Restoring: {name} (ID: {p.id})")
                    p.is_active = True
                    restored += 1
                else:
                    print(f"Keeping Active: {name} (ID: {p.id})")
                    kept_active += 1
            else:
                if p.is_active:
                    print(f"Soft Deleting: {name} (ID: {p.id})")
                    p.is_active = False
                    deleted += 1
                
            processed += 1
            
        except Exception as e:
            print(f"Error processing ID {p.id}: {e}")
            
    print(f"Committing changes... (Restored {restored}, Soft Deleted {deleted}, Kept/Verified {kept_active})")
    db.commit()

if __name__ == "__main__":
    main()
