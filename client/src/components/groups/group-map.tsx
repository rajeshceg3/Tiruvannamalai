import { MapContainer, TileLayer, Marker, Popup, useMap, Circle, useMapEvents } from "react-leaflet";
import { Icon } from "leaflet";
import { useEffect } from "react";

// Fix for default Leaflet icons in React
import iconUrl from "leaflet/dist/images/marker-icon.png";
import iconRetinaUrl from "leaflet/dist/images/marker-icon-2x.png";
import shadowUrl from "leaflet/dist/images/marker-shadow.png";

// Custom Icons could go here, for now using default with fix
const DefaultIcon = new Icon({
  iconUrl,
  iconRetinaUrl,
  shadowUrl,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const SOSIcon = new Icon({
    iconUrl: "/assets/markers/marker-icon-red.png",
    shadowUrl: "/assets/markers/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

type MemberLocation = {
  lat: number;
  lng: number;
};

type GroupMember = {
  userId: number;
  username: string;
  location?: MemberLocation;
  status?: string; // 'SOS', 'OK', etc.
  isSelf: boolean;
};

export type MapWaypoint = {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  radius: number;
  type: string;
};

interface GroupMapProps {
  members: GroupMember[];
  waypoints?: MapWaypoint[];
  center?: [number, number]; // Optional center override
  onMapClick?: (lat: number, lng: number) => void;
}

// Component to handle map clicks
function MapEvents({ onClick }: { onClick?: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      if (onClick) onClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

// Component to auto-center map when members move or initial load
function MapUpdater({ center, members, waypoints }: { center?: [number, number], members: GroupMember[], waypoints?: MapWaypoint[] }) {
    const map = useMap();

    useEffect(() => {
        if (center) {
            map.setView(center, map.getZoom());
        } else if (members.length > 0) {
            // Find bounds of all members and waypoints
            const points: [number, number][] = [];

            members.forEach(m => {
                if (m.location) points.push([m.location.lat, m.location.lng]);
            });

            if (waypoints) {
                waypoints.forEach(w => points.push([w.latitude, w.longitude]));
            }

            if (points.length > 0) {
                 map.fitBounds(points, { padding: [50, 50], maxZoom: 16 });
            }
        }
    }, [center, members, map, waypoints]);

    return null;
}

export function GroupMap({ members, waypoints, center, onMapClick }: GroupMapProps) {
  // Default to Arunachala coordinates if no center provided
  const defaultCenter: [number, number] = [12.2319, 79.0663];

  return (
    <div className="h-full w-full rounded-lg overflow-hidden border shadow-inner z-0 relative">
      <MapContainer
        center={center || defaultCenter}
        zoom={13}
        className="h-full w-full"
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapUpdater center={center} members={members} waypoints={waypoints} />
        <MapEvents onClick={onMapClick} />

        {waypoints?.map(w => (
            <Circle
                key={`wp-${w.id}`}
                center={[w.latitude, w.longitude]}
                radius={w.radius}
                pathOptions={{
                    color: w.type === 'HAZARD' ? '#ef4444' : w.type === 'OBJECTIVE' ? '#22c55e' : '#3b82f6',
                    fillColor: w.type === 'HAZARD' ? '#ef4444' : w.type === 'OBJECTIVE' ? '#22c55e' : '#3b82f6',
                    fillOpacity: 0.2
                }}
            >
                <Popup>
                     <div className="text-center">
                        <strong className="block text-sm">{w.name}</strong>
                        <span className="text-xs uppercase text-muted-foreground">{w.type}</span>
                    </div>
                </Popup>
            </Circle>
        ))}

        {members.map((member) => {
            if (!member.location) return null;

            return (
                <Marker
                    key={member.userId}
                    position={[member.location.lat, member.location.lng]}
                    icon={member.status === 'SOS' ? SOSIcon : DefaultIcon}
                >
                    <Popup>
                        <div className="text-center">
                            <strong className="block text-sm">{member.username}</strong>
                            <span className={`text-xs font-bold ${member.status === 'SOS' ? 'text-red-600' : 'text-green-600'}`}>
                                {member.status || 'Active'}
                            </span>
                            {member.isSelf && <div className="text-xs text-muted-foreground mt-1">(You)</div>}
                        </div>
                    </Popup>
                </Marker>
            );
        })}
      </MapContainer>
    </div>
  );
}
