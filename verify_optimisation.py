import sys
import os
import asyncio
import json

# Add backend directory to sys.path
current_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.join(current_dir, 'backend')
sys.path.append(backend_dir)

# Mock Environment Variables for Config
os.environ['DATABASE_URL'] = "sqlite:///./test.db"
os.environ['REDIS_URL'] = "redis://localhost:6379"
os.environ['JWT_SECRET'] = "mock_secret"
os.environ['ORS_API_KEY'] = "mock_key"
os.environ['TWILIO_ACCOUNT_SID'] = "mock_sid"
os.environ['TWILIO_AUTH_TOKEN'] = "mock_token"

from app.services.optimisation_service import optimisation_service
from app.services.matrix_service import matrix_service
from app.models.patient import Patient

# Mock Patient Data
def create_mock_patients(n=5):
    patients = []
    base_lat = 46.2
    base_lon = 6.15
    for i in range(n):
        p = Patient(
            id=i+1,
            nom=f"Patient {i+1}",
            prenom="Test",
            adresse=f"Adresse {i+1}",
            latitude=base_lat + (0.005 * i),
            longitude=base_lon + (0.005 * i),
            test_a_jeun=(i % 2 == 0)
        )
        patients.append(p)
    return patients

# Mock Matrix Service to avoid API calls
class MockMatrixService:
    async def get_matrix(self, locations):
        n = len(locations)
        # 10 min duration, 2km distance between all points for simplicity
        durations = [[600 for _ in range(n)] for _ in range(n)]
        distances = [[2000 for _ in range(n)] for _ in range(n)]
        for i in range(n):
            durations[i][i] = 0
            distances[i][i] = 0
        return {"distances": distances, "durations": durations}

# Monkey patch
matrix_service.get_matrix = MockMatrixService().get_matrix

async def main():
    print("--- Starting Optimization Verification ---")
    
    # Create validation patients
    # 1. Fasting (Should be first)
    # 2. Normal (Middle)
    # 3. Quick Return (Should be last)
    # 4. Fasting + Quick Return (Should be last - Quick Return priority)
    
    mock_patients = [
        # Normal
        Patient(id=1, nom="Normal", prenom="Paul", adresse="1 Rue de Cornavin, Genève", 
                latitude=46.2100, longitude=6.1400, test_a_jeun=False, retour_rapide_labo=False),
        # Fasting
        Patient(id=2, nom="Fasting", prenom="Jean", adresse="10 Rue de Lausanne, Genève",
                latitude=46.2150, longitude=6.1450, test_a_jeun=True, retour_rapide_labo=False),
        # Quick Return
        Patient(id=3, nom="Quick", prenom="Marie", adresse="5 Route de Meyrin, Genève",
                latitude=46.2200, longitude=6.1300, test_a_jeun=False, retour_rapide_labo=True),
         # Fasting + Quick
        Patient(id=4, nom="FastQuick", prenom="Luc", adresse="20 Avenue Louis-Casaï, Genève",
                latitude=46.2250, longitude=6.1200, test_a_jeun=True, retour_rapide_labo=True),
        # Normal 2
        Patient(id=5, nom="Normal2", prenom="Sophie", adresse="Quai du Mont-Blanc, Genève",
                latitude=46.2080, longitude=6.1500, test_a_jeun=False, retour_rapide_labo=False),
    ]
    
    print(f"Created {len(mock_patients)} mock patients.")
    
    print("Running optimization...")
    try:
        # 1 vehicle to force sequence check on single route
        result = await optimisation_service.optimiser_tournees(
            patients=mock_patients,
            nb_infirmiers=1, # 1 Nurse
            duree_max_min=480
        )
        
        if result:
            print(f"\n[OK] Optimization Successful!")
            print(f"Infirmiers used: {result['nb_infirmiers_utilises']}")
            print(f"Total Duration: {result['duree_totale_min']} min")
            print(f"Total Distance: {result['distance_totale_m']} m")
            
            for route in result['routes']:
                print(f"\nRoute for Vehicle {route['vehicle_id']} ({route['total_duration']} min):")
                # Print Google Maps Link to verify depot
                print(f"Maps Link: {route.get('gmaps_link', 'N/A')}")
                for step in route['steps']:
                    flags = []
                    if step.get('a_jeun'): flags.append("FASTING")
                    if step.get('retour_rapide_labo'): flags.append("QUICK_RET")
                    
                    flag_str = f"[{', '.join(flags)}]" if flags else ""
                    if step['type'] == 'patient':
                        print(f" - {step['nom']} {flag_str} (@ {step['arrivee']})")
                    else:
                        print(f" - {step['type']} (@ {step['arrivee']})")
        else:
            print("\n[FAIL] Optimization Failed: No solution found.")
            
    except Exception as e:
        print(f"\n[ERROR] Error during optimization: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(main())
