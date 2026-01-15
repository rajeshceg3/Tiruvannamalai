import { MapContainer, TileLayer, Marker, Polyline, Popup, Circle } from "react-leaflet";
import { divIcon } from "leaflet";
import "leaflet/dist/leaflet.css";
import { MovementLog, SitRep } from "@shared/schema";
import { useEffect, useState } from "react";

interface AARMapProps {
  logs: MovementLog[];
  sitreps: SitRep[];
  currentTime: number;
}

export function AARMap({ logs, sitreps, currentTime }: AARMapProps) {
  // Center map on the first log or a default
  const defaultCenter = { lat: 12.2353, lng: 79.0847 }; // Indra Lingam
  const [mapCenter, setMapCenter] = useState(defaultCenter);

  // Filter logs up to current time for trails
  // This might be expensive for huge datasets, but for MVP it's okay.
  // Optimization: Pre-group logs by user.

  const userIds = Array.from(new Set(logs.map(l => l.userId)));

  const userTrails = userIds.map(uid => {
      const userLogs = logs
          .filter(l => l.userId === uid)
          .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

      const visibleLogs = userLogs.filter(l => new Date(l.timestamp).getTime() <= currentTime);

      // The current position is the last visible log
      const currentPos = visibleLogs.length > 0 ? visibleLogs[visibleLogs.length - 1] : null;

      // The trail is all visible logs
      const trail = visibleLogs.map(l => [l.latitude, l.longitude] as [number, number]);

      return { userId: uid, currentPos, trail };
  });

  // Recent SitReps (last 1 minute relative to playback)
  const activeSitreps = sitreps.filter(s => {
      const t = new Date(s.createdAt).getTime();
      return t <= currentTime && t > currentTime - 60000;
  });

  // Create custom marker icons
  const createMarkerIcon = (color: string) => divIcon({
    className: 'custom-icon',
    html: `<div style="
      background-color: ${color};
      width: 12px;
      height: 12px;
      border-radius: 50%;
      border: 2px solid white;
      box-shadow: 0 0 10px ${color};
    "></div>`
  });

  return (
    <MapContainer
      center={[mapCenter.lat, mapCenter.lng]}
      zoom={14}
      style={{ height: "100%", width: "100%", borderRadius: "0.5rem" }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {/* Render Trails */}
      {userTrails.map((u, idx) => (
         <Polyline
            key={`trail-${u.userId}`}
            positions={u.trail}
            pathOptions={{ color: `hsl(${idx * 137.5 % 360}, 70%, 50%)`, weight: 3, opacity: 0.6 }}
         />
      ))}

      {/* Render Current Positions */}
      {userTrails.map((u, idx) => (
          u.currentPos && (
            <Marker
                key={`marker-${u.userId}`}
                position={[u.currentPos.latitude, u.currentPos.longitude]}
                icon={createMarkerIcon(`hsl(${idx * 137.5 % 360}, 70%, 50%)`)}
            >
                <Popup>
                    User ID: {u.userId}<br/>
                    Status: {u.currentPos.status || "Unknown"}
                </Popup>
            </Marker>
          )
      ))}

      {/* Render SitReps as temporary circles/pulses */}
      {activeSitreps.map(s => {
          // Find location of user at that time
          const userLog = logs
            .filter(l => l.userId === s.userId && new Date(l.timestamp).getTime() <= new Date(s.createdAt).getTime())
            .pop();

          if (!userLog) return null;

          return (
              <Circle
                key={`sitrep-${s.id}`}
                center={[userLog.latitude, userLog.longitude]}
                radius={30}
                pathOptions={{ color: s.type === 'alert' ? 'red' : 'blue', fillColor: s.type === 'alert' ? 'red' : 'blue', fillOpacity: 0.2 }}
              >
                  <Popup offset={[0, -10]}>
                      <strong>{s.type.toUpperCase()}</strong>: {s.message}
                  </Popup>
              </Circle>
          );
      })}

    </MapContainer>
  );
}
