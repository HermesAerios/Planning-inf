import openrouteservice
from ..config import settings
from ..utils.cache import get_route, set_route
import asyncio
from functools import partial
import hashlib
import json

# Helper to run blocking IO in thread pool
async def run_in_executor(func, *args, **kwargs):
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, partial(func, *args, **kwargs))

class RouteService:
    def __init__(self):
        self.client = None
        if settings.ORS_API_KEY and settings.ORS_API_KEY != "your_ors_key_here":
             self.client = openrouteservice.Client(key=settings.ORS_API_KEY)

    def _generate_key(self, locations: list) -> str:
        s = json.dumps(locations, sort_keys=True)
        return hashlib.md5(s.encode('utf-8')).hexdigest()

    async def get_route(self, locations: list):
        """
        Get route geometry (encoded polyline) for a list of locations [[lon, lat], ...].
        """
        key = self._generate_key(locations)
        
        # 1. Check Cache
        cached = await run_in_executor(get_route, key)
        if cached:
            return cached
        
        if not self.client:
             return None

        try:
            # ORS Directions call
            result = await run_in_executor(
                self.client.directions,
                coordinates=locations,
                profile='driving-car',
                format='geojson',
                # metrics=['distance', 'duration']
            )
            
            if result and 'features' in result and len(result['features']) > 0:
                # GeoJSON LineString
                geometry = result['features'][0]['geometry']
                # distance = result['features'][0]['properties']['summary']['distance']
                # duration = result['features'][0]['properties']['summary']['duration']
                
                # Save to Cache
                await run_in_executor(set_route, key, geometry)
                return geometry

        except Exception as e:
            print(f"Route API Error: {e}")
            return None
            
        return None

route_service = RouteService()
