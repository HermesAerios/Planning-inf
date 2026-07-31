import json
import os
import sys

# Add root to sys path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'backend')))

from app.services.optimisation_service import optimisation_service
from app.models.patient import Patient

# To simulate, we need a list of mock patients with coordinates
def run_simulation(human_tours_file):
    with open(human_tours_file, 'r') as f:
        tours = json.load(f)
        
    print(f"Loaded {len(tours)} human tours.")
    
    # Analyze Human Tours
    all_patients = []
    total_human_distance = 0
    patient_id_counter = 1
    
    import haversine as hs
    
    for tour_id, tour in enumerate(tours):
        if len(tour) < 2: continue
        
        tour_dist = 0
        for i in range(len(tour)):
            lat, lon = tour[i]
            # Create mock Patient object
            p = Patient(
                id=patient_id_counter,
                latitude=lat,
                longitude=lon,
                heure_preferee=None,
                test_a_jeun=False
            )
            all_patients.append(p)
            patient_id_counter += 1
            
            if i > 0:
                prev_lat, prev_lon = tour[i-1]
                # Haversine distance in meters
                tour_dist += hs.haversine((prev_lat, prev_lon), (lat, lon))
                
        total_human_distance += tour_dist
        print(f"Human Tour {tour_id+1}: {len(tour)-1} patients, Dist: {tour_dist:.2f} km")

    print(f"\nTotal Human Distance (Haversine approx): {total_human_distance:.2f} km")
    
    print("\n--- Running AI Algorithm ---")
    
    nb_infirmiers = len([t for t in tours if len(t) > 1])
    duree_max_min = 480 # 8 hours
    
    # MOCK the matrix_service to strictly use Haversine and avoid 403 blocks
    from app.services.matrix_service import matrix_service
    async def mock_matrix(*args, **kwargs):
        return matrix_service.get_haversine_matrix(args[0])
    matrix_service.get_matrix_async = mock_matrix
    
    # MOCK the route_service similarly if used
    from app.services.route_service import route_service
    async def mock_route_async(start, end):
        dist = hs.haversine((start[1], start[0]), (end[1], end[0])) * 1000
        dur = (dist / 1000) / 40 * 3600 # 40km/h
        return {"distance_m": dist, "duration_s": dur, "geometry": "mock"}
    route_service.get_route_async = mock_route_async
    
    async def mock_get_route(coords):
        return {"distance_m": 1000, "duration_s": 60, "geometry": "mock"}
    route_service.get_route = mock_get_route
    
    try:
        import asyncio
        loop = asyncio.get_event_loop()
        
        result = loop.run_until_complete(optimisation_service.optimiser_tournees(all_patients, nb_infirmiers, duree_max_min))
        
        # result is a dict with details including 'routes'
        routes = result.get('routes', [])
        print(f"Algorithm Output: {len(routes)} routes generated")
        
        alg_total_dist = 0
        for r in routes:
            print(f"AI Tour {r['vehicle_id']}: {len(r['steps'])-2} patients, Score: {r['total_distance']/1000:.2f} km")
            alg_total_dist += (r['total_distance'] / 1000)
            
        print(f"\nTotal AI Distance: {alg_total_dist:.2f} km")
        print(f"Difference: {total_human_distance - alg_total_dist:.2f} km")
        
    except Exception as e:
        print(f"Simulation Error: {e}")
        import traceback
        traceback.print_exc()
        
if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: py test_sim.py <coords.json>")
        sys.exit(1)
    run_simulation(sys.argv[1])
