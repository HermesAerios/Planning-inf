import asyncio
import os
import sys
import urllib.parse
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import logging

# Ensure environment is loaded since we run this as standalone script
with open('.env') as f:
    for line in f:
        line = line.strip()
        if line and not line.startswith('#'):
            key, value = line.split('=', 1)
            os.environ[key] = value

# Use SQLite for testing
os.environ.setdefault("DATABASE_URL", "sqlite:///./test_tours.db")
os.environ.setdefault("REDIS_URL", "redis://localhost:6379")
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./test_tours.db")

sys.path.append(os.getcwd())

from backend.app.database import Base
from backend.app.models.patient import Patient
from backend.app.services.geocoding_service import geocoding_service
# We also need the optimization service
from backend.app.services.optimisation_service import optimisation_service

engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

urls = [
    "https://www.google.com/maps/dir/Av.+de+la+Roseraie+72,+1205+Gen%C3%A8ve/Rte+de+la+Capite+175I,+1222+Collonge-Bellerive/Rte+de+Thonon+19,+1223+V%C3%A9senaz/Chem.+de+Planta+15,+1223+Cologny/Chem.+de+Grange-Canal+42,+1224+Ch%C3%AAne-Bougeries/Av.+de+l'Ermitage+1,+1224+Ch%C3%AAne-Bougeries/Chem.+Frank-Thomas+10,+1208+Gen%C3%A8ve/Rue+du+Nant+7,+1207+Gen%C3%A8ve/Rue+des+Savoises+10,+1205+Gen%C3%A8ve/@46.2046272,6.1339399,13z/data=!3m1!4b1!4m56!4m55!1m5!1m1!1s0x478c7ad1dc02a0ff:0xa5db62119de20c95!2m2!1d6.1491002!2d46.1910685!1m5!1m1!1s0x478c6f774edbf8d1:0xba18c19c6631598!2m2!1d6.2051472!2d46.2370504!1m5!1m1!1s0x478c6f7fc5790b97:0x3f6fd01c587f4698!2m2!1d6.1934244!2d46.2351096!1m5!1m1!1s0x478c655fe18854b5:0xc973620e115c66dd!2m2!1d6.1870131!2d46.2143855!1m5!1m1!1s0x478c6550cf360fad:0xa8cb2f2262637ad0!2m2!1d6.1795473!2d46.2037151!1m5!1m1!1s0x478c655458aab1e5:0x44b5671d8d6669e4!2m2!1d6.1806828!2d46.1980274!1m5!1m1!1s0x478c654ec29c67e3:0x2d4da959d2713fbc!2m2!1d6.170127!2d46.2026929!1m5!1m1!1s0x478c65368899f19f:0x4c23cbb41ea0410b!2m2!1d6.1599975!2d46.2021798!1m5!1m1!1s0x478c64d5bb2fb329:0x147eaf4b7186027d!2m2!1d6.1387009!2d46.2011023!3e0?entry=ttu&g_ep=EgoyMDI2MDIyNC4wIKXMDSoASAFQAw%3D%3D",
    "https://www.google.com/maps/dir/Av.+de+la+Roseraie+72,+1205+Gen%C3%A8ve/Av.+Adrien-Jeandin+36,+1226+Th%C3%B4nex/Av.+Adrien-Jeandin+3,+1226+Th%C3%B4nex/Chem.+Edouard-Olivet+13,+1226+Th%C3%B4nex/Chem.+du+Fief-de-Chapitre+3,+1213+Lancy/Chem.+du+Fief-de-Chapitre+8,+1213+Petit-Lancy/Chem.+de+la+Vend%C3%A9e+29,+1213+Petit-Lancy/Av.+des+Morgines+47,+1213+Petit-Lancy/@46.186732,6.1358886,14z/data=!3m1!4b1!4m50!4m49!1m5!1m1!1s0x478c7ad1dc02a0ff:0xa5db62119de20c95!2m2!1d6.1491002!2d46.1910685!1m5!1m1!1s0x478c701c026ae389:0x1435a0674c165836!2m2!1d6.1995356!2d46.1901885!1m5!1m1!1s0x478c701e54a0a37d:0xa68f51e738e0a947!2m2!1d6.202808!2d46.1923274!1m5!1m1!1s0x478c701f41979013:0xedbdd386f487e153!2m2!1d6.2041816!2d46.190645!1m5!1m1!1s0x478c7b32f68117bf:0xc91aaab89122b694!2m2!1d6.1264527!2d46.1963114!1m5!1m1!1s0x478c7b3391cbb4f9:0x31f0a2f14af26d41!2m2!1d6.1232268!2d46.1955634!1m5!1m1!1s0x478c7b3995d7411f:0xc5f992c6c00ac568!2m2!1d6.1195453!2d46.1878222!1m5!1m1!1s0x478c7b4eeded7bb5:0x25c694236d9f2990!2m2!1d6.1087534!2d46.1932664!3e0?entry=ttu&g_ep=EgoyMDI2MDIyNC4wIKXMDSoASAFQAw%3D%3D",
    "https://www.google.com/maps/dir/Av.+de+la+Roseraie+72,+1205+Gen%C3%A8ve/Chem.+Taverney,+1218+Le+Grand-Saconnex/Chem.+de+la+Fontaine+40,+1292+Pregny-Chamb%C3%A9sy/Av.+Choiseul+14,+1290+Versoix/Chem.+du+Bournoud+23,+1217+Meyrin/Av.+Fran%C3%A7ois-Besson+2,+1217+Meyrin/Av.+de+Vaudagne+88,+1217+Meyrin/@46.2311745,6.0568947,12z/data=!4m44!4m43!1m5!1m1!1s0x478c7ad1dc02a0ff:0xa5db62119de20c95!2m2!1d6.1491002!2d46.1910685!1m5!1m1!1s0x478c648dd51ad5ff:0xf8258a07c869ec35!2m2!1d6.1185682!2d46.2299031!1m5!1m1!1s0x478c64504fba044d:0xa8e626ac43ef8ee9!2m2!1d6.1407272!2d46.2440975!1m5!1m1!1s0x478c66613c2b862f:0xa62c8604db32670b!2m2!1d6.1638651!2d46.2893368!1m5!1m1!1s0x478c63100c0de7cb:0xd022ea6c2bf14ee5!2m2!1d6.0687102!2d46.2294899!1m5!1m1!1s0x478c630cb98908eb:0xf50bec42c94d5d16!2m2!1d6.0795086!2d46.2337558!1m5!1m1!1s0x478c6374c37dcc27:0x609f36ef6ecb51e2!2m2!1d6.0819075!2d46.236208!3e0?entry=ttu&g_ep=EgoyMDI2MDIyNC4wIKXMDSoASAFQAw%3D%3D",
    "https://www.google.com/maps/dir/Av.+de+la+Roseraie+72,+1205+Gen%C3%A8ve/Rue+de+B%C3%A2le+16,+1201+Gen%C3%A8ve/Rue+Baudit+1,+1201+Gen%C3%A8ve/Rue+Liotard+77,+1203+Gen%C3%A8ve/Rue+Liotard+83,+1203+Gen%C3%A8ve/Av.+Ernest-Pictet+32,+1203+Gen%C3%A8ve/Rte+des+Franchises+26,+1203+Gen%C3%A8ve/Rue+Camille-Martin+7,+1203+Gen%C3%A8ve/Av.+des+Tilleuls+34,+1203+Gen%C3%A8ve/Rue+Lamartine+3B,+1203+Gen%C3%A8ve/@46.203558,6.1123701,14z/data=!4m62!4m61!1m5!1m1!1s0x478c7ad1dc02a0ff:0xa5db62119de20c95!2m2!1d6.1491002!2d46.1910685!1m5!1m1!1s0x478c6523dd55fed7:0x9b5fef0bad5251c2!2m2!1d6.1492503!2d46.2129269!1m5!1m1!1s0x478c64d90a16da2f:0xd5de8a9884846bc2!2m2!1d6.1382896!2d46.2100272!1m5!1m1!1s0x478c64c115705e9f:0x534bd7bb03ac516!2m2!1d6.1249435!2d46.2142759!1m5!1m1!1s0x478c64c11be8448f:0xdd31dd21897189ff!2m2!1d6.1236759!2d46.2143282!1m5!1m1!1s0x478c64c132aa6713:0xab6a5c7db0b0e905!2m2!1d6.1241518!2d46.2130824!1m5!1m1!1s0x478c64b8b3aafe6f:0x7480d749b495298f!2m2!1d6.119781!2d46.2131615!1m5!1m1!1s0x478c64b7ac83c3fd:0x5077c2d575a7b1ca!2m2!1d6.1167693!2d46.206396!1m5!1m1!1s0x478c64cf3a5d8755:0x5cfb5599dd7d01e1!2m2!1d6.1255095!2d46.2066613!1m5!1m1!1s0x478c64c59e2f6f63:0x3f158c108ad31619!2m2!1d6.1281329!2d46.2090736!3e0?entry=ttu&g_ep=EgoyMDI2MDIyNC4wIKXMDSoASAFQAw%3D%3D"
]

