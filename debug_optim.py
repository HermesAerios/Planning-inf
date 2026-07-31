import os
import asyncio
import sys

# Load env manually
with open('.env') as f:
    for line in f:
        line = line.strip()
        if line and not line.startswith('#'):
            key, value = line.split('=', 1)
            os.environ[key] = value

os.environ.setdefault("DATABASE_URL", "sqlite:///./test_tours.db")
os.environ.setdefault("REDIS_URL", "redis://localhost:6379")

# Add path
sys.path.append(os.getcwd())

from backend.app.database import SessionLocal
from backend.app.models.patient import Patient
from backend.app.core.security_encryption import decrypt_value

async def main():
    db = SessionLocal()
    # Get last 15 patients
    patients = db.query(Patient).order_by(Patient.id.desc()).limit(15).all()
    print(f"Checking last {len(patients)} patients:")
    
    valid_count = 0
    test_patients = []
    
    for p in patients:
        try:
            name = decrypt_value(p.nom)
            first = decrypt_value(p.prenom) if p.prenom else ""
            addr = decrypt_value(p.adresse)
        except:
            name = "[Decryption Failed]"
            first = ""
            addr = ""
            
        has_coords = p.latitude is not None and p.longitude is not None
        print(f"ID {p.id}: {name} {first} | {addr} | Coords: {p.latitude}, {p.longitude} | Active: {p.is_active}")
        
        if name.startswith("Patient") and has_coords:
             test_patients.append(p)
             
    print(f"\nFound {len(test_patients)} 'Patient X' with coords.")
    
    if len(test_patients) > 0:
        print("Running optimization for these patients...")
        try:
            result = await optimisation_service.optimiser_tournees(
                patients=test_patients,
                nb_infirmiers=1,
                duree_max_min=120,
                start_time_str="07:30"
            )
            if result:
                 print(f"Result: {result['nb_infirmiers_utilises']} infirmiers, {len(result['routes'])} routes.")
            else:
                 print("Result is None")
        except Exception as e:
            print(f"Optimization Error: {e}")
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(main())
