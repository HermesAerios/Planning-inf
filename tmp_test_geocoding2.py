import asyncio
import os
import googlemaps
from dotenv import load_dotenv

load_dotenv(dotenv_path='c:/Users/jassi/Desktop/Antigravity/.env')
api_key = os.getenv('GOOGLE_MAPS_API_KEY')

async def test_validate():
    gmaps = googlemaps.Client(key=api_key)
    address = "Rue Louis-de-Montfalcon 11, 1227 Carouge, Suisse"
    
    geo_result = gmaps.geocode(
         address,
         region='ch',
         components={"country": ["CH", "FR"]}
    )
    
    candidates = []
    
    for res in geo_result[:3]:
         loc = res['geometry']['location']
         conf = 0.9 if res['geometry']['location_type'] in ['ROOFTOP', 'RANGE_INTERPOLATED'] else 0.5
         candidates.append({
             "address": res['formatted_address'],
             "lat": loc['lat'],
             "lon": loc['lng'],
             "confidence": conf,
             "match_type": "exact" if conf > 0.8 else "approx"
         })
         
    # Simulated validation logic
    if not candidates:
        print("invalid")
        return
        
    candidates.sort(key=lambda x: x['confidence'], reverse=True)
    top = candidates[0]
    HIGH_CONFIDENCE = 0.8
    
    print("Top candidate:", top)
    if len(candidates) == 1 and top['confidence'] >= HIGH_CONFIDENCE:
        status = "valid"
    elif len(candidates) > 0 and top['confidence'] >= HIGH_CONFIDENCE:
        if len(candidates) > 1 and (top['confidence'] - candidates[1]['confidence'] > 0.2):
             status = "valid"
        else:
             status = "ambiguous"
    else:
        status = "ambiguous"
        
    print(status)
    print(candidates)

if __name__ == "__main__":
    asyncio.run(test_validate())