def parse_urls():
    tours = []
    for i, url in enumerate(urls):
        try:
            path = urllib.parse.urlparse(url).path
            parts = path.split("/")[3:] # Skip /maps/dir/
            tour_addrs = []
            for part in parts:
                if "@" in part: break
                addr = urllib.parse.unquote_plus(part)
                # Skip the lab/starting address for patient lists (assuming Roseraie)
                if addr and "Roseraie" not in addr:
                    tour_addrs.append(addr)
            if tour_addrs:
                tours.append({
                    "id": f"Tour_{i+1}_Manual",
                    "addresses": tour_addrs
                })
        except Exception as e:
            print(f"Error parsing URL {i}: {e}")
    return tours

async def main():
    db = SessionLocal()
    
    # 1. Parse manual tours
    manual_tours = parse_urls()
    print("--- User's Manual Tours ---")
    for mt in manual_tours:
        print(f"{mt['id']}: {len(mt['addresses'])} stops")
        for addr in mt['addresses']:
            print(f"  - {addr}")
            
    # 2. Collect all unique addresses & geocode them to form our set of patients
    all_patients = []
    patient_id_counter = 1
    
    print("\n--- Geocoding all unique patients ---")
    address_to_patient = {}
    
    for mt in manual_tours:
        for addr in mt['addresses']:
            if addr not in address_to_patient:
                print(f"Geocoding: {addr}")
                coords = await geocoding_service.geocode(addr)
                if not coords:
                    print(f"Failed geocoding for {addr}")
                    continue
                # Create a fake Patient model for the optimizer
                p = Patient(
                    id=patient_id_counter,
                    nom=f"Patient {patient_id_counter}",
                    prenom=addr.split(',')[0], # use first part of address as prenom for identification
                    adresse=addr,
                    latitude=coords[0],
                    longitude=coords[1],
                    test_a_jeun=False,
                    retour_rapide_labo=False,
                    is_active=True
                )
                address_to_patient[addr] = p
                all_patients.append(p)
                patient_id_counter += 1

    print(f"\nCreated {len(all_patients)} total patients for optimization.")

    if len(all_patients) == 0:
        print("No patients found! Exiting.")
        return

    # 3. Run Optimization Logic
    print(f"\n--- Running Antigravity Optimization Engine ---")
    print(f"Asking to form tours from {len(all_patients)} patients, with 4 nurses available.")
    try:
        result = await optimisation_service.optimiser_tournees(
            patients=all_patients,
            nb_infirmiers=4,  # Assuming 4 since there are 4 URLs
            duree_max_min=240, # Some generous time
            start_time_str="07:30"
        )
        if result:
            print("\nRESULTATS OPTIMISATION:")
            print(f"Nombre d'infirmiers utilises: {result.get('nb_infirmiers_utilises')}")
            total_time = result.get('duree_totale_min', 0)
            print(f"Temps total pour tous les vehicules: {total_time:.2f} min")
            
            for r in result.get('routes', []):
                print(f"\nRoute ID: {r.get('vehicle_id')}")
                distance = r.get('total_distance', 0) / 1000 # Assuming meters, convert to km
                duration = r.get('total_duration', 0)
                print(f"Vehicule specs: {distance:.2f} km, {duration:.2f} min")
                for s in r.get('steps', []):
                    ptId = s.get('patient_id')
                    nom = s.get('nom')
                    ville = s.get('adresse', '')
                    t_type = s.get('type')
                    if t_type == 'patient':
                        print(f"  - Patient ID {ptId}: {ville} (Arrivee: {s.get('arrivee')}, Depart: {s.get('depart')})")
                    else:
                        print(f"  * {t_type.capitalize()} (Arrivee: {s.get('arrivee')})")
                        
            unassigned = result.get('unassigned', [])
            if unassigned:
                print(f"\nPatients non assignes ({len(unassigned)}):")
                for u in unassigned:
                    print(f"  - {u.get('nom')}: {u.get('reason')}")
        else:
            print("Result is None")
    except Exception as e:
        print(f"Optimization Error: {e}")
        import traceback
        traceback.print_exc()
    
    db.close()

if __name__ == "__main__":
    asyncio.run(main())
