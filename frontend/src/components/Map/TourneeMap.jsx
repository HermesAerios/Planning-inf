import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect } from 'react';

// Fix Leaflet Default Icon
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

// Custom Icons
const createNumberIcon = (number, color) => {
    return L.divIcon({
        className: 'custom-icon',
        html: `<div style="background-color: ${color}; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; border: 2px solid white;">${number}</div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12]
    });
};

const depotIcon = L.divIcon({
    html: '<div style="font-size: 24px;">🏥</div>',
    className: 'dummy',
    iconSize: [30, 30],
    iconAnchor: [15, 15]
});

export default function TourneeMap({ tournees, depot }) {
    const colors = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
    const center = depot ? [depot.lat, depot.lon] : [46.2044, 6.1432];

    return (
        <MapContainer
            center={center}
            zoom={12}
            style={{ height: '600px', width: '100%', borderRadius: '0.5rem', zIndex: 0 }}
        >
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap contributors' />

            {/* Marker dépôt */}
            {depot && (
                <Marker position={[depot.lat, depot.lon]} icon={depotIcon}>
                    <Popup>🏥 Laboratoire</Popup>
                </Marker>
            )}

            {/* Markers patients + polylines par tournée */}
            {tournees.map((tournee, idx) => {
                const color = colors[idx % colors.length];
                // Extract coords for Polyline
                let positions = [];
                if (tournee.coords && tournee.coords.coordinates) {
                    // GeoJSON is [lon, lat], Leaflet wants [lat, lon]
                    positions = tournee.coords.coordinates.map(c => [c[1], c[0]]);
                } else {
                    // Fallback to straight lines
                    const stepsWithCoords = tournee.steps.filter(s => s.type === 'patient' || s.type.includes('depot'));
                    positions = stepsWithCoords.map(s => {
                        if (s.type.includes('depot')) return [depot.lat, depot.lon];
                        return [s.lat, s.lon];
                    });
                }

                return (
                    <div key={idx}>
                        {tournee.steps.filter(s => s.type === 'patient').map((p, i) => (
                            <Marker
                                key={i}
                                position={[p.lat, p.lon]}
                                icon={createNumberIcon(i + 1, color)}
                            >
                                <Popup>
                                    <strong>{i + 1}. {p.nom}</strong><br />
                                    {p.adresse}<br />
                                    {p.arrivee} - {p.depart}
                                </Popup>
                            </Marker>
                        ))}

                        <Polyline
                            positions={positions}
                            color={color}
                            weight={3}
                            opacity={0.8}
                        />
                    </div>
                );
            })}
        </MapContainer>
    );
}
