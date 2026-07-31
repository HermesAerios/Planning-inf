import openrouteservice
from ..config import settings
from ..utils.cache import get_matrix, set_matrix
import asyncio
from functools import partial
import hashlib
import json

# Helper to run blocking IO in thread pool
async def run_in_executor(func, *args, **kwargs):
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, partial(func, *args, **kwargs))

class MatrixService:
    def __init__(self):
        self.client = None
        if settings.ORS_API_KEY and settings.ORS_API_KEY != "your_ors_key_here":
             self.client = openrouteservice.Client(key=settings.ORS_API_KEY)

    def _generate_key(self, locations: list) -> str:
        # Create a stable key based on locations
        # Locations is list of [lon, lat]
        s = json.dumps(locations, sort_keys=True)
        return hashlib.md5(s.encode('utf-8')).hexdigest()

    async def get_matrix(self, locations: list):
        """
        Get distance and duration matrix for a list of locations [[lon, lat], ...].
        Returns:
            {
                "durations": [[s, s], ...],
                "distances": [[m, m], ...]
            }
        """
        key = self._generate_key(locations)
        
        # 1. Check Cache
        cached = await run_in_executor(get_matrix, key)
        if cached:
            return {"distances": cached[0], "durations": cached[1]}
        
        # 2. Call API with Retry
        retries = 3
        for attempt in range(retries):
            try:
                if not self.client:
                     print("Warning: ORS_API_KEY not configured. Returning mock matrix.")
                     return self._get_mock_matrix(locations)

                result = await run_in_executor(
                    self.client.distance_matrix,
                    locations=locations,
                    profile='driving-car',
                    metrics=['distance', 'duration']
                )
                
                if result:
                    distances = result['distances']
                    durations = result['durations']
                    
                    # 3. Save to Cache
                    await run_in_executor(set_matrix, key, distances, durations)
                    return {"distances": distances, "durations": durations}

            except Exception as e:
                print(f"Matrix API Error (Attempt {attempt+1}/{retries}): {e}")
                if attempt == retries - 1:
                    print("All retries failed. Using Haversine Fallback.")
                    return self._calculate_haversine_matrix(locations)
                await asyncio.sleep(1) # Wait 1s before retry
        
        return None

    def _get_mock_matrix(self, locations):
         # If no key is present, fallback to Haversine calculation logic
         # instead of returning fixed 600s which causes "weirdly similar" times.
         return self._calculate_haversine_matrix(locations)

    def _calculate_haversine_matrix(self, locations):
        """
        Fallback: Calculate geometric distance and estimate time (50km/h).
        locations: [[lon, lat], ...]
        """
        import math
        
        def haversine(lon1, lat1, lon2, lat2):
            R = 6371000 # Radius of Earth in meters
            phi1 = math.radians(lat1)
            phi2 = math.radians(lat2)
            dphi = math.radians(lat2 - lat1)
            dlambda = math.radians(lon2 - lon1)
            
            a = math.sin(dphi/2)**2 + math.cos(phi1)*math.cos(phi2) * (math.sin(dlambda/2)**2)
            c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
            return R * c
            
        n = len(locations)
        distances = [[0] * n for _ in range(n)]
        durations = [[0] * n for _ in range(n)]
        
        AVERAGE_SPEED_MPS = 30 * 1000 / 3600 # 30 km/h in m/s (City traffic)
        
        for i in range(n):
            for j in range(n):
                if i == j: continue
                lon1, lat1 = locations[i]
                lon2, lat2 = locations[j]
                
                dist = haversine(lon1, lat1, lon2, lat2)
                # Apply explicit detour factor (road network is longer than straight line)
                DETOUR_FACTOR = 1.4 
                real_dist = dist * DETOUR_FACTOR
                
                distances[i][j] = round(real_dist)
                durations[i][j] = round(real_dist / AVERAGE_SPEED_MPS)
                
        return {"distances": distances, "durations": durations}

matrix_service = MatrixService()
