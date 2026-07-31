import os
import asyncio
import sys

# Load env manually
with open('.env') as f:
    for line in f:
        line = line.strip()
        if line and not line.startswith('#'):
            key, value = line.split('=', 1)
            os.environ[key] = value

os.environ.setdefault("DATABASE_URL", "sqlite:///./test_tours.db")
os.environ.setdefault("REDIS_URL", "redis://localhost:6379")

# Add path
sys.path.append(os.getcwd())

from backend.app.services.geocoding_service import geocoding_service

async def main():
    print("Testing Geocoding Service...")
    address = "Av. de la Roseraie 72, 1205 Genève"
    try:
        coords = await geocoding_service.geocode(address)
        print(f"Address: {address}")
        print(f"Result: {coords}")
        
        if coords:
            print("Geocoding Success!")
        else:
            print("Geocoding Failed (Returned None)")
            
    except Exception as e:
        print(f"Geocoding Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(main())
