import asyncio
import sys
import os

# Add backend directory to sys.path
sys.path.append('/app')

from app.services.geocoding_service import geocoding_service

async def main():
    address = "6 rue de la Colline, 1205 Genève" # 1205 is more likely correct zip for this street
    print(f"Geocoding: {address}")
    coords = await geocoding_service.geocode(address)
    print(f"Coords (Lat, Lon): {coords}")
    
    address2 = "6 rue de la Colline, 1204 Genève"
    print(f"Geocoding: {address2}")
    coords2 = await geocoding_service.geocode(address2)
    print(f"Coords (Lat, Lon): {coords2}")

if __name__ == "__main__":
    asyncio.run(main())
