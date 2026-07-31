import googlemaps
from ..config import settings
from ..utils.cache import get_geocode, set_geocode
import asyncio
from functools import partial

# Helper to run blocking IO in thread pool
async def run_in_executor(func, *args, **kwargs):
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, partial(func, *args, **kwargs))

class GeocodingService:
    def __init__(self):
        self.gmaps = None
        if settings.GOOGLE_MAPS_API_KEY and settings.GOOGLE_MAPS_API_KEY != "votre_cle_google_maps_ici":
             self.gmaps = googlemaps.Client(key=settings.GOOGLE_MAPS_API_KEY)

    async def geocode(self, address: str):
        # 1. Check Cache
        cached = await run_in_executor(get_geocode, address)
        if cached:
            return cached
        
        # 2. Call API if configured
        if not self.gmaps:
            print("Warning: GOOGLE_MAPS_API_KEY not configured. Returning None for geocode.")
            return None
            
        try:
            # First attempt with strict country components
            result = await run_in_executor(
                self.gmaps.geocode, 
                address, 
                region='ch',
                components={"country": ["CH", "FR"]}
            )
            
            # If no result or it's a very vague approximation, try appending 'Suisse'
            if not result or result[0]['geometry']['location_type'] == 'APPROXIMATE':
                # Only append if 'suisse' or 'france' is not already in the address
                lower_addr = address.lower()
                if 'suisse' not in lower_addr and 'switzerland' not in lower_addr and 'france' not in lower_addr:
                    enhanced_address = f"{address}, Suisse"
                    second_result = await run_in_executor(
                        self.gmaps.geocode, 
                        enhanced_address, 
                        region='ch',
                        components={"country": ["CH", "FR"]}
                    )
                    # Use the second result if it's better or if we had no result initially
                    if second_result and (not result or second_result[0]['geometry']['location_type'] != 'APPROXIMATE'):
                        result = second_result
            
            if result and len(result) > 0:
                # Prefer ROOFTOP or RANGE_INTERPOLATED, but will fallback to whatever is best
                best_match = result[0]
                
                # Check all results to see if there is a highly precise one
                for r in result:
                    if r['geometry']['location_type'] in ['ROOFTOP', 'RANGE_INTERPOLATED']:
                        best_match = r
                        break
                        
                location = best_match['geometry']['location']
                lat, lon = location['lat'], location['lng']
                
                # 3. Save to Cache
                await run_in_executor(set_geocode, address, lat, lon)
                return (lat, lon)
            
        except Exception as e:
            print(f"Google Maps Geocoding API Error: {e}")
            return None
            
        return None

    async def search_candidates(self, address: str) -> list:
        """
        Returns a list of candidates using Google Places Autocomplete:
        [{ "address": "...", "lat": ..., "lon": ..., "confidence": 0.0-1.0, "match_type": "exact/approx" }]
        """
        if not self.gmaps:
            return []

        try:
            # First, try Places Autocomplete for fast text suggestions
            # Focus on Geneva coordinates for better relevance (lat, lng)
            places_result = []
            try:
                places_result = await run_in_executor(
                    self.gmaps.places_autocomplete, 
                    input_text=address, 
                    location=(46.2044, 6.1432), 
                    radius=50000, # 50km radius around Geneva
                    components={"country": ["ch", "fr"]}, # Switzerland and bordering France
                    strict_bounds=False # Don't be too strict, let components restrict it
                )
            except Exception as pe:
                print(f"Places API Autocomplete failed (often billing/enable issue): {pe}")
                pass # Continue to standard geocoding
            
            candidates = []
            if places_result:
                for place in places_result[:5]: # Take top 5
                    # The Autocomplete API only returns text descriptions.
                    # Fetching full geometry via Place ID is necessary to get exact coordinates.
                    place_id = place['place_id']
                    
                    # Fetch geometry for this place
                    try:
                        details = await run_in_executor(
                             self.gmaps.place,
                             place_id=place_id,
                             fields=['geometry', 'formatted_address']
                        )
                        
                        if details.get('status') == 'OK':
                             res = details['result']
                             loc = res['geometry']['location']
                             
                             candidates.append({
                                 "address": res.get('formatted_address', place['description']),
                                 "lat": loc['lat'],
                                 "lon": loc['lng'],
                                 "confidence": 0.9, # Places autocomplete items are usually highly confident
                                 "match_type": "exact"
                             })
                    except Exception as err:
                        print(f"Failed to fetch place details for {place_id}: {err}")
                    
            # Fallback to standard geocoding if autocomplete returns empty
            if not candidates:
                 geo_result = await run_in_executor(
                     self.gmaps.geocode,
                     address,
                     region='ch',
                     components={"country": ["CH", "FR"]}
                 )
                 
                 # If approximate or empty, try appending Suisse
                 if not geo_result or geo_result[0]['geometry']['location_type'] == 'APPROXIMATE':
                     lower_addr = address.lower()
                     if 'suisse' not in lower_addr and 'switzerland' not in lower_addr and 'france' not in lower_addr:
                         second_geo = await run_in_executor(
                             self.gmaps.geocode,
                             address + ", Suisse",
                             region='ch',
                             components={"country": ["CH", "FR"]}
                         )
                         if second_geo and (not geo_result or second_geo[0]['geometry']['location_type'] != 'APPROXIMATE'):
                             geo_result = second_geo

                 for res in geo_result[:3]:
                     loc = res['geometry']['location']
                     # Infer confidence from location_type
                     conf = 0.9 if res['geometry']['location_type'] in ['ROOFTOP', 'RANGE_INTERPOLATED'] else 0.5
                     candidates.append({
                         "address": res['formatted_address'],
                         "lat": loc['lat'],
                         "lon": loc['lng'],
                         "confidence": conf,
                         "match_type": "exact" if conf > 0.8 else "approx"
                     })
                     
            return candidates

        except Exception as e:
            print(f"Google Maps Candidate Search Error: {e}")
            return []

geocoding_service = GeocodingService()
