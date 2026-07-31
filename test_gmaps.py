import os
import googlemaps

# Load env variables manually for test snippet
with open('.env') as f:
    for line in f:
        line = line.strip()
        if line and not line.startswith('#'):
            key, value = line.split('=', 1)
            os.environ[key] = value

api_key = os.environ.get('GOOGLE_MAPS_API_KEY')
print(f"Testing API key starting with: {api_key[:10]}...")

try:
    gmaps = googlemaps.Client(key=api_key)
    result = gmaps.geocode('Genève, Switzerland')
    if result:
        print("Success! The Google Maps API is working and correctly configured.")
        print(f"Geocoded 'Genève' to: {result[0]['geometry']['location']}")
    else:
        print("API call returned empty result.")
except Exception as e:
    print(f"Error testing Google Maps API: {e}")
