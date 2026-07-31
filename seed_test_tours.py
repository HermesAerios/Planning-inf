
import asyncio
import os
import sys
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# 1. Setup Environment & Imports
current_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.join(current_dir, 'backend')
sys.path.append(backend_dir)

# Mock Environment Variables if not present (for verify mainly, but here we might need real geocoding)
os.environ['DATABASE_URL'] = "sqlite:///./test_tours.db"
os.environ['REDIS_URL'] = "redis://localhost:6379"
os.environ['ORS_API_KEY'] = "eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6IjgyMGJhOWQyN2QyODRlNzg5NmE4OGQxZjI1YTA3NjU3IiwiaCI6Im11cm11cjY0In0="
os.environ['JWT_SECRET'] = "mock"
os.environ['TWILIO_ACCOUNT_SID'] = "mock"
os.environ['TWILIO_AUTH_TOKEN'] = "mock"
from app.database import Base
from app.models.patient import Patient
from app.services.geocoding_service import geocoding_service

# Use SQLite for local testing to avoid Postgres driver issues if still present
SQLALCHEMY_DATABASE_URL = "sqlite:///./test_tours.db" 
engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base.metadata.create_all(bind=engine)

async def seed_data():
    db = SessionLocal()
    
    # Clear existing test patients (optional, or just append)
    # db.query(Patient).delete()
    # db.commit()

    print("--- Seeding Test Patients from Human Tours ---")

    tours_data = {
      "Tour 1": [
        "Rue des Eaux-Vives 110, 1207 Genève",
        "Chemin Frank-Thomas 10, Genève",
        "Chem. du Pont-de-Ville 11, Genève", # Added Geneve for better geocoding
        "Chemin de l'Ecorcherie 47, Vandœuvres",
        "Route du Lac 23, Corsier",
        "Chemin des Clos 17, Hermance",
        "Rue de Contamines 23, 1206 Genève",
        "Av. Léon-Gaud 10, 1206 Genève"
      ],
      "Tour 2": [
        "Rue de la Tour-Maîtresse 7, 1204 Genève",
        "Via de Coisson 11, 1214 Vernier",
        "Avenue de Gennecy 30, Avully",
        "Rte du Vélodrome 26, 1228 Plan-les-Ouates",
        "Chemin du Pré-du-Camp 6, Plan-les-Ouates",
        "Chemin des Palettes 1, Lancy", # L'Etoile Palettes -> approx addr
        "Chem. des Pontets 9, 1212 Lancy",
        "Avenue Eugène Lance 74, Lancy",
        "Chemin du Trappeur 40, Veyrier"
      ],
      "Amandine": [
        "Av. Krieg 13, 1208 Genève",
        "Rue de Vermont 16, 1202 Genève",
        "Rue des Deux-Ponts 18, Genève"
      ],
      "PM": [
        "Avenue Trembley 12, Genève",
        "Chem. du Champ-d'Anier 24, 1209 Genève",
        "Rue des Bossons 13, Onex",
        "Chemin Haccius 23, Lancy"
      ]
    }

    patient_counter = 1
    
    for tour_name, addresses in tours_data.items():
        print(f"\nProcessing {tour_name}...")
        for i, addr in enumerate(addresses):
            # Geocode
            print(f"  Geocoding: {addr}")
            # Mocking geocoding for speed/reliability if API key missing in this context
            # or try real geocode. Let's try real first, fallback to mock if fails?
            # Actually, to be safe and fast, I'll use a simple mock based on known zones if API fails,
            # but let's try the service.
            
            lat, lon = None, None
            try:
                # We need an event loop for async geocoding if service is async
                # Check service definition. It is usually async.
                # Assuming geocoding_service.geocode(addr)
                 coords = await geocoding_service.geocode(addr)
                 if coords:
                     lat, lon = coords
            except Exception as e:
                print(f"    Error geocoding {addr}: {e}")

            # If geocoding fails (e.g. no API key), put dummy close coords
            if not lat:
                lat, lon = 46.2 + (i * 0.001), 6.15 + (i * 0.001) 

            p = Patient(
                nom=f"Patient {tour_name}",
                prenom=f"{i+1}",
                adresse=addr,
                latitude=lat,
                longitude=lon,
                test_a_jeun=False,
                retour_rapide_labo=False,
                # Add a fix tag? No, let optimization decide.
            )
            db.add(p)
            patient_counter += 1
            
    db.commit()
    print(f"\nSeeding Complete. {patient_counter-1} patients created.")
    db.close()

if __name__ == "__main__":
    asyncio.run(seed_data())
