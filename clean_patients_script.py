import asyncio
from sqlalchemy.orm import sessionmaker
from app.database import SessionLocal
from app.models.patient import Patient
from app.services.geocoding_service import geocoding_service

def clean_address(addr: str) -> str:
    # Basic replacements as requested
    replacements = {
        "Av. ": "Avenue ",
        "Chem. ": "Chemin ",
        "Rte ": "Route ",
        "Av ": "Avenue ",
        "Chem ": "Chemin ",
        "Rte. ": "Route "
    }
    for old, new in replacements.items():
        addr = addr.replace(old, new)
    return addr

async def main():
    db = SessionLocal()
    patients = db.query(Patient).all()
    
    updated_count = 0
    for p in patients:
        old_addr = p.adresse
        new_addr = clean_address(old_addr)
        
        needs_update = False
        
        if old_addr != new_addr:
            print(f"[{p.nom}] Replacing: '{old_addr}' -> '{new_addr}'")
            p.adresse = new_addr
            needs_update = True
            
        # Geocode the new address
        print(f"[{p.nom}] Geocoding: {p.adresse}")
        coords = await geocoding_service.geocode(p.adresse)
        if coords:
            lat, lon = coords
            print(f"[{p.nom}] Found coordinates: {lat}, {lon}")
            p.latitude = lat
            p.longitude = lon
            needs_update = True
        else:
            print(f"[{p.nom}] Geocoding failed.")
            
        if needs_update:
            updated_count += 1
            db.commit()

    db.close()
    print(f"Successfully processed and updated {updated_count} patients.")

if __name__ == "__main__":
    asyncio.run(main())
