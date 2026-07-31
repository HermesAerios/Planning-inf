from ortools.constraint_solver import routing_enums_pb2
from ortools.constraint_solver import pywrapcp
from typing import List, Dict, Any
from .matrix_service import matrix_service
from .route_service import route_service
from ..models.patient import Patient
from urllib.parse import quote_plus

class OptimisationService:
    def _kmeans_cluster(self, patients_list: List[Patient], k: int, iters: int = 50, humanity_balance: bool = True):
        import math
        import random
        from collections import defaultdict
        
        # If humanity balance is off, or k is invalid, fallback.
        if k <= 1 or len(patients_list) <= k:
            return {0: patients_list}
            
        random.seed(42)  # For deterministic behavior
        centroids = random.sample([[float(p.latitude), float(p.longitude)] for p in patients_list], k)
        clusters = defaultdict(list)
        
        # Determine maximum capacity per cluster to enforce load balancing
        max_capacity = math.ceil(len(patients_list) / k) if humanity_balance else len(patients_list)
        
        for _ in range(iters):
            new_clusters = defaultdict(list)
            cluster_sizes = defaultdict(int)
            
            # Calculate distances from all patients to all centroids
            all_distances = []
            for p in patients_list:
                lat, lon = float(p.latitude), float(p.longitude)
                for i in range(k):
                    d = (centroids[i][0]-lat)**2 + (centroids[i][1]-lon)**2
                    all_distances.append((d, i, p))
            
            # Sort all patient-centroid pairs by distance (closest first)
            all_distances.sort(key=lambda x: x[0])
            
            assigned_patients = set()
            
            # Priority assignment: closest patients get assigned to their closest centroid,
            # unless the centroid is already full, in which case they wait for their next closest alternative.
            for dist, centroid_idx, p in all_distances:
                if p.id in assigned_patients:
                    continue
                # If there's room in the cluster, or if we have no choice (shouldn't happen with ceil)
                if cluster_sizes[centroid_idx] < max_capacity:
                    new_clusters[centroid_idx].append(p)
                    cluster_sizes[centroid_idx] += 1
                    assigned_patients.add(p.id)
            
            new_centroids = []
            for i in range(k):
                if not new_clusters[i]:
                    new_centroids.append(centroids[i])
                else:
                    avg_lat = sum(float(p.latitude) for p in new_clusters[i]) / len(new_clusters[i])
                    avg_lon = sum(float(p.longitude) for p in new_clusters[i]) / len(new_clusters[i])
                    new_centroids.append([avg_lat, avg_lon])
            
            if new_centroids == centroids:
                clusters = new_clusters
                break
            centroids = new_centroids
            clusters = new_clusters
            
        return clusters

    async def optimiser_tournees(
        self,
        patients: List[Patient],
        nb_infirmiers: int,
        infirmiers: List[Any] = None,
        duree_max_min: int = 80,
        start_time_str: str = "07:30",
        depot_coords: list[float] = [6.1491002, 46.1910685], # [lon, lat] defaults to Geneva
        depot_name: str = "Cabinet Principal",
        humanity_balance: bool = True,
        default_intervention_duration: int = 15
    ):
        import math
        valid_patients = [p for p in patients if p.latitude and p.longitude]
        
        if not valid_patients and patients:
            # All selected patients lack coordinates
            return {
                "error": "Les patients sélectionnés n'ont pas de coordonnées GPS valides (Latitude/Longitude).",
                "nb_infirmiers_utilises": 0,
                "duree_totale_min": 0,
                "distance_totale_m": 0,
                "routes": [],
                "unassigned": [{"id": p.id, "nom": f"{p.nom} {p.prenom}", "reason": "Coordonnées GPS manquantes"} for p in patients]
            }
            
        if not valid_patients:
            return None
            
        # Optimize global without K-Means to let OR-Tools balance load perfectly
        max_needed = math.ceil(len(valid_patients) / 10)
        n_vehicles = nb_infirmiers if humanity_balance else min(nb_infirmiers, max_needed)
        n_vehicles = max(1, n_vehicles)
            
        locations = [[depot_coords[0], depot_coords[1]]]
        for p in valid_patients:
            locations.append([float(p.longitude), float(p.latitude)])
            
        matrix_res = await matrix_service.get_matrix(locations)
        distances = matrix_res["distances"]
        durations = matrix_res["durations"]
        
        global_result = None
        for attempt in [0, 1]:
            res = await self._run_solver_pass(
                attempt_level=attempt,
                patients=valid_patients,
                locations=locations,
                distances=distances,
                durations=durations,
                n_vehicles=n_vehicles,
                infirmiers=infirmiers,
                duree_max_min=duree_max_min,
                start_time_str=start_time_str,
                depot_coords=depot_coords,
                depot_name=depot_name,
                humanity_balance=humanity_balance,
                default_intervention_duration=default_intervention_duration
            )
            
            if res:
                global_result = res
                break
                
        if global_result:
            return global_result
        else:
            return {
                "error": "Impossible de générer des tournées respectant toutes les contraintes de temps ou de capacité.",
                "nb_infirmiers_utilises": 0,
                "duree_totale_min": 0,
                "distance_totale_m": 0,
                "routes": [],
                "unassigned": [{"id": p.id, "nom": f"{p.nom} {p.prenom}", "reason": "Échec de l'optimisation globale"} for p in valid_patients]
            }

    async def _run_solver_pass(self, attempt_level, patients, locations, distances, durations, n_vehicles, infirmiers, duree_max_min, start_time_str, depot_coords, depot_name, humanity_balance=True, default_intervention_duration=15):
        n_locations = len(locations)
        manager = pywrapcp.RoutingIndexManager(n_locations, n_vehicles, 0)
        routing = pywrapcp.RoutingModel(manager)

        def distance_callback(from_index, to_index):
            from_node = manager.IndexToNode(from_index)
            to_node = manager.IndexToNode(to_index)
            return int(distances[from_node][to_node])

        transit_callback_index = routing.RegisterTransitCallback(distance_callback)
        routing.SetArcCostEvaluatorOfAllVehicles(transit_callback_index)
        
        def time_callback(from_index, to_index):
            from_node = manager.IndexToNode(from_index)
            to_node = manager.IndexToNode(to_index)
            service_time = 0
            if from_node != 0:
                service_time = default_intervention_duration * 60 
            return int(durations[from_node][to_node] + service_time)

        time_callback_index = routing.RegisterTransitCallback(time_callback)
        
        # Slack: 30m (Level 0) or 60m (Level 1)
        slack = 30 * 60 if attempt_level == 0 else 60 * 60
        routing.AddDimension(
            time_callback_index,
            slack,
            24 * 3600,
            False,
            "Time"
        )
        time_dimension = routing.GetDimensionOrDie("Time")
        
        # ActiveTime dimension (pure work time without waiting periods)
        def active_time_callback(from_index, to_index):
            from_node = manager.IndexToNode(from_index)
            to_node = manager.IndexToNode(to_index)
            service_time = 0
            if from_node != 0:
                service_time = default_intervention_duration * 60 
            return int(durations[from_node][to_node] + service_time)

        active_time_callback_index = routing.RegisterTransitCallback(active_time_callback)
        routing.AddDimension(
            active_time_callback_index,
            0, # NO SLACK => pure working time
            24 * 3600,
            True, # Start to zero
            "ActiveTime"
        )
        active_time_dimension = routing.GetDimensionOrDie("ActiveTime")

        # Balance load (Time domain)
        if humanity_balance:
            time_dimension.SetGlobalSpanCostCoefficient(10) # Small makespan compression
            active_time_dimension.SetGlobalSpanCostCoefficient(100) # 1 sec diff = 100 meters, 1 min = 6000 meters
        
        # Capacity Dimension
        def demand_callback(from_index):
            from_node = manager.IndexToNode(from_index)
            if from_node == 0:
                return 0
            return 1
            
        demand_callback_index = routing.RegisterUnaryTransitCallback(demand_callback)
        routing.AddDimensionWithVehicleCapacity(
            demand_callback_index,
            0,  # null capacity slack
            [50] * n_vehicles, # High ceiling so balance is what restricts it
            True,  # start cumul to zero
            'Capacity'
        )
        capacity_dimension = routing.GetDimensionOrDie('Capacity')
        if humanity_balance:
            capacity_dimension.SetGlobalSpanCostCoefficient(15000) # 1 patient diff = 15000 meters
        
        h_start, m_start = map(int, start_time_str.split(':'))
        start_seconds = h_start * 3600 + m_start * 60
        
        # Working hours 07:00 - 22:00 (extended in Level 1)
        max_end = 22 * 3600 if attempt_level == 0 else 23 * 3600 + 1800
        
        for vehicle_id in range(n_vehicles):
            index = routing.Start(vehicle_id)
            time_dimension.CumulVar(index).SetRange(start_seconds, start_seconds + 3600) 
            end_index = routing.End(vehicle_id)
            time_dimension.CumulVar(end_index).SetMax(max_end)

        # Constraints
        limit_jeun_end = start_seconds + (2 * 3600 + 30 * 60)
        target_late_start = start_seconds + (3 * 3600 + 30 * 60)

        for i, p in enumerate(patients):
            node_index = manager.NodeToIndex(i + 1)
            
            # Skill Matching Constraints
            p_skills = set(s.id for s in getattr(p, 'skills_required', []))
            if p_skills and infirmiers:
                for v_idx in range(n_vehicles):
                    nurse_skills = set()
                    if v_idx < len(infirmiers):
                        nurse_skills = set(s.id for s in getattr(infirmiers[v_idx], 'skills', []))
                    
                    if not p_skills.issubset(nurse_skills):
                        routing.VehicleVar(node_index).RemoveValue(v_idx)
            
            if p.test_a_jeun:
                if attempt_level == 0:
                    time_dimension.CumulVar(node_index).SetRange(start_seconds, limit_jeun_end)
                else:
                    time_dimension.SetCumulVarSoftUpperBound(node_index, limit_jeun_end, 1000)
            
            if p.retour_rapide_labo:
                time_dimension.SetCumulVarSoftLowerBound(node_index, target_late_start, 100)

            if p.heure_preferee and len(p.heure_preferee) == 5:
                try:
                    hp_h, hp_m = map(int, p.heure_preferee.split(':'))
                    pref_seconds = hp_h * 3600 + hp_m * 60
                    win_start = max(pref_seconds - (30 * 60), start_seconds)
                    win_end = pref_seconds + (30 * 60)
                    time_dimension.SetCumulVarSoftLowerBound(node_index, win_start, 50) 
                    time_dimension.SetCumulVarSoftUpperBound(node_index, win_end, 50)
                except:
                    pass

        # Disjunctions (Dropping penalty)
        penalty = 1000000 if attempt_level == 0 else 10000000
        for i in range(len(patients)):
            node_index = manager.NodeToIndex(i + 1)
            routing.AddDisjunction([node_index], penalty)

        search_parameters = pywrapcp.DefaultRoutingSearchParameters()
        search_parameters.first_solution_strategy = (
            routing_enums_pb2.FirstSolutionStrategy.PATH_CHEAPEST_ARC
        )
        search_parameters.local_search_metaheuristic = (
            routing_enums_pb2.LocalSearchMetaheuristic.GUIDED_LOCAL_SEARCH
        )
        search_parameters.time_limit.seconds = 5 if attempt_level == 0 else 10
        
        solution = routing.SolveWithParameters(search_parameters)

        if solution:
            return await self._format_solution(manager, routing, solution, patients, distances, durations, start_seconds, depot_coords, depot_name, default_intervention_duration)
        else:
            return None

    async def _format_solution(self, manager, routing, solution, patients, distances, durations, start_seconds, depot_coords, depot_name, default_intervention_duration=15):
        routes = []
        total_dist = 0
        total_time = 0
        visited_patients = set()
        
        time_dimension = routing.GetDimensionOrDie("Time")

        for vehicle_id in range(routing.vehicles()):
            index = routing.Start(vehicle_id)
            steps = []
            route_dist = 0
            
            # Start
            start_val = solution.Min(time_dimension.CumulVar(index))
            steps.append({
                "type": "depot_start",
                "nom": depot_name,
                "lat": depot_coords[1],
                "lon": depot_coords[0],
                "arrivee": self._sec_to_str(start_val),
                "depart": self._sec_to_str(start_val)
            })
            
            while not routing.IsEnd(index):
                node_index = manager.IndexToNode(index)
                next_index = solution.Value(routing.NextVar(index))
                next_node = manager.IndexToNode(next_index)

                # Calc distance
                dist = distances[node_index][next_node]
                route_dist += dist

                if next_node != 0:
                   p_idx = next_node - 1
                   p = patients[p_idx]
                   visited_patients.add(p.id)
                   
                   # Arrival time at patient
                   arrive_val = solution.Min(time_dimension.CumulVar(next_index))
                   # Depart time = arrive + intervention duration
                   depart_val = arrive_val + default_intervention_duration*60
                   
                   steps.append({
                       "type": "patient",
                       "patient_id": p.id,
                       "nom": f"{p.nom} {p.prenom}",
                       "adresse": p.adresse,
                       "lat": float(p.latitude),
                       "lon": float(p.longitude),
                       "arrivee": self._sec_to_str(arrive_val),
                       "depart": self._sec_to_str(depart_val),
                       "a_jeun": p.test_a_jeun,
                       "retour_rapide_labo": p.retour_rapide_labo,
                       "matrix_index": next_node
                   })
                
                index = next_index
            
            # End (Depot Return)
            end_val = solution.Min(time_dimension.CumulVar(index))
            steps.append({
                "type": "depot_end",
                "nom": depot_name,
                "lat": depot_coords[1],
                "lon": depot_coords[0],
                "arrivee": self._sec_to_str(end_val),
            })
            
            duration_min = (end_val - start_val) / 60
            
            if len(steps) > 2: # Only if visited patients (Start -> End is 2 steps)
                # Use solver metrics directly
                r_duration = duration_min 
                r_distance = route_dist

                # Get Geometry properly
                route_coords = []
                # Use dynamic depot coords
                depot_point = [depot_coords[0], depot_coords[1]] 
                route_coords.append(depot_point)
                
                for s in steps:
                    if s['type'] == 'patient':
                        route_coords.append([s['lon'], s['lat']])
                
                route_coords.append(depot_point)
                
                # Fetch geometry
                geometry = await route_service.get_route(route_coords)
                
                # Generate Google Maps Link
                gmaps_link = self._generate_gmaps_link(steps, depot_name)

                route = {
                    "vehicle_id": vehicle_id + 1,
                    "steps": steps,
                    "total_duration": r_duration,
                    "total_distance": r_distance,
                    "coords": geometry, 
                    "gmaps_link": gmaps_link
                }
                routes.append(route)
                total_dist += r_distance
                total_time += r_duration
        
        # Identify Unassigned
        unassigned = []
        for p in patients:
            if p.id not in visited_patients:
                unassigned.append({
                    "id": p.id,
                    "nom": f"{p.nom} {p.prenom}",
                    "reason": "Contraintes horaires/ressources trop strictes"
                })

        return {
            "nb_infirmiers_utilises": len(routes),
            "duree_totale_min": total_time,
            "distance_totale_m": total_dist,
            "routes": routes,
            "unassigned": unassigned
        }

    def _sec_to_str(self, seconds):
        h = int(seconds / 3600)
        m = int((seconds % 3600) / 60)
        return f"{h:02}:{m:02}"



    def _generate_gmaps_link(self, steps, depot_name):
        base_url = "https://www.google.com/maps/dir"
        depot_addr = depot_name
        
        parts = [quote_plus(depot_addr)]
        
        for step in steps:
            if step['type'] == 'patient':
                addr = step.get('adresse', '')
                if addr:
                    parts.append(quote_plus(addr))
        
        parts.append(quote_plus(depot_addr))
        
        path = "/".join(parts)
        
        return f"{base_url}/{path}"

optimisation_service = OptimisationService()
