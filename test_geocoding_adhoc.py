import asyncio
import os
from dotenv import load_dotenv
import openrouteservice

# Load env for API Key
load_dotenv()
ORS_API_KEY = os.getenv("ORS_API_KEY")

async def test_geocoding():
    if not ORS_API_KEY:
        print("Error: ORS_API_KEY not found in .env")
        return

    client = openrouteservice.Client(key=ORS_API_KEY)
    
    addresses_to_test = [
        "rue des eaux-vives 110",
        "rue des eaux-vives 110, Genève",
        "110 rue des eaux-vives",
        "110 rue des eaux-vives, 1207"
    ]

    print(f"Testing with Key: {ORS_API_KEY[:5]}...")

    for addr in addresses_to_test:
        print(f"\n--- Testing: '{addr}' ---")
        try:
            # Mimic the service call
            # result = client.pelias_search(text=addr, country='CH', size=1) 
            # The service uses run_in_executor, but client.pelias_search is sync (blocking).
            result = client.pelias_search(text=addr, country='CH', size=1)
            
            if result and result['features']:
                feat = result['features'][0]
                props = feat['properties']
                print(f"[FOUND] {props.get('label')} (Confidence: {props.get('confidence')})")
            else:
                print("[NOT FOUND]")
                
        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(test_geocoding())
