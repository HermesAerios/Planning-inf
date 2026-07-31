import sys
import os
import asyncio
import json

# Add backend directory to sys.path
current_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.join(current_dir, 'backend')
sys.path.append(backend_dir)

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

# Mock Matrix Service
class MockMatrixService:
    async def get_matrix(self, locations):
        n = len(locations)
        durations = [[600 for _ in range(n)] for _ in range(n)]
        distances = [[2000 for _ in range(n)] for _ in range(n)]
        for i in range(n):
            durations[i][i] = 0
            distances[i][i] = 0
        return {"distances": distances, "durations": durations}

# Monkey patch
matrix_service.get_matrix = MockMatrixService().get_matrix

async def main():
    print("--- Starting Simulation ---")
    
    mock_patients = []
    for i in range(8):
         mock_patients.append(Patient(
             id=i+1, 
             nom=f"Patient {i+1}", 
             prenom="Test", 
             adresse=f"Adresse {i+1}", 
             latitude=46.2000 + (0.001*i), 
             longitude=6.1500 + (0.001*i), 
             test_a_jeun=(i==0),
             retour_rapide_labo=(i==7),
             heure_preferee="09:00" if i==4 else None
         ))
    
    print(f"Created {len(mock_patients)} mock patients.")
    
    print("Running optimization...")
    try:
        result = await optimisation_service.optimiser_tournees(
            patients=mock_patients,
            nb_infirmiers=2, 
            duree_max_min=360 
        )
        
        if result:
            print(f"\n[OK] Simulation Results:")
            print(f"Infirmiers used: {result['nb_infirmiers_utilises']}")
            print(f"Total Duration: {result['duree_totale_min']:.2f} min (incl. travel + service)")
            print(f"Total Distance: {result['distance_totale_m']} m")
            
            for route in result['routes']:
                print(f"\n-- Tournee Infirmier {route['vehicle_id']} ({route['total_duration']:.2f} min):")
                steps = route['steps']
                # Start
                print(f"   START Depot: {steps[0]['arrivee']}")
                
                for step in steps:
                    if step['type'] == 'patient':
                        flags = []
                        if step.get('a_jeun'): flags.append("A JEUN (Matin)")
                        if step.get('retour_rapide_labo'): flags.append("RETOUR RAPIDE (Fin)")
                        
                        flag_str = f" - {', '.join(flags)}" if flags else ""
                        print(f"   * {step['nom']} (@ {step['arrivee']} -> {step['depart']}) {flag_str}")
                
                # End
                depot_end = [s for s in steps if s['type'] == 'depot_end'][0]
                print(f"   END Retour Depot: {depot_end['arrivee']}")
                
        else:
            print("\n[FAIL] Optimization Failed: No solution found.")
            if result and result.get('unassigned'):
                 print(f"Unassigned: {len(result['unassigned'])}")
            
    except Exception as e:
        print(f"\n[ERR] Error during optimization: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(main())
