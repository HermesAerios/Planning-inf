import asyncio
import os
import googlemaps
from dotenv import load_dotenv

load_dotenv(dotenv_path='c:/Users/jassi/Desktop/Antigravity/.env')
api_key = os.getenv('GOOGLE_MAPS_API_KEY')

async def test_geocode():
    if not api_key:
        print("No API Key")
        return
        
    gmaps = googlemaps.Client(key=api_key)
    
    # Test a tricky address
    addresses = [
        "Rue Louis-de-Montfalcon 11, 1227 Carouge, Suisse"
    ]
    
    for addr in addresses:
        print(f"\n===== Testing: {addr} =====")
        
        print("\n1. Places Autocomplete")
        try:
           places_result = gmaps.places_autocomplete(
                input_text=addr, 
                location=(46.2044, 6.1432), 
                radius=50000,
                components={"country": ["ch", "fr"]},
                strict_bounds=False
           )
           for r in places_result:
               print("  [PLACE]", r['description'], "ID:", r['place_id'])
        except Exception as e:
           print(f"Places auto-complete error: {e}")

        print("\n2. Without strict bounds (removed param entirely)")
        try:
           places_result_2 = gmaps.places_autocomplete(
                input_text=addr, 
                location=(46.2044, 6.1432), 
                radius=50000,
                components={"country": ["ch", "fr"]}
           )
           for r in places_result_2:
               print("  [PLACE]", r['description'], "ID:", r['place_id'])
        except Exception as e:
           print(f"Places auto-complete error: {e}")

        print("\n3. Geocode")
        res1 = gmaps.geocode(addr, region='ch', components={"country": ["CH", "FR"]})
        for r in res1:
            print("  [GEOCODE]", r['formatted_address'], "Type:", r['geometry']['location_type'])
            
if __name__ == "__main__":
    asyncio.run(test_geocode())
