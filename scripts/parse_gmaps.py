import re
import sys
import json

def parse_gmaps_links(filepath):
    routes = []
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    links = ["http" + part for part in content.split("http") if part.strip()]
    
    for link in links:
        if not link.strip(): continue
        
        # Matches !1d<lon>!2d<lat>
        matches = re.findall(r'!1d([0-9\.]+)!2d([0-9\.]+)', link)
        if matches:
            # Output coordinates as [lat, lon]
            coords = [(float(lat), float(lon)) for lon, lat in matches]
            routes.append(coords)
            
    return routes

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python parse_gmaps.py <links_file.txt>")
        sys.exit(1)
        
    routes = parse_gmaps_links(sys.argv[1])
    
    out_file = sys.argv[1].replace('.txt', '.json')
    with open(out_file, 'w') as f:
        json.dump(routes, f, indent=2)
        
    print(f"Extracted {len(routes)} routes.")
    for i, route in enumerate(routes):
        print(f"Route {i+1}: {len(route)} points")
